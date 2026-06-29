# Unity 性能优化指南（供 LLM 编码工具使用）

在审查 Unity 项目的性能问题时使用本指南。它帮助识别常见的性能瓶颈，并为 Claude 在分析代码结构与项目组织时给出可应用的优化建议。

目录：
- [Unity 版本相关说明](#unity-版本相关说明)
- [代码审查优先级清单](#代码审查优先级清单)
- [Update 循环优化](#update-循环优化)
    - [避免每帧分配](#避免每帧分配)
    - [缓存开销大的操作](#缓存开销大的操作)
    - [节流 Update 逻辑](#节流-update-逻辑)
- [内存管理](#内存管理)
    - [字符串操作](#字符串操作)
    - [集合与分配](#集合与分配)
    - [装箱与拆箱](#装箱与拆箱)
- [对象池](#对象池)
- [物理优化](#物理优化)
- [渲染注意事项](#渲染注意事项)
- [GetComponent 与 Find 操作](#getcomponent-与-find-操作)
- [LINQ 与委托](#linq-与委托)
- [Async 与协程模式](#async-与协程模式)
- [数据结构选择](#数据结构选择)
- [Unity API 最佳实践](#unity-api-最佳实践)
- [Profiler 标记](#profiler-标记)
- [常见反模式](#常见反模式)

---

# Unity 版本相关说明

- ℹ️ Unity 6 引入了 `Awaitable`，在简单延时与序列场景下比协程性能更好。
- ℹ️ 优先使用 Unity 6 自带的 `UnityEngine.Pool.ObjectPool<T>`，而不是自己实现对象池。
- ℹ️ 与 Jobs 系统配合时，Burst 编译器可显著提升数学密集型代码的性能。
- ℹ️ IL2CPP 构建与 Mono 的性能特性不同 —— 请在目标平台上进行 Profiler 采样。

---

# 代码审查优先级清单

在审查 Unity 代码的性能时，按影响力从大到小依次检查以下方面：

1. **Update 循环** —— 分配、开销大的操作、不必要的工作
2. **物理** —— OverlapSphere、Raycast 频率、碰撞矩阵
3. **内存** —— 字符串拼接、热路径中的 LINQ、装箱
4. **GetComponent/Find** —— 未缓存的查询、每帧调用
5. **渲染** —— 材质实例、Shader 关键字、Draw Call

---

# Update 循环优化

## 避免每帧分配

- ❌ **绝不要在 Update()、FixedUpdate() 或 LateUpdate() 中分配内存** —— 这会触发 GC 峰值。
- ❌ 避免在 update 循环中对引用类型使用 `new`。
- ❌ 避免在 update 循环中进行字符串拼接或插值。
- ❌ 避免在 update 循环中使用 LINQ 查询。
- ✅ 预分配集合并通过 `.Clear()` 复用。
- ✅ 对频繁实例化的对象使用对象池。

```csharp
// ❌ 差 —— 每帧都分配
private void Update()
{
    var enemies = FindObjectsOfType<Enemy>();           // 分配数组
    var nearbyEnemies = new List<Enemy>();              // 分配列表
    string status = $"Enemies: {enemies.Length}";      // 分配字符串
    
    foreach (var enemy in enemies.Where(e => e.IsAlive)) // LINQ 产生分配
    {
        nearbyEnemies.Add(enemy);
    }
}

// ✅ 好 —— update 中零分配
private Enemy[] m_enemyCache = new Enemy[100];
private readonly List<Enemy> m_nearbyEnemies = new(50);
private readonly StringBuilder m_statusBuilder = new(64);

private void Update()
{
    int count = FindObjectsOfType(m_enemyCache);       // 复用数组
    
    m_nearbyEnemies.Clear();                            // 复用列表
    for (int i = 0; i < count; i++)
    {
        if (m_enemyCache[i].IsAlive)
        {
            m_nearbyEnemies.Add(m_enemyCache[i]);
        }
    }
    
    m_statusBuilder.Clear();                            // 复用 StringBuilder
    m_statusBuilder.Append("Enemies: ").Append(count);
}
```

## 缓存开销大的操作

- ✅ 在 Update 之外缓存开销较大的计算结果。
- ✅ 使用脏标记，只在状态变化时重新计算。
- ✅ 在 Awake() 中缓存 Transform、Rigidbody 等组件引用。
- ❌ 避免每帧访问 `transform`、`gameObject` 或调用 GetComponent。

```csharp
// ❌ 差 —— 反复属性访问与计算
private void Update()
{
    Vector3 pos = transform.position;                   // 属性访问开销
    Vector3 targetDir = (m_target.transform.position - pos).normalized;
    float distance = Vector3.Distance(transform.position, m_target.transform.position);
}

// ✅ 好 —— 引用与计算都缓存
private Transform m_transform;
private Transform m_targetTransform;
private Vector3 m_cachedTargetDirection;
private float m_cachedDistance;
private bool m_isDirty = true;

private void Awake()
{
    m_transform = transform;                            // 只缓存一次
    m_targetTransform = m_target.transform;
}

private void Update()
{
    if (m_isDirty)
    {
        Vector3 offset = m_targetTransform.position - m_transform.position;
        m_cachedDistance = offset.magnitude;
        m_cachedTargetDirection = offset / m_cachedDistance; // 避免重复 sqrt
        m_isDirty = false;
    }
}
```

## 节流 Update 逻辑

- ✅ 把开销大的工作分散到多个帧中执行。
- ✅ 对非关键更新使用基于时间的节流。
- ✅ 周期性检查可考虑使用协程或 Awaitable。
- ⚠️ 节流时注意与帧率相关的行为。

```csharp
// ✅ 好 —— 节流更新
[SerializeField] private float m_updateInterval = 0.1f;
private float m_nextUpdateTime;

private void Update()
{
    if (Time.time < m_nextUpdateTime) return;           // 间隔内跳过
    
    m_nextUpdateTime = Time.time + m_updateInterval;
    PerformExpensiveOperation();
}

// ✅ 好 —— 跨帧错峰处理
private int m_currentIndex;
private const int k_itemsPerFrame = 10;

private void Update()
{
    int endIndex = Mathf.Min(m_currentIndex + k_itemsPerFrame, m_items.Count);
    
    for (int i = m_currentIndex; i < endIndex; i++)
    {
        ProcessItem(m_items[i]);
    }
    
    m_currentIndex = endIndex >= m_items.Count ? 0 : endIndex;
}
```

---

# 内存管理

## 字符串操作

- ❌ 绝不要在循环或频繁执行的代码路径中使用 `+` 拼接字符串。
- ❌ 避免在热路径中使用 `string.Format()` —— 会产生分配。
- ✅ 动态构建字符串请使用 `StringBuilder`。
- ✅ 当值不常变化时，缓存格式化后的字符串。
- ✅ 高级零分配场景可使用 `string.Create()` 或 `Span<char>`。

```csharp
// ❌ 差 —— 多次分配
private void UpdateUI()
{
    m_scoreText.text = "Score: " + m_score;                     // 2 次分配
    m_healthText.text = string.Format("HP: {0}/{1}", m_hp, m_maxHp); // 会分配
}

// ✅ 好 —— 缓存与复用
private readonly StringBuilder m_sb = new(32);
private int m_lastScore = -1;
private string m_cachedScoreText;

private void UpdateUI()
{
    if (m_score != m_lastScore)
    {
        m_sb.Clear();
        m_sb.Append("Score: ").Append(m_score);
        m_cachedScoreText = m_sb.ToString();                    // 仅在变化时分配
        m_lastScore = m_score;
    }
    m_scoreText.text = m_cachedScoreText;
}
```

## 集合与分配

- ✅ 按预期容量初始化集合，避免扩容。
- ✅ 优先复用 `List<T>.Clear()`，而不是 new 一个新 List。
- ✅ 使用 Unity 自带的 `CollectionPool<T>` 或 `ListPool<T>`。
- ❌ 避免在性能关键代码中调用 `ToArray()`、`ToList()`。
- ✅ 临时小数组使用 `Span<T>` 与 `stackalloc`。

```csharp
// ❌ 差 —— 扩容产生分配
private void ProcessEnemies()
{
    var enemies = new List<Enemy>();                    // 没有预分配容量，会扩容
    // ... add many items
}

// ✅ 好 —— 预分配容量
private readonly List<Enemy> m_enemies = new(100);     // 预期最大容量

// ✅ 好 —— 使用 Unity 自带的池化
using UnityEngine.Pool;

private void ProcessWithPool()
{
    var tempList = ListPool<Enemy>.Get();
    try
    {
        // 使用 tempList...
    }
    finally
    {
        ListPool<Enemy>.Release(tempList);
    }
}

// ✅ 好 —— 小型临时数组使用 stackalloc（C# 7.2+）
private void ProcessSmallBatch()
{
    Span<int> indices = stackalloc int[8];             // 不在堆上分配
    // 使用 indices...
}
```

## 装箱与拆箱

- ❌ 避免将值类型传给期望 `object` 的方法。
- ❌ 避免将值类型放入非泛型集合。
- ✅ 使用泛型集合（用 `List<int>` 而非 `ArrayList`）。
- ✅ 使用泛型方法与接口，避免装箱。
- ⚠️ 注意值类型在字符串插值中的隐式装箱。

```csharp
// ❌ 差 —— 发生装箱
object boxed = 42;                                      // 装箱
int unboxed = (int)boxed;                              // 拆箱

ArrayList oldList = new ArrayList();
oldList.Add(42);                                        // 装箱

Debug.Log($"Value: {myStruct}");                       // 若未重写 ToString 可能装箱

// ✅ 好 —— 不装箱
List<int> genericList = new List<int>();
genericList.Add(42);                                    // 不装箱

Debug.Log($"Value: {myInt}");                          // 基本类型高效处理
```

---

# 对象池

- ✅ 对频繁生成的对象（子弹、粒子、UI 元素）使用 `UnityEngine.Pool.ObjectPool<T>`。
- ✅ 实现 `IDisposable` 模式或使用 `actionOnRelease` 重置对象状态。
- ✅ 根据预期用量设置合适的 `defaultCapacity` 和 `maxSize`。
- ❌ 对每秒生成超过几次的对象，不要用 `Instantiate`/`Destroy`。
- ⚠️ 记得将对象归还到池中 —— 池对象泄漏会让对象池失去意义。

```csharp
using UnityEngine;
using UnityEngine.Pool;

public class ProjectilePool : MonoBehaviour
{
    [SerializeField] private Projectile m_prefab;
    [SerializeField] private int m_defaultCapacity = 20;
    [SerializeField] private int m_maxSize = 100;
    
    private ObjectPool<Projectile> m_pool;

    private void Awake()
    {
        m_pool = new ObjectPool<Projectile>(
            createFunc: CreateProjectile,
            actionOnGet: OnGetFromPool,
            actionOnRelease: OnReturnToPool,
            actionOnDestroy: OnDestroyPooled,
            collectionCheck: false,                     // 发布版关闭以提升性能
            defaultCapacity: m_defaultCapacity,
            maxSize: m_maxSize
        );
    }

    private Projectile CreateProjectile()
    {
        var proj = Instantiate(m_prefab);
        proj.SetPool(m_pool);                           // 给弹丸一个池引用
        return proj;
    }

    private void OnGetFromPool(Projectile proj)
    {
        proj.gameObject.SetActive(true);
        proj.ResetState();
    }

    private void OnReturnToPool(Projectile proj)
    {
        proj.gameObject.SetActive(false);
    }

    private void OnDestroyPooled(Projectile proj)
    {
        Destroy(proj.gameObject);
    }

    public Projectile Get() => m_pool.Get();
    public void Return(Projectile proj) => m_pool.Release(proj);
}
```

---

# 物理优化

- ✅ 使用 LayerMask 把物理查询限制在相关 Layer 上。
- ✅ 缓存 `LayerMask` 值 —— 不要每帧调用 `LayerMask.GetMask()`。
- ✅ 使用零分配的物理方法：`Physics.RaycastNonAlloc`、`Physics.OverlapSphereNonAlloc`。
- ✅ 优先使用简单碰撞体（球、胶囊、盒）而非 Mesh Collider。
- ❌ 避免在 Update 中进行物理查询 —— 改用 FixedUpdate 或做节流。
- ✅ 配置 Physics 碰撞矩阵，关闭不必要的层间交互。

```csharp
// ❌ 差 —— 每帧分配物理查询
private void Update()
{
    Collider[] hits = Physics.OverlapSphere(transform.position, m_radius);
    foreach (var hit in hits)
    {
        // 处理...
    }
}

// ✅ 好 —— 缓存数组 + LayerMask，零分配
private readonly Collider[] m_hitBuffer = new Collider[32];
private LayerMask m_enemyLayer;

private void Awake()
{
    m_enemyLayer = LayerMask.GetMask("Enemy");          // 缓存 LayerMask
}

private void FixedUpdate()
{
    int hitCount = Physics.OverlapSphereNonAlloc(
        transform.position, 
        m_radius, 
        m_hitBuffer,
        m_enemyLayer                                     // 仅检查 Enemy 层
    );
    
    for (int i = 0; i < hitCount; i++)
    {
        ProcessHit(m_hitBuffer[i]);
    }
}
```

## Raycast 优化

- ✅ 使用 `Physics.Raycast` 的 `maxDistance` 参数限制距离。
- ✅ 如果不需要触发器，用 `QueryTriggerInteraction.Ignore`。
- ✅ 大量 Raycast 可使用 `Physics.RaycastCommand` 配合 Jobs 批处理。

```csharp
// ✅ 好 —— 优化的 Raycast
private RaycastHit m_hitInfo;
private const float k_maxRayDistance = 100f;

private bool CheckLineOfSight(Vector3 origin, Vector3 direction)
{
    return Physics.Raycast(
        origin,
        direction,
        out m_hitInfo,
        k_maxRayDistance,
        m_lineOfSightMask,
        QueryTriggerInteraction.Ignore
    );
}
```

---

# 渲染注意事项

- ⚠️ 访问 `.material` 会创建材质实例 —— 优先使用 `.sharedMaterial`。
- ✅ 用 `MaterialPropertyBlock` 批量修改材质属性。
- ✅ 对每个实例的属性修改，使用 `Renderer.GetPropertyBlock` / `SetPropertyBlock`。
- ❌ 除非必要，避免运行时切换材质。
- ✅ 对大量相似对象使用 GPU Instancing。

```csharp
// ❌ 差 —— 每个对象都创建材质实例
private void Start()
{
    GetComponent<Renderer>().material.color = Color.red; // 创建实例！
}

// ✅ 好 —— 使用 MaterialPropertyBlock（首次调用后无分配）
private static readonly int k_colorId = Shader.PropertyToID("_Color");
private MaterialPropertyBlock m_propertyBlock;
private Renderer m_renderer;

private void Awake()
{
    m_renderer = GetComponent<Renderer>();
    m_propertyBlock = new MaterialPropertyBlock();
}

private void SetColor(Color color)
{
    m_renderer.GetPropertyBlock(m_propertyBlock);
    m_propertyBlock.SetColor(k_colorId, color);
    m_renderer.SetPropertyBlock(m_propertyBlock);
}
```

## Shader 属性 ID

- ✅ 用 `Shader.PropertyToID()` 缓存 Shader 属性 ID。
- ❌ 绝不要在 update 循环中使用字符串访问属性。

```csharp
// ❌ 差 —— 每次都字符串查找
m_material.SetFloat("_Intensity", value);

// ✅ 好 —— 缓存的 ID
private static readonly int k_intensityId = Shader.PropertyToID("_Intensity");

private void UpdateShader(float value)
{
    m_material.SetFloat(k_intensityId, value);
}
```

---

# GetComponent 与 Find 操作

- ❌ **绝不要在 Update 中调用 GetComponent** —— 应在 Awake/Start 中缓存。
- ❌ 避免运行时调用 `FindObjectOfType`、`FindObjectsOfType` —— 它们是 O(n) 的场景扫描。
- ❌ 避免使用 `GameObject.Find` —— 基于字符串，会遍历整个层级。
- ✅ 使用 `[SerializeField]` 在 Inspector 中赋值引用。
- ✅ 使用 `TryGetComponent` 进行空安全查找（比 GetComponent + null 略快）。
- ✅ 跨系统引用使用依赖注入或服务定位器。

```csharp
// ❌ 差 —— 每帧高开销查找
private void Update()
{
    var rb = GetComponent<Rigidbody>();                 // 每帧查找
    var player = FindObjectOfType<Player>();           // 每帧扫描场景
    var enemy = GameObject.Find("Enemy");              // 每帧按字符串查找
}

// ✅ 好 —— 引用已缓存
[SerializeField] private Rigidbody m_rigidbody;
[SerializeField] private Player m_player;
private Transform m_cachedTransform;

private void Awake()
{
    m_cachedTransform = transform;
    
    // 若 Inspector 未赋值则缓存
    if (m_rigidbody == null)
    {
        TryGetComponent(out m_rigidbody);
    }
}

private void Update()
{
    // Use cached references
    m_rigidbody.AddForce(Vector3.up);
}
```

## RequireComponent 模式

- ✅ 使用 `[RequireComponent]` 确保依赖存在，使缓存更安全。

```csharp
[RequireComponent(typeof(Rigidbody))]
[RequireComponent(typeof(Collider))]
public class PhysicsController : MonoBehaviour
{
    private Rigidbody m_rigidbody;
    private Collider m_collider;

    private void Awake()
    {
        // 可放心缓存 —— RequireComponent 保证依赖一定存在
        m_rigidbody = GetComponent<Rigidbody>();
        m_collider = GetComponent<Collider>();
    }
}
```

---

# LINQ 与委托

- ❌ **绝不要在 Update 循环中使用 LINQ** —— 大多数 LINQ 方法会分配。
- ❌ 避免在热路径中使用 lambda 表达式 —— 它们会分配闭包。
- ✅ 性能关键代码中用显式循环替代 LINQ。
- ✅ 重复订阅事件时缓存委托。
- ⚠️ LINQ 适合初始化、编辑器代码或不频繁的操作。

```csharp
// ❌ 差 —— Update 中的 LINQ 分配
private void Update()
{
    var activeEnemies = m_enemies.Where(e => e.IsActive).ToList();
    var closestEnemy = m_enemies.OrderBy(e => e.Distance).FirstOrDefault();
}

// ✅ 好 —— 显式循环，无分配
private Enemy m_closestEnemy;
private readonly List<Enemy> m_activeEnemies = new(50);

private void Update()
{
    m_activeEnemies.Clear();
    float minDistance = float.MaxValue;
    m_closestEnemy = null;
    
    for (int i = 0; i < m_enemies.Count; i++)
    {
        var enemy = m_enemies[i];
        if (enemy.IsActive)
        {
            m_activeEnemies.Add(enemy);
            
            if (enemy.Distance < minDistance)
            {
                minDistance = enemy.Distance;
                m_closestEnemy = enemy;
            }
        }
    }
}
```

## 委托缓存

```csharp
// ❌ 差 —— 每次都创建委托实例
private void OnEnable()
{
    m_button.clicked += () => OnButtonClicked();       // 分配闭包
}

// ✅ 好 —— 缓存方法引用
private void OnEnable()
{
    m_button.clicked += OnButtonClicked;               // 方法组，无分配
}

private void OnButtonClicked()
{
    // 处理点击
}
```

---

# Async 与协程模式

- ✅ 简单延时优先使用 `Awaitable`（Unity 6+）而非协程。
- ✅ 重复使用协程时缓存 `WaitForSeconds` 对象。
- ❌ 不要在循环中 new `WaitForSeconds`。
- ✅ 需要未缩放时间时使用 `WaitForSecondsRealtime`。
- ✅ await/yield 之后务必检查对象是否已被销毁。

```csharp
// ❌ 差 —— 每次迭代都分配 WaitForSeconds
private IEnumerator BadCoroutine()
{
    while (true)
    {
        yield return new WaitForSeconds(0.1f);         // 每次循环都分配
        DoSomething();
    }
}

// ✅ 好 —— 缓存的 wait 对象
private readonly WaitForSeconds m_shortWait = new(0.1f);

private IEnumerator GoodCoroutine()
{
    while (true)
    {
        yield return m_shortWait;                       // 复用缓存对象
        DoSomething();
    }
}

// ✅ 更好 —— Unity 6 的 Awaitable（零分配）
private async Awaitable PeriodicUpdateAsync(CancellationToken token)
{
    while (!token.IsCancellationRequested)
    {
        await Awaitable.WaitForSecondsAsync(0.1f, token);
        
        if (this == null) return;                       // 检查对象是否已销毁
        
        DoSomething();
    }
}
```

---

# 数据结构选择

- ✅ 用 `Dictionary<K,V>` 实现 O(1) 的按键查找。
- ✅ 用 `HashSet<T>` 实现 O(1) 的包含判断。
- ✅ 当顺序重要且频繁迭代时使用 `List<T>`。
- ✅ 固定大小、频繁访问的数据使用数组。
- ✅ FIFO 操作使用 `Queue<T>`。
- ✅ LIFO 操作（撤销系统、状态历史）使用 `Stack<T>`。
- ⚠️ 涉及 Jobs/Burst 时考虑使用 `NativeArray<T>`。

```csharp
// 为操作选择合适的数据结构

// 按 ID 进行 O(1) 查找
private Dictionary<int, Enemy> m_enemyById = new();

// O(1) 包含检查
private HashSet<int> m_processedIds = new();

// 顺序迭代，动态大小
private List<Enemy> m_activeEnemies = new();

// 固定大小，频繁访问
private Enemy[] m_enemyPool = new Enemy[100];

// 命令队列
private Queue<ICommand> m_commandQueue = new();

// 撤销栈
private Stack<ICommand> m_undoStack = new();
```

---

# Unity API 最佳实践

## Transform 操作

- ✅ 批量修改 Transform —— 多次 SetPosition 效率低。
- ✅ 同时设置位置与旋转时使用 `Transform.SetPositionAndRotation()`。
- ❌ 避免分别修改 position/rotation 的各个分量。

```csharp
// ❌ 差 —— 多次 Transform 操作
transform.position = newPosition;
transform.rotation = newRotation;

// ✅ 好 —— 一次组合调用
transform.SetPositionAndRotation(newPosition, newRotation);

// ❌ 差 —— 单独修改分量
transform.position = new Vector3(x, transform.position.y, transform.position.z);

// ✅ 好 —— 设置完整向量
Vector3 pos = transform.position;
pos.x = x;
transform.position = pos;
```

## CompareTag vs ==

- ✅ Tag 比较用 `CompareTag()` 而非 `==` —— 不会产生分配。

```csharp
// ❌ 差 —— 比较时分配字符串
if (other.gameObject.tag == "Player")

// ✅ 好 —— 不分配
if (other.CompareTag("Player"))
```

## Camera.main

- ❌ 避免在 Update 中使用 `Camera.main` —— 它内部会执行 FindGameObjectWithTag。
- ✅ 缓存主相机引用。

```csharp
// ❌ 差 —— 每帧查询
private void Update()
{
    Vector3 screenPos = Camera.main.WorldToScreenPoint(transform.position);
}

// ✅ 好 —— 缓存引用
private Camera m_mainCamera;

private void Awake()
{
    m_mainCamera = Camera.main;
}

private void Update()
{
    Vector3 screenPos = m_mainCamera.WorldToScreenPoint(transform.position);
}
```

---

# Profiler 标记

- ✅ 在 Unity Profiler 中给开销大的方法加 Profiler 标记以便定位。
- ✅ 使用 `ProfilerMarker` 做轻量、零分配的 Profiler 标记。
- ✅ 发布构建中移除或条件编译掉 Profiler 代码。

```csharp
using Unity.Profiling;

public class PerformanceCriticalSystem : MonoBehaviour
{
    private static readonly ProfilerMarker s_updateMarker = 
        new ProfilerMarker("PerformanceCriticalSystem.Update");
    
    private static readonly ProfilerMarker s_processEnemiesMarker = 
        new ProfilerMarker("PerformanceCriticalSystem.ProcessEnemies");

    private void Update()
    {
        using (s_updateMarker.Auto())
        {
            ProcessEnemies();
            UpdateUI();
        }
    }

    private void ProcessEnemies()
    {
        using (s_processEnemiesMarker.Auto())
        {
            // 开销较大的处理...
        }
    }
}
```

---

# 常见反模式

## 代码审查中的反模式清单

在审查 Unity 代码时，请标记以下模式：

| 反模式 | 影响 | 解决方案 |
|--------------|--------|----------|
| `GetComponent` 出现在 Update | 高 | 在 Awake 中缓存 |
| 运行时调用 `FindObjectOfType` | 高 | 使用引用或事件 |
| `new List<T>()` 出现在 Update | 高 | 预分配并 Clear() |
| 在循环中拼接字符串 | 中 | 使用 StringBuilder |
| `Camera.main` 出现在 Update | 中 | 缓存引用 |
| Update 中使用 LINQ | 中 | 使用显式循环 |
| 每帧 `Physics.Raycast` | 中 | 节流或放在 FixedUpdate |
| 用 `material` 而非 `sharedMaterial` | 中 | 使用 MaterialPropertyBlock |
| 事件订阅用 lambda | 低 | 使用方法组 |
| 协程循环中 `new WaitForSeconds` | 低 | 缓存 wait 对象 |

## 代码异味识别

留意以下暗示潜在问题的模式：

```csharp
// 🔴 Update 方法中的危险信号
void Update()
{
    GetComponent<T>()                    // 🔴 未缓存的查询
    FindObjectOfType<T>()                // 🔴 场景扫描
    new List<T>()                        // 🔴 分配
    new T[]                              // 🔴 分配
    string + string                      // 🔴 字符串分配
    $"interpolated {value}"              // 🔴 字符串分配
    .Where() .Select() .ToList()         // 🔴 LINQ 分配
    Camera.main                          // 🔴 未缓存的查询
    GameObject.Find()                    // 🔴 字符串查找
    Physics.OverlapSphere()              // ⚠️ 分配版本
}

// 🟢 推荐写法
void Update()
{
    m_cachedComponent                    // 🟢 缓存的引用
    m_cachedList.Clear()                 // 🟢 复用的集合
    m_stringBuilder.Clear().Append()     // 🟢 复用的 builder
    for (int i = 0; i < count; i++)      // 🟢 显式循环
    m_cachedCamera                       // 🟢 缓存的引用
    Physics.OverlapSphereNonAlloc()      // 🟢 零分配
}
```

---

# 总结：速查表

## 务必做 ✅
- 在 Awake() 中缓存组件引用
- 按预期容量预分配集合
- 对频繁生成的对象使用对象池
- 使用零分配的物理方法
- 缓存 Shader 属性 ID
- 对性能关键代码使用 ProfilerMarker
- Unity 6+ 优先使用 Awaitable 而非协程

## 绝不要做 ❌
- 在 Update 循环中 GetComponent/Find
- 在 Update 循环中分配（new）
- 在 Update 循环中使用 LINQ
- 在热路径中拼接字符串
- 每帧访问 Camera.main
- 在协程循环中 new WaitForSeconds
- 能用 .sharedMaterial 时不要用 .material

## 可考虑 ⚠️
- 对开销大的操作做节流
- 批量执行物理查询
- 在目标平台进行 Profiler 采样
- 对重计算使用 Jobs/Burst
- 配置物理碰撞矩阵

---

# 版本信息

- **目标 Unity 版本**：Unity 6 (6000.x) 及更高
- **C# 版本**：支持 C# 9.0+ 特性
- **最后更新**：2026 年 1 月
