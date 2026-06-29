
# GitHub Copilot 指令：Unity C# 风格与命名指南

本速查表供 LLM 自动补全使用。详见 readme.md 了解这些指南背后的通用原理。

目录：
- [Unity 版本相关指令](#unity-版本相关指令)
- [通用准则](#通用准则)
  - [格式](#格式)
    - [空格](#空格)
    - [region 的使用](#region-的使用)
  - [注释](#注释)
- [按 Unity 脚本执行顺序组织类](#按-unity-脚本执行顺序组织类)
  - [using 语句](#using-语句)
    - [命名空间](#命名空间)
  - [字段](#字段)
  - [属性](#属性)
  - [事件](#事件)
    - [订阅与取消订阅事件](#订阅与取消订阅事件)
  - [MonoBehaviour 方法](#monobehaviour-方法)
    - [Awake()](#awake)
    - [OnEnable()](#onenable)
    - [Start()](#start)
    - [OnDisable()](#ondisable)
    - [OnDestroy](#ondestroy)
    - [FixedUpdate()](#fixedupdate)
    - [Update()](#update)
    - [LateUpdate()](#lateupdate)
    - [一般性说明](#一般性说明)
  - [公共方法](#公共方法)
  - [私有方法](#私有方法)
  - [其他类](#其他类)
- [方法](#方法)
- [Unity 代码整洁的一般建议](#unity-代码整洁的一般建议)
  - [接口](#接口)
  - [命名文件与文件夹](#命名文件与文件夹)
  - [枚举](#使用枚举管理状态)
  - [避免 if 嵌套](#避免-if-嵌套)
  - [字符串分配管理](#字符串分配管理)
  - [集合类型选择](#集合类型选择)
  - [Async \& Awaitable Usage](#async--awaitable-usage)
  - [ScriptableObject](#scriptableobject)
  - [动画参数、Layer、Tag、Sorting Layer 与 Input Action 名称](#动画参数layertagsorting-layer-与-input-action-名称)
  - [调试](#调试)
  - [Using Try-Catch \& Debugger Breaks](#using-try-catch--debugger-breaks)
  - [Unity 中的设计模式](#unity-中的设计模式)
    - [实现状态模式](#实现状态模式)
    - [对象池](#对象池)
- [UI Toolkit](#ui-toolkit)
  - [UI Toolkit File Naming \& Organization](#ui-toolkit-file-naming--organization)
  - [UXML](#uxml)
    - [BEM 复习](#bem-复习)
    - [示例](#示例)
    - [从 C# 查询](#从-c-查询)
  - [USS](#uss)
    - [指南](#指南)
    - [从 C# 切换类](#从-c-切换类)
  - [UI Toolkit 事件处理](#ui-toolkit-事件处理)

# Unity 版本相关指令

- ℹ️ 本项目使用 Unity 6.3。请使用适用于 Unity 6 或更高版本的最新资源与文档。
- ℹ️ 本项目使用较新的"Input System"，而非旧的"Input Manager"。
- ℹ️ 本项目使用较新的 UI Toolkit，而非旧的 UGUI 来构建 UI。
- ℹ️ 本项目使用 Universal Render Pipeline，而非旧的内置渲染管线。
- ℹ️ 在需要按序列执行时，优先使用 Unity 6 的 Awaitable 而不是协程：`await Awaitable.WaitForSecondsAsync(delay, token);`。续作记得用 `if (this == null || !isActiveAndEnabled) return;` 保护。
- ℹ️ 频繁实例化时，优先使用 `UnityEngine.Pool.ObjectPool<T>`，配合 `actionOnGet`/`actionOnRelease` 切换激活状态。

# 通用准则

## 格式

- ⚠️ 可读性至上。尽量保持单行短小，注意横向留白。
- ✅ 使用 Allman 风格（左大括号单独成行）。
- ✅ 定义一个标准最大行宽，小于 120–140 字符。
- ✅ 把长行拆成更小的语句，而不是让其超出。
- ✅ 在流程控制条件前加一个空格，如 `while (x == y)`。
- ❌ 避免在方括号内侧加空格，如 `x = dataArray[index]`。

```csharp
// 良好的空格示例：使用 Allman 风格与合适空格
public void ProcessItems(List<Item> items, int startIndex)
{
    for (int i = startIndex; i < items.Count; i++)
    {
        ProcessItem(items[i]);
    }

    // 这里的垂直空行用于视觉上的分隔
    Debug.Log("Processing complete");
}

// 避免
public void ProcessItems ( List<Item>items,int startIndex ) { for(int i=startIndex;i<items.Count;i++) { ProcessItem( items [ i ] ); } Debug.Log("Processing complete"); }
```

### 空格

- ✅ 在函数参数之间的逗号后加一个空格，如 `CollectItem(myObject, 0, 1);`。
- ❌ 不要在第一个或最后一个参数的圆括号内侧加空格，如避免 `CollectItem( myObject, 0, 1 );`。
- ❌ 函数名与左括号之间不要加空格，如避免 `DropPowerUp(myPrefab, 0, 1);`。
- ✅ 使用垂直空行（额外的空行）进行视觉分隔。
- ✅ 一般情况下每行声明一个变量，虽然稍显冗长，但更易读。
- ✅ 比较运算符前后各加一个空格，如 `if (x == y)`。

```csharp
// 良好的空格示例
public void ProcessItems(List<Item> items, int startIndex)
{
    for (int i = startIndex; i < items.Count; i++)
    {
        ProcessItem(items[i]);
    }

    // 这里的垂直空行用于视觉上的分隔
    Debug.Log("Processing complete");
}

// 不良的空格示例
public void ProcessItems ( List<Item>items,int startIndex ) { for(int i=startIndex;i<items.Count;i++) { ProcessItem( items [ i ] ); } Debug.Log("Processing complete"); }
```
### region 的使用
- ℹ️ 谨慎使用 `#region`，因为它会隐藏代码、降低可读性。
- ✅ 用 `#region` 把由动画系统等调用的 Animation Event Handlers 或 Input Event Handlers 分组，使其与其它代码分离。

```csharp
        #region 动画事件方法
        // 该方法由动画事件触发，表示着地
        public void OnLand()
        {
            Debug.Log("OnLand called from animation event");
        }

        // 该方法由动画事件触发
        public void OnFootstep()
        {
            // 可用于播放脚步声
            Debug.Log("Footstep event triggered");
        }
        #endregion
```

## 注释
- ✅ 给大多数行加上解释性注释以提供文档。
- ✅ 注释意图（"为什么"），而不是复述代码（"做了什么"）。
- ✅ 对于需要 Inspector 上下文的序列化字段，使用 `[Tooltip]`、`[Header]`、`[Space]` 等。

```csharp
// 好 - 解释为什么，而不仅仅是做了什么
// 当处理数量低于阈值时跳过，以避免小批次的性能问题
if (itemCount < processingThreshold)
{
    return;
}

[Tooltip("Maximum distance the player can travel in one frame")]
[SerializeField] private float m_maxDeltaMovement = 10f;
```

# 按 Unity 脚本执行顺序组织类
- ✅ 按照 Unity 脚本执行顺序来组织类：
  - [using 语句](#using-语句)
    - [命名空间](#命名空间)
  - [字段](#字段)
  - [属性](#属性)
  - [事件](#事件)
  - [MonoBehaviour 方法](#monobehaviour-方法)
    - [Awake()](#awake)
    - [OnEnable()](#onenable)
    - [Start()](#start)
    - [OnDisable()](#ondisable)
    - [OnDestroy](#ondestroy)
    - [FixedUpdate()](#fixedupdate)
    - [Update()](#update)
    - [LateUpdate()](#lateupdate)
  - 公共方法
  - 私有方法
  - 其他类

## using 语句

- ✅ 把 `using` 语句放在文件顶部。
- ✅ 排序 `using` 语句能提升可读性并保证文件间一致，也能避免命名空间类名冲突。
- ✅ 先放系统命名空间（如 `System`、`System.Collections`）。
- ✅ 接着是 Unity 命名空间（如 `UnityEngine`）。
- ✅ 最后是项目特定命名空间（如 `MyGameProject.Utilities`）。
- ✅ 删除未使用的 `using`，保持文件整洁、避免不必要的依赖。


```csharp
// 系统命名空间
using System;
using System.Collections;
using System.Collections.Generic;

// Unity 命名空间
using UnityEngine;

// 项目特定命名空间
using MyGameProject.Utilities;
```

### 命名空间

- ✅ Use namespaces to ensure that your classes, interfaces, enums, etc., won't conflict with existing ones from other namespaces or the global namespace.
- ✅ Use PascalCase, without special symbols or underscores.
- ✅ Create sub-namespaces with the dot (`.`) operator, e.g., `MyApplication.GameFlow`, `MyApplication.AI`, etc.

```csharp
namespace MyGame.Characters
{
    public class Player : MonoBehaviour
    {
        // Class implementation
    }
}
```

## 字段
- ✅ Don't omit the private accessor field though technically its implicit. It provides context about the intent.
- ✅ Use `m_` prefix for private variables, `k_` for constants
- ✅ Use `m_` prefix for private fields to distinguish them from local variables.
- ✅ 常量使用 `k_` 前缀以表示不可变。
- ✅ Use descriptive names that clearly indicate the field's purpose.
- ❌ Avoid abbreviations unless they are widely understood (e.g., `UI`, `ID`).
- ✅ Include units in the name if applicable (e.g., `m_speedInMetersPerSecond`).
- ✅ Prefix Boolean fields with verbs like `is`, `has`, or `can` for clarity (e.g., `m_isActive`, `m_hasPermission`).
- ❌ Avoid redundancy by not repeating the class name in field names (e.g., use `m_health` instead of `m_playerHealth` in a `Player` class).
- ✅ Expose fields in the Inspector with `[SerializeField]`.
- ✅ Use properties when you need to access them from other classes.

```csharp
// Use `m_` prefix for private variables
private int m_health;

// Static variable with s_ prefix
private static int s_sharedCount;

// Constant with k_ prefix
private const int k_maxCount = 100;

// Use [SerializeField] rather than exposing your field publicly; keep it private or make it a property
[SerializeField] private int m_health;

// Specify the unit used to eliminate guessing. Favor readability over brevity
private int m_elapsedTimeInHours;
private int m_elapsedTimeInDays;
private int m_elapsedTimeInSeconds;

// Prefix Booleans with a verb like "is" to make their meaning apparent
[SerializeField] private bool m_isPlayerDead;

```

### 属性
- ✅ Place properties after fields and before MonoBehaviour methods as per your class organization.
- ✅ Use PascalCase for properties and avoid prefixes/suffixes.
- ✅ Prefer verb-like names for boolean properties (Is/Has/Can) (e.g., IsGrounded, HasHealtPack, CanJump).
- ❌ Do not serialize properties. Instead use [SerializeField] private T m_field when you need to expose it in the inspector plus a public property that returns or validates it.
- ✅ Use Properties for accessing or modifying the state of an object. Properties are ideal for lightweight operations with no or minimal side effects.
  Example: Health, Speed, IsGrounded.
- ℹ️ Use methods for actions or operations. Such as input handling and event-driven behavior. Name appropiate `ApplyDamage(int amount)` instead of `SetHealth(int amount)`.
  ❌ Avoid Using Properties for Actions: Properties should not perform significant computations, trigger events, or have side effects.
-
```csharp
// Private backing field
private int m_maxHealth;

// 只读属性
public int MaxHealthReadOnly => m_maxHealth;

// Property with full implementation
public int MaxHealth
{
    get => m_maxHealth;
    set => m_maxHealth = value;
}

// 自动实现属性
public string DescriptionName { get; set; } = "Fireball";

// 避免: Using a property for an action like SetMovementInput to handle input events.
public Vector2 MovementInput
{
    set
    {
        m_forwardMovementInput = value;
        Debug.Log("Movement input set.");
    }
}
```

### 事件
- ✅ Use event Action or event Action<T> for declaring events for the majority of cases.
- ✅ Use UnityEvent only when you need to expose callbacks to the Inspector. I generally avoid UnityEvent for code-only events as Action is more lightweight and flexible.
- ✅ Follow the C# event naming convention: use past tense verbs (e.g., `DoorOpened`, not `OnDoorOpen`).
- ✅ Use the On prefix for methods that raise events (e.g., OnDoorOpened), and use past-tense verbs for the event name itself (e.g., DoorOpened).
- ✅ Use the observer pattern to decouple systems and reduce dependencies (e.g., firing events for UI to update instead of direct references to UI components).
- ✅ Use the null-conditional operator (`?.`) when raising events to avoid null reference exceptions.
- ✅ Use EventArgs or custom event argument classes for events that require multiple parameters or complex data. This improves readability and maintainability compared to using multiple parameters.
- ⚠️ Avoid overusing events for tightly coupled systems where direct method calls would be simpler.
    - ✅ *Use Events*: When you need to decouple systems that don’t need to know about each other directly (e.g., broadcasting game state changes to multiple systems). For example, when a GameManager needs to notify multiple unrelated systems (e.g., UI, Audio, Analytics) about a game state change.
    - ❌ *Avoid Events*: When the systems are tightly coupled, and a direct method call or dependency injection is simpler and more efficient. For example, when a PlayerController directly controls a Weapon.

```csharp
// 事件声明s
public event Action DoorOpened;         // Use past tense verbs for event names
public event Action<int> PointsScored;
public event Action<CustomEventArgs> ThingHappened;

// Event raising methods
public void OnDoorOpened()
{
    // Use the null-conditional operator to avoid null reference exceptions
    DoorOpened?.Invoke();
}

// When passing data with events
public void OnPointsScored(int points)
{
    PointsScored?.Invoke(points);
}

// 复杂数据的自定义 EventArgs 类
public struct CustomEventArgs
{
    public int ObjectID { get; }
    public Color Color { get; }

    public CustomEventArgs(int objectId, Color color)
    {
        this.ObjectID = objectId;
        this.Color = color;
    }
}
```

#### 订阅与取消订阅事件
- ✅ Subscribe in the `OnEnable` and always unsubscribe in `OnDisable` to prevent memory leaks.
- ✅ Avoid using lambda expressions when subscribing to events as it makes unsubscribing impossible unless you store the lambda in a variable first.
- ⚠️ Be cautious when subscribing long-lived objects (e.g., singletons) to events from short-lived objects to avoid memory leaks.

```csharp
// Subscribing to events
private void OnEnable()
{
    m_gameManager.DoorOpened += HandleDoorOpened;
}
private void OnDisable()
{
    m_gameManager.DoorOpened -= HandleDoorOpened;
}


```
## MonoBehaviour 方法

### Awake()
- ✅ 使用 Awake 在组件之间、不同 GameObject 之间初始化引用。
- ✅ 缓存组件引用（GetComponent、Find、对象池创建）。
- ✅ 初始化不依赖其他 GameObject 的内部状态。
- ✅ 避免在这里做重型工作、依赖场景的调用或订阅外部事件。

```csharp
private void Awake()
{
    // Cache component references here
    m_rigidbody = GetComponent<Rigidbody>();
}
```

### OnEnable()
- ✅ 订阅事件、注册输入回调、重置每次启用时的状态。
- ✅ 让工作轻量且可逆。在 OnDisable() 中取消订阅。

```csharp
private void Awake()
{
    // Cache component references here
    m_rigidbody = GetComponent<Rigidbody>();
}
```

### Start()
- ✅ 用 Start 调用需要其他组件已存在并就绪的初始化方法。
- ✅ 执行依赖于其他组件或场景对象存在的初始化。
- ✅ 用于一次性设置（动画、UI 装配），必须在所有 Awake()/OnEnable() 之后运行。

```csharp
private void Start()
{
    // 使用缓存的引用，执行可能依赖其他组件已初始化的操作
    m_animator.SetTrigger("Initialize");
}
```

### OnDisable()
- ✅ 用 OnDisable 取消事件订阅，并在对象被禁用时清理状态。

```csharp
private void OnDisable()
{
    // 在此取消订阅，避免内存泄漏或异常行为
}
```

### FixedUpdate()
- ⚠️ FixedUpdate runs on the fixed physics timestep and may run zero, one, or many times between Update calls depending on frame time.
- ✅ 用 FixedUpdate 处理物理相关更新（如施力、物理计算）。
- ✅ 把确定性物理工作放在这里：AddForce、刚体速度、模拟步进。
- ✅ 不要在这里读输入；在 Update() 中读输入，若需要则在 FixedUpdate() 中应用。
- ✅ 保持零分配、轻量化。

```csharp
// 用 FixedUpdate 处理物理
private void FixedUpdate()
{
    HandlePhysicsMovement();
}
```

### Update()
- ✅ 用 Update 处理常规帧更新（如输入处理、非物理计算）。
- ✅ 读取输入、更新计时器、运行非物理的每帧逻辑与状态机。
- ✅ 避免分配，使用早返回（如 `if (!m_isActive) return;`），并把工作分派到命名良好的辅助方法。
- ❌ 永远不要在 Update() 里 new 出新集合，而是复用现有集合。
- ✅ 使用早返回避免不必要的处理。
- ✅ 不要把逻辑直接写在 Update 循环里，而是移到具有描述性名称的方法中，提高整洁度与自解释性。
-
```csharp
private void Update()
{
    // 把所有常规帧逻辑更新代码放在 Update() 中

    if (!m_isActive) return; // 早返回模式

    // 把逻辑移到命名良好的方法中
    HandleMovement();
    UpdateAnimations();
    CheckPlayerInput();
}

```

### LateUpdate()
- ✅ 用于收尾 transform 变更、相机跟随、动画驱动的调整，以及在所有 Update() 之后做清理。
- ✅ 用于必须在所有 Update() 工作之后运行的逻辑。

```csharp
// 用 LateUpdate 处理相机或后期处理更新
private void LateUpdate()
{

}
```

### 一般性说明
- ✅ 把相关方法组织在一起，提升可读性。
- ✅ 让 MonoBehaviours 保持单一职责。
- ✅ 存在依赖时使用 `[RequireComponent(typeof(OtherComponent))]`，它保证所需组件一定存在，省去后续空引用检查。
- ✅ 把开销大的操作提到 Update 循环外缓存，避免重复分配。
- ❌ 避免魔数与魔字符串。把硬编码值（如 Speed 中的 `5f`）替换为常量或序列化字段，提升灵活性与可读性。



```csharp
// 避免 - expensive operations in Update
private void Update()
{
   // Bad - expensive operation every frame
   var nearbyEnemies = Physics.OverlapSphere(transform.position, m_detectionRadius);

   // Better - cache and update less frequently
   if (Time.time > m_nextUpdateTime)
   {
       UpdateNearbyEnemies();
       m_nextUpdateTime = Time.time + m_updateInterval;
   }
}
```

### 方法
- ✅ 用方法表示行为与事件回调（动作、副作用、输入）。示例：Jump()、TakeDamage(int amount)、SetMovementInput(Vector2 input)。Unity 的 PlayerInput 和 Inspector 事件调用的是方法而非属性，因此输入处理器请优先使用方法。
- ✅ 用描述性动词命名方法，让动作清晰（如 ApplyDamage、PlaySound、RotateTurret、SetPosition、CalculateDamage）。
- ✅ 使用清晰的前缀：SetX 用于赋值/更新（如 `SetMovementInput(Vector2 input)`），ChangeX 用于修改/转换状态（如 `ChangeHealth(int amount)`）。
- ✅ **用 "Process" 表示游戏逻辑操作**（回合制、计划性或系统驱动的、属于游戏流程的操作）。示例：ProcessTradeIncome()、ProcessModifierDecay()、ProcessAgreementBonuses()。与事件处理器不同。
- ✅ **用 "Handle" 表示事件驱动的回调**（响应外部输入或事件）。示例：HandleTileSelected()、HandleTurnEnded()、OnDiplomacyButtonClicked()。它们由事件系统在外部触发时调用。
- ✅ 布尔方法应使用 Is、Has、Can 以问句形式返回 bool（如 `IsPlayerAlive()`）。
- ❌避免名词式方法名（工厂方法、事件处理器除外）；避免动名词/进行时（如 Walking()、Rotating()）——这些表示状态，应当用 isWalking / isRotating 等变量或属性。
- ⚠️术语：在 C# 中请用"方法"（method）一词，指类中的函数。

```csharp
// 好：用方法表示动作或操作

// 动作：执行行为/副作用
public void Jump()
{
    m_rigidbody.AddForce(Vector3.up * m_jumpForce, ForceMode.Impulse);
}

// Setter：清晰赋值或更新值（适合作为输入回调）
public void SetMovementInput(Vector2 input)
{
    m_forwardMovementInput = input;
}

// Modifier：转换或改变状态
public void ChangeHealth(int amount)
{
    m_health += amount;
}

// 用动词命名方法以说明其作用
public void SetInitialPosition(float x, float y, float z)
{
    transform.position = new Vector3(x, y, z);
}

public void SaveGame()
{
    // Implementation omitted: use try/catch for I/O and log errors as needed
}

// ✅ "Handle" for event-driven callbacks (responding to external events/input)
private void HandleTileSelected(MapTile tile)
{
    ChangeState(UIGameState.TownView);
}

// ✅ "Process" for game logic operations (part of game flow, usually turn-based or system-driven)
private void ProcessTradeIncome()
{
    foreach (var relationship in m_relationships)
    {
        if (relationship.InvolvesFaction(m_playerFactionData))
        {
            m_gameResources.ModifyCurrentGold(m_tradeAgreementGold);
        }
    }
}

// Good examples indicate an action being performed
public void SetInitialPosition(float x, float y, float z);
public void SaveGame();
public bool IsPlayerAlive();
public Player CreatePlayer();

// 避免 'ing as that implies a continuous state or property rather than an action.
Walking(); // ❌ Avoid

// Boolean methods asking questions
public bool IsNewPosition(Vector3 newPosition)
{
    return (transform.position == newPosition);
}

```

# Unity 代码整洁的一般建议

## 接口
- ✅ Use interfaces to define clear "contracts" and decouple systems
- ✅ Use the one responsibility rule per interface (Interface Segregation). Small, focused interfaces are better than large monoliths.
- ✅ Use the I prefix and PascalCase (e.g., `IDamageable`, `IAudioService`).
- ✅ Name methods with verbs and boolean members with Is/Has/Can.
- ✅ Use an interface for a pure contract with no shared implementation and use an abstract base class when multiple implementations share behaviour or state.

```csharp
public interface IDamageable
{
    string DamageTypeName { get; }
    float DamageValue { get; }

    bool ApplyDamage(string description, float damage, int numberOfHits);
}

public interface IDamageable<T>
{
    void Damage(T damageTaken);
}
```
## 命名文件与文件夹
- ✅ Use PascalCase for all file and folder names to maintain consistency with class and script naming conventions (e.g., `CharacterController.cs`, `AnimationController.cs`, `CoreSystems/`, `UI/`).
- ✅ Organize scripts into folders based on functionality or feature areas (e.g., `CoreSystems/`, `UI/`).
- ✅ Don't worry about long folder paths if they improve organization and clarity. That only helps future maintainers and copilot.
- ❌ Avoid spaces and special characters in file and folder names to prevent issues with version control systems and cross-platform compatibility.
- ℹ️ If you have a very long folder name with variations you can consider using _ instead of spaces to seperate words. Example: InputSystemActions_PlayerInputComponent_UnityEvents, InputSystemActions_PlayerInputComponent_CSharpEvents, etc.
- ❌ Don't use the ´NotImplementedException´ when stubbing out new methods or event handlers. It adds unnecessary noise and makes it harder to read the code. Instead, leave the method body empty or add a comment indicating that the implementation is pending.

```csharp

    private void LookInputReceived(InputAction.CallbackContext context)
    {
        // Don't: when Copilot helps create new methods, leave out the the NotImplementedException
        throw new NotImplementedException();
    }

```

### Use Enums for managing states
- ✅ Use enums for mutually exclusive states (e.g., animation, movement, UI, or game phases).
- ✅ 在 switch 语句中使用枚举，使逻辑清晰、易于维护。
- ❌ Avoid using strings or integers directly for state tracking.
- ✅ 当对象或动作同一时间只能有一个值时使用枚举。
- ✅ Use Pascal case for enum names and values.
- ✅ Use a singular noun for the enum name as it represents a single value from a set of possible values.
- ❌ Avoid prefixes or suffixes (e.g., don’t add Enum, Type, or E_).
- ✅ Public enums can be declared outside of a class if they need to be accessed globally.

```csharp
// Simple enum
public enum Direction
{
    North,
    South,
    East,
    West
}

private Direction m_currentDirection;

private void Update()
{
    switch (m_currentDirection)
    {
        case Direction.North:
            // Move north
            break;
        case Direction.South:
            // Move south
            break;
        case Direction.East:
            // Move east
            break;
        case Direction.West:
            // Move west
            break;
    }
}

// Flag enum
[Flags]
public enum AttackModes
{
    // Decimal                         // Binary
    None = 0,                          // 000000
    Melee = 1,                         // 000001
    Ranged = 2,                        // 000010
    Special = 4,                       // 000100

    MeleeAndSpecial = Melee | Special  // 000101
}
```

### 避免 if 嵌套
- ✅ Simplify the structure of your if statements by avoiding nesting. Use return instead
```csharp
// 避免 nesting
if (conditionA)
{
    if (conditionB)
    {
        ExecuteAction();
    }
}
// Better - avoid nesting
if (!conditionA) return;

```

### 字符串分配管理
- ✅ Use string interpolation ($"") for building strings instead of concatenation (+) to reduce garbage generation and improve readability.

```csharp
// Efficient string operations
public class ScoreManager : MonoBehaviour
{
   // Bad - creates garbage with string concatenation
   private string BuildLabelWithConcatenation(int score, float time)
   {
       return "Score: " + score + " Time: " + time;
   }

   // Good - use string interpolation
   private void UpdateScoreDisplay(int score, float time)
   {
       string result = $"Score: {score} Time: {time:F1}";
       // Display result...
   }
}
```

### 集合类型选择
- ✅ Use List<T> when the collection size changes dynamically or frequent additions/removals are needed.
- ✅ Use arrays when the size is fixed and performance matters (e.g., tight update loops).
- ✅ Use Stack<T> for Last-In-First-Out (LIFO) logic such as undo systems, state history, or command buffers.
- ❌ Avoid allocations inside loops — reuse existing collections and call .Clear() instead of creating new instances.
- ✅ Initialize collections with a reasonable capacity when possible (e.g., new List<T>(capacity)) to reduce resizing overhead.
- ✅ Favor foreach loops when iterating read-only collections, as they improve readability and reduce indexing errors.
- ✅ Use Dictionary<TKey, TValue> when you need fast lookups by key.

```csharp
// List<T>: dynamic size, frequent add/remove
public class EnemyRegistry : MonoBehaviour
{
    // Initialize with modern syntax using New() (C# 9.0+)
    [SerializeField] private List<GameObject> m_enemies = new();

    public void Register(GameObject enemy)
    {
        if (!m_enemies.Contains(enemy))
        {
            m_enemies.Add(enemy);
        }
    }
    public void Unregister(GameObject enemy)
    {
        m_enemies.Remove(enemy);
    }
}
```
### Async & Awaitable 使用
- ✅ Use the Awaitable API (available in Unity 6 and later) with async/await for timed delays, sequencing, or asynchronous workflows that don’t require per-frame iteration. This results in cleaner and more readable code compared to coroutines.
- ✅ Name async methods with the Async suffix (e.g., OpenDoorAsync) and coroutines with the Co suffix (e.g., LoadAssetsCo) to clearly distinguish them.
- ✅ Use PascalCase and verb-based names for both async and coroutine methods.
- ✅ Prefer Awaitable and async/await over StartCoroutine for simple delays or sequential logic.
- ❌ Do not mix Awaitable and coroutines within the same operation—choose one approach per workflow for clarity and maintainability.
- ✅ Use CancellationToken (for Awaitable) or check this == null to safely handle cancellation and prevent callbacks after an object is destroyed.

```csharp
public async Awaitable OpenDoorAsync()
{
    // Trigger animation or sound
    Debug.Log("Door opening...");

    // Wait 2 seconds before completing
    await Awaitable.WaitForSecondsAsync(2f);

    Debug.Log("Door opened!");
}

private IEnumerator LoadAssetsCo()
{
    // Simulate loading assets over multiple frames
    for (int i = 0; i < 5; i++)
    {
        Debug.Log($"Loading asset {i + 1}/5...");
        yield return new WaitForSeconds(0.5f); // Simulate delay
    }
    Debug.Log("All assets loaded!");
}

private async void Start()
{
    // Demonstrate timed async call
    await OpenDoorAsync();
}
```

### ScriptableObject
- ✅ Favor ScriptableObjects for static configuration data and reusable content that stays the same while the game runs (e.g., weapons, enemy stats, skill effects).
- ❌ Don't use ScriptableObjects to store data that changes during gameplay (like player health, score, or runtime state).
- ✅ Use ScriptableObjects to reduce coupling between systems—feed configuration into MonoBehaviours instead of having them fetch data manually.
- ✅ Always mark ScriptableObjects with [CreateAssetMenu] for easy asset creation via the Project window.
- ✅ Append a `DataSO` suffix (e.g., `WeaponDataSO`) to make ScriptableObjects easily identifiable.
- ✅ Store ScriptableObject assets in a dedicated folder structure (e.g., Assets/Data/Weapons/).
- ✅ Keep ScriptableObjects focused on a single responsibility to enhance reusability and maintainability.
- ✅ Keep data and logic separate: ScriptableObjects should primarily hold data. Only add logic that directly relates to the data.
- ✅ Use properties to expose data from ScriptableObjects instead of public fields for better encapsulation.

```csharp
// WeaponData is a ScriptableObject that stores weapon configuration
[CreateAssetMenu(fileName = "WeaponData", menuName = "Game Data/Weapon", order = 0)]
public class WeaponDataSO : ScriptableObject
{
   [SerializeField] private string m_weaponName;
   [SerializeField] private int m_damage;
   [SerializeField] private float m_range;
   [SerializeField] private GameObject m_projectilePrefab;

   public string WeaponName => m_weaponName;
   public int Damage => m_damage;
   public float Range => m_range;
   public GameObject ProjectilePrefab => m_projectilePrefab;
}
```
### 动画参数、Layer、Tag、Sorting Layer 与 Input Action 名称
- ✅ **PascalCase**  is recommended for all text-based references such as animation parameters, layers, tags, sorting layers, and input action names. This aligns with Unity conventions and this guide's property naming.
- ✅ Prefix boolean animation parameters and similar flags with **Is**, **Has**, or **Can** (e.g., `IsRunning` rather than `Running`)
- ✅ Use descriptive names that clearly indicate the purpose or state, whether for animation, layers, tags, or input actions.
- ✅ Always define these names as constants in code to prevent runtime errors, enable refactoring, and avoid typos.
- ✅ Centralize these constants in a dedicated static class or script for maintainability and discoverability (even with modern IDEs like Visual Studio Code that support refactoring and renaming)

```csharp

// Centralized constants for animation parameters, layers, tags, and input actions

// You can use static classes to group related constants
public static class Layers
{
    public const string Player = "Player";
    public const string Enemy = "Enemy";
}

public static class Tags
{
    public const string Collectible = "Collectible";
    public const string Hazard = "Hazard";
}

public static class InputActions
{
    public const string Jump = "Jump";
    public const string Fire = "Fire";
}

// Good - constants prevent typos and enable refactoring
private const string k_isRunningParam = "IsRunning";
private const string k_speedParam = "Speed";
private const string k_jumpTriggerParam = "JumpTrigger";
private const string k_isGroundedParam = "IsGrounded";
private const string k_attackIndexParam = "AttackIndex";
private const string k_isDeadParam = "IsDead";

// Usage - safe and maintainable
m_animator.SetBool(k_isRunningParam, isMoving);
m_animator.SetFloat(k_speedParam, currentSpeed);
m_animator.SetTrigger(k_jumpTriggerParam);

// Bad - magic strings scattered throughout code (runtime errors possible)
void UpdateMovement()
{
   m_animator.SetBool("IsWalking", isMoving);        // Typo risk
   m_animator.SetFloat("Spead", currentSpeed);       // Typo - fails silently!

   if (m_animator.GetBool("IsWalknig"))              // Another typo
   {
       // This condition will never be true due to typo
   }
}

// Good - centralized, safe, maintainable
private const string k_isWalkingParam = "IsWalking";
private const string k_speedParam = "Speed";


void UpdateMovement()
{
   m_animator.SetBool(k_isWalkingParam, isMoving);
   m_animator.SetFloat(k_speedParam, currentSpeed);

   if (m_animator.GetBool(k_isWalkingParam))
   {
       // Safe - IDE will catch typos at compile time
   }
}
```

## 调试
- ✅ Log strategically: use Unity's `Debug.Log`, `Debug.LogWarning`, and `Debug.LogError` selectively. Avoid excessive logging, especially in production builds, to prevent performance issues.
- ✅ Use conditional compilation (e.g., `#if UNITY_EDITOR`) or a custom logging wrapper to strip or disable logs in release builds.
- ✅ Always include context in log messages (such as object name, method, or relevant state) to make debugging easier.
- ✅ Validate assumptions and invariants at runtime with `Debug.Assert` where appropriate.
- ✅ When using `Debug.Log`, pass a GameObject or component as the second parameter to link the log message to that object in the Console.
- ✅ Use `Debug.DrawLine`, `Debug.DrawRay`, and `Gizmos` for visual debugging in the Editor.
- ✅ Format debug messages consistently for easier searching and filtering.
- ✅ Validate reference dependencies with [RequireComponent] or explicit null checks.
- ✅ Use the Console window’s filters and stack traces to quickly locate issues.
- ✅ For larger projects, consider a logging abstraction with log levels (Info, Warning, Error) for more control.
- ⚠️ Avoid logging inside tight loops or performance-critical sections unless necessary for debugging specific issues.
- ℹ️ While checking for null references before logging can be useful, excessive null checks can clutter the code and you can use the [RequireComponent] attribute to ensure dependencies are met.

```csharp
// Include context in log messages
Debug.Log("Player has entered the trigger zone.", this.gameObject);

// Better error logging
Debug.LogError($"[{GetType().Name}] Failed to load data: {exception.Message}", this);

// Context-aware logging
Debug.LogWarning("Player health critical", gameObject);

// Using Debug.DrawLine for visual debugging
Debug.DrawLine(startPosition, endPosition, Color.red, 2f);

// Using Gizmos for editor visualization
private void OnDrawGizmos()
{
   Gizmos.color = Color.green;
   Gizmos.DrawWireSphere(transform.position, detectionRadius);
}

// Conditional logging example
#if UNITY_EDITOR
Debug.Log("This log only appears in the Editor.");
#endif

// Null checks can be useful but avoid excessive checks. It can clutter the code.
if (m_audioSource != null)
{
   Debug.Log("Audio source is available.", this);
}

// Instead you can use [RequireComponent] to ensure dependencies are met
[RequireComponent(typeof(AudioSource))]
public class AudioPlayer : MonoBehaviour
{
    private AudioSource m_audioSource;
}

```
## 使用 try-catch 与调试断点

- ✅ Use try-catch blocks for handling external dependencies such as file I/O, network requests, or database operations, where failures are often outside your control (e.g., missing files, network timeouts, or permission issues). These are exceptional cases that justify the use of try-catch.
- ❌ Avoid using try-catch for internal logic or expected conditions (e.g., null checks, invalid input). Instead, validate inputs and use proper control flow to handle predictable scenarios.
- ✅ Always log the exception details (e.g., ex.ToString()) to help with debugging and troubleshooting.
- ✅ For critical external failures, consider rethrowing the exception or escalating it to a higher-level handler if the system cannot recover gracefully (e.g., to an analytics or error reporting service).

```csharp
// Example: Using try-catch sparingly for file I/O, with graceful fallback and Editor break

public void SaveGame(GameData data)
{
    try
    {
        string json = JsonUtility.ToJson(data);
        File.WriteAllText(k_saveFilePath, json);
    }
    catch (IOException ioEx)
    {
        Debug.LogError($"[{GetType().Name}] IO error saving game: {ioEx}", this);
        ShowSaveErrorToPlayer();
    }
    catch (UnauthorizedAccessException uaEx)
    {
        Debug.LogError($"[{GetType().Name}] Access denied saving game: {uaEx}", this);
        ShowSaveErrorToPlayer();
    }
    catch (Exception ex)
    {
        Debug.LogError($"[{GetType().Name}] Unexpected error: {ex}", this);

#if UNITY_EDITOR
        Debug.Break();
#endif

        ShowSaveErrorToPlayer();
        // Optionally: rethrow or escalate if unrecoverable
    }
}
```

## Unity 中的设计模式
- ✅ Choose patterns pragmatically. Apply them when they solve a real problem or improve maintainability, not just for the sake of using a pattern.
- ⚠️ **Command pattern**: Consider for input handling, undo/redo, and action history systems.
- ⚠️ **Observer pattern** (or C# events): Consider for decoupling systems, such as UI updates or reacting to game events.
- ⚠️ **State pattern**: Consider for complex character controllers, AI, or UI flows where objects change behavior based on state.
- ⚠️ **Factory pattern**: Consider for flexible and centralized object creation (e.g., spawning enemies, projectiles).
- ⚠️ **Singleton pattern**: Consider sparingly for global managers (e.g., AudioManager), but avoid overuse as it can lead to tight coupling. Some prefer Dependency Injection for better testability.
- ✅ Use **Object Pooling** pattern for frequently spawned/despawned objects to improve performance and reduce garbage collection.
- ⚠️ **Strategy pattern**: Consider for interchangeable behaviors (e.g., different movement or attack types).
- ⚠️ **Service Locator / Dependency Injection**: Consider for managing cross-cutting services and improving testability.
- ✅ Use enums for mutually exclusive states (e.g., animation, movement, UI, or game phases).


### 实现状态模式
- ✅ Use the State pattern for complex state-dependent behavior, such as character controllers or AI.

```csharp
// Example of State Pattern for a character controller
public class PlayerController : MonoBehaviour
{
    private PlayerState m_currentState;

    // State references
    private IdleState m_idleState;
    private RunningState m_runningState;
    private JumpingState m_jumpingState;

    private void Awake()
    {
        // Initialize states
        m_idleState = new IdleState(this);
        m_runningState = new RunningState(this);
        m_jumpingState = new JumpingState(this);

        // Set default state
        m_currentState = m_idleState;
    }

    private void Update()
    {
        // Let the current state handle the update
        m_currentState.Update();
    }

    public void ChangeState(PlayerState newState)
    {
        m_currentState.Exit();
        m_currentState = newState;
        m_currentState.Enter();
    }
}

// Base state class
public abstract class PlayerState
{
    protected PlayerController m_controller;

    public PlayerState(PlayerController controller)
    {
        m_controller = controller;
    }

    public abstract void Enter();
    public abstract void Update();
    public abstract void Exit();
}
```

### 对象池
- ✅ Use object pooling for frequently spawned and destroyed objects (e.g., bullets, enemies, particle effects) to reduce runtime allocations and improve performance.
- ✅ Prefer Unity’s built-in pooling APIs (e.g., UnityEngine.Pool.ObjectPool<T>) in Unity 6 and later, rather than implementing custom pooling logic.
- ✅ Initialize pools at scene load or on demand, and pre-warm with a reasonable number of objects to avoid spikes during gameplay.
- ✅ Always reset pooled objects’ state (position, rotation, active state, etc.) before reusing them.
- ✅ Return objects to the pool instead of destroying them; never use Destroy() on pooled objects except during cleanup.
- ✅ Use clear, descriptive method names like GetFromPool() and ReturnToPool() for pool operations.
- ✅ Keep pool management logic encapsulated—don’t expose pool internals to consumers.
- ✅ Use [DisallowMultipleComponent] and [RequireComponent] as needed to enforce correct usage on pooled objects.
- ❌ Avoid pooling objects with complex or persistent state that is hard to reset.

```csharp
// Example: Using Unity's built-in ObjectPool<T>
using UnityEngine.Pool;

public class BulletPool : MonoBehaviour
{
    [SerializeField] private Bullet m_bulletPrefab;
    private ObjectPool<Bullet> m_pool;

    private void Awake()
    {
        m_pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(m_bulletPrefab),
            actionOnGet: bullet => bullet.gameObject.SetActive(true),
            actionOnRelease: bullet => bullet.gameObject.SetActive(false),
            actionOnDestroy: bullet => Destroy(bullet.gameObject),
            collectionCheck: false,
            defaultCapacity: 20,
            maxSize: 100
        );
    }

    public Bullet GetFromPool()
    {
        return m_pool.Get();
    }

    public void ReturnToPool(Bullet bullet)
    {
        m_pool.Release(bullet);
    }
}
```


# UI Toolkit

## UI Toolkit 文件命名与组织
- ✅ Use PascalCase for UXML filenames to align with Unity conventions and maintain consistency with class and script naming (e.g., `MainMenu.uxml`, `InventoryPanel.uxml`, `SettingsPanel.uxml`, `PlayerHUD.uxml`).
- ✅ Organize UXML and USS files in a consistent folder structure (e.g., Assets/UI/UXML/ and Assets/UI/USS/).
- ✅ Name USS files to match their corresponding UXML files for easy association (e.g., `MainMenu.uss` for `MainMenu.uxml`).

## UXML
- ✅ Use BEM (Block-Element-Modifier) for name and class values to improve maintainability, readability, and consistency between code and style and why it's widely considered a best practice standard
- ✅ Prefer kebab-case for UXML name and class strings (e.g., navbar-menu, shop-button).
- ✅ Use name for unique identifiers (e.g., elements you query in C#) and class for reusable styles or shared behavior.
- ✅ Keep name unique within it's block to improve query performance when using .Q() or .Query() from C#.
- ✅ Avoid overloading a single element with many unrelated classes; keep classes purposeful and focused.
- ✅ Group related elements inside a top-level block container to make queries and styling predictable.
- ✅ For nested blocks, use the parent block name as a prefix for child blocks (e.g., navbar-menu__dropdown).
- ✅ Add accessibility attributes (e.g., aria-label) to UXML elements where applicable.

**BEM refresher:**
- ℹ️ Pattern: `block-name__element-name--modifier-name`
    - ℹ️ Block: standalone component that is meaningful on it's own (e.g., `navbar-menu`, `sidebar`, `login-form`)
    - ℹ️ Element: part of a block that has no standalone meaning and is semantically tied to it's block (e.g., `__item`, `__button`, `__input-field`)
    - ℹ️ Modifier: a flag on a block or element used to change appearance or behavior (e.g., `--active`, `--collapsed`, `--error`)
- ℹ️ Parts joined by `__` (element) and `--` (modifier)
- ℹ️ Examples: `menu__home-button`, `menu__shop-button`, `navbar-menu__shop-button--small`, `button--primary`

**Examples**
- These follow the BEM (Block-Element-Modifier) standard, ensuring clarity, structure, and maintainability.

  ***Block Names***: should clearly describe the purpose or role of the block within the UI and be suitable for grouping related elements
    - ✅ `navbar-menu`(easy to identify navigation menu block)
    - ✅ `sidebar`
    - ✅ `login-form`
    - ❌ `menu` (too generic, lacks context)
    - ❌ `navBarMenu` (camelCase instead of kebab-case)
    - ❌ `navbar_menu` (uses underscores instead of dashes)

  ***Element Names***: should describe the specific part of the block they belong to, maintaining a clear relationship to the block
    - ✅ `navbar-menu__item`
    - ✅ `sidebar__toggle-button`
    - ✅ `login-form__input-field`
    - ❌ `navbar-item` (missing the block reference, should be `navbar-menu__item`)
    - ❌ `sidebar-button` (missing the block reference, should be `sidebar__button`)
    - ❌ `login-form-input` (missing the __ for the element, should be `login-form__input`)

  ***Modifier Names***: should indicate variations or states of blocks or elements
    - ✅ `navbar-menu__item--active`
    - ✅ `sidebar__toggle-button--collapsed`
    - ✅ `login-form__input-field--error`
    - ❌ `navbar-menu__item-active` (missing `--` for the modifier, should be `navbar-menu__item--active`)
    - ❌ `sidebar__toggleButton--collapsed` (camelCase instead of kebab-case)
    - ❌ `login-form__input-field_error` (uses underscores instead of -- for the modifier)

**Example (UXML)**
```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements">
  <!-- Block container -->
  <ui:VisualElement name="navbar-menu" class="navbar-menu">
    <!-- Element: a specific button inside the block -->
    <ui:Button name="navbar-menu__shop-button" class="navbar-menu__shop-button button button--primary" aria-label="Shop">
      <ui:Button.text>Shop</ui:Button.text>
    </ui:Button>
    <!-- Variant via modifier -->
    <ui:Button name="navbar-menu__shop-button--small" class="navbar-menu__shop-button navbar-menu__shop-button--small button button--small" aria-label="Shop (Small)">
      <ui:Button.text>Shop</ui:Button.text>
    </ui:Button>
  </ui:VisualElement>
</ui:UXML>
```

**Querying from C#***
```csharp
// Centralize selectors as constants to avoid typos
public static class UiSelectors
{
    public const string NavbarMenu = "navbar-menu"; // block
    public const string ShopButton = "navbar-menu__shop-button"; // element
    public const string ShopButtonSmall = "navbar-menu__shop-button--small"; // modifier
}

// Usage in a MonoBehaviour or UI controller
var root = GetComponent<UIDocument>().rootVisualElement;
var navbar = root.Q<VisualElement>(UiSelectors.NavbarMenu);
var shopButton = root.Q<Button>(UiSelectors.ShopButton);
shopButton.clicked += OnShopClicked;
```

## USS
**Guidelines**
- ✅ Make sure not confuse CSS with USS. USS is a subset of CSS with Unity-specific properties and limitations. Refer to the [Unity USS documentation](https://docs.unity3d.com/Manual/UIE-USS.html) for supported features.
- ✅ Use **kebab-case** for class names. prefer **BEM** to encode structure and variants.
- ✅ 保持选择器**扁平且具体**：优先使用 `.block__element` 而不是深层后代链。
- ✅ Use **modifiers** as additive classes (e.g., `.button--small`) instead of redefining the base element.
- ✅ Keep **state** styles separate via state classes (e.g., `.is-selected`, `.is-disabled`) or use built-in pseudo-classes when available.
- ✅ Define **design tokens** (colors, spacing, sizes) as USS variables at the root when possible.
- ✅ Do keep class names short, descriptive, and BEM-aligned.
- ✅ Do centralize string constants used in code to avoid typos.
- ❌ Don’t rely on deep descendant selectors (e.g., `.a .b .c`) — they become brittle.
- ❌ Don’t mix unrelated concerns in one class; compose via multiple small classes instead.

**Example (USS)**
```css
/* Block base */
.navbar-menu { padding: 8px; gap: 8px; }

/* Element base */
.navbar-menu__shop-button { min-width: 120px; }

/* Modifier */
.navbar-menu__shop-button--small { min-width: 80px; }

/* Generic button system using BEM-like modifiers */
.button { height: 32px; padding-left: 12px; padding-right: 12px; }
.button--primary { background-color: rgb(40, 120, 240); color: white; }
.button--small { height: 24px; font-size: 11px; }

/* State classes (add/remove from C#) */
.is-selected { outline-color: rgb(255, 200, 0); outline-width: 2px; outline-style: solid; }
.is-disabled { opacity: 0.5; }
```

**Toggling classes from C#**
```csharp
// Toggle modifiers and state via classList
var btn = root.Q<Button>(UiSelectors.ShopButton);
btn.classList.Add("button--primary");

// Set a state
btn.classList.Toggle("is-selected", true);

// Switch to a different size variant
btn.classList.Remove("navbar-menu__shop-button--small");
btn.classList.Add("button--small");
```

### UI Toolkit 事件处理
```csharp
// Proper UI Toolkit event registration
private void OnEnable()
{
   m_button.clicked += OnButtonClicked;
   m_dropdown.RegisterValueChangedCallback(OnDropdownChanged);
}


private void OnDisable()
{
   m_button.clicked -= OnButtonClicked;
   m_dropdown.UnregisterValueChangedCallback(OnDropdownChanged);
}
```
