---
description: Unity 设计模式与 SOLID 原则实战指南
applyTo: "**/*.cs"
---

# Unity 设计模式指南

本指南介绍在 Unity 项目中常用的设计模式、架构原则与最佳实践，帮助写出可维护、可扩展、可测试的代码。

## 目录

- [SOLID 原则](#solid-原则)
  - [S - 单一职责原则 (SRP)](#s---单一职责原则-srp)
  - [O - 开闭原则 (OCP)](#o---开闭原则-ocp)
  - [L - 里氏替换原则 (LSP)](#l---里氏替换原则-lsp)
  - [I - 接口隔离原则 (ISP)](#i---接口隔离原则-isp)
  - [D - 依赖倒置原则 (DIP)](#d---依赖倒置原则-dip)
- [常用模式](#常用模式)
  - [单例 (Singleton)](#单例-singleton)
  - [对象池 (Object Pool)](#对象池-object-pool)
  - [状态模式 (State)](#状态模式-state)
  - [观察者 / 事件 (Observer / Event)](#观察者--事件-observer--event)
  - [命令模式 (Command)](#命令模式-command)
  - [策略模式 (Strategy)](#策略模式-strategy)
  - [MVC / MVVM 变体](#mvc--mvvm-变体)
- [架构模式](#架构模式)
  - [ScriptableObject 架构 (SOA)](#scriptableobject-架构-soa)
  - [MVC / MVVM](#mvc--mvvm)
  - [ECS (实体组件系统)](#ecs-实体组件系统)
- [代码异味与反模式](#代码异味与反模式)
- [推荐阅读](#推荐阅读)

---

## SOLID 原则

SOLID 是面向对象设计的五个核心原则。在 Unity 中合理应用，能让 MonoBehaviour、ScriptableObject 与系统类更易维护。

### S - 单一职责原则 (SRP)

**一个类应当只有**一个**引起它变化的原因。**

```csharp
// 不良 - 一个类承担多项职责
public class GameManager : MonoBehaviour
{
    public void SaveGame() { /* 保存 */ }
    public void LoadGame() { /* 加载 */ }
    public void UpdateUI() { /* UI 更新 */ }
    public void PlaySound() { /* 播放音效 */ }
}

// 良好 - 拆分为职责单一的类
public class SaveSystem { public void Save() { } }
public class LoadSystem { public void Load() { } }
public class UIController : MonoBehaviour { public void Refresh() { } }
public class AudioManager : MonoBehaviour { public void Play() { } }
```

> **Unity 实践提示**：把 MonoBehaviour 当作"视图+输入"，把业务逻辑放到普通 C# 类、ScriptableObject 或服务中。

### O - 开闭原则 (OCP)

**对扩展开放，对修改关闭。**

```csharp
// 不良 - 频繁修改 if/else 分支
public float CalculateDamage(string weaponType)
{
    if (weaponType == "Sword") return 10f;
    if (weaponType == "Bow") return 7f;
    if (weaponType == "Magic") return 15f;
    return 0f;
}

// 良好 - 通过多态扩展
public abstract class Weapon
{
    public abstract float CalculateDamage();
}

public class Sword : Weapon { public override float CalculateDamage() => 10f; }
public class Bow : Weapon { public override float CalculateDamage() => 7f; }
public class Magic : Weapon { public override float CalculateDamage() => 15f; }
```

### L - 里氏替换原则 (LSP)

**子类对象应当能够替换父类对象而不出错。**

```csharp
// 良好 - 遵循 LSP
public class Bird
{
    public virtual void Move() { Debug.Log("Move"); }
}

public class Sparrow : Bird
{
    public override void Move() { /* 飞行 */ }
}

// 不良 - 鸵鸟不能飞，子类改变父类行为
public class Ostrich : Bird
{
    public override void Move() { throw new System.NotImplementedException(); }
}

// 更好 - 重构层次结构
public abstract class Bird { public abstract void Move(); }
public abstract class FlyingBird : Bird { public abstract void Fly(); }
public class Ostrich : Bird { public override void Move() { /* 跑 */ } }
```

### I - 接口隔离原则 (ISP)

**客户端不应被迫依赖它们不用的接口。**

```csharp
// 不良 - 臃肿接口
public interface IUnit
{
    void Attack();
    void Heal();
    void CastSpell();
    void Gather();
}

// 良好 - 拆分小接口
public interface IAttacker { void Attack(); }
public interface IHealer { void Heal(); }
public interface ICaster { void CastSpell(); }
public interface IGatherer { void Gather(); }

public class Warrior : IAttacker { public void Attack() { } }
public class Priest : IHealer { public void Heal() { } }
```

### D - 依赖倒置原则 (DIP)

**高层模块不应依赖低层模块；二者都应依赖抽象。**

```csharp
// 不良 - 直接依赖具体类
public class Player
{
    private MySQLDatabase m_db = new MySQLDatabase();
}

// 良好 - 依赖抽象
public interface IDatabase
{
    void Save(string data);
}

public class Player
{
    private readonly IDatabase m_db;
    public Player(IDatabase db) { m_db = db; }
}
```

---

## 常用模式

### 单例 (Singleton)

**用途**：全局唯一且全局可访问的实例（AudioManager、GameManager 等）。

```csharp
// 通用 MonoBehaviour 单例基类
public class Singleton<T> : MonoBehaviour where T : MonoBehaviour
{
    private static T s_instance;
    public static T Instance
    {
        get
        {
            if (s_instance == null)
            {
                s_instance = FindObjectOfType<T>();
                if (s_instance == null)
                {
                    var go = new GameObject(typeof(T).Name);
                    s_instance = go.AddComponent<T>();
                }
            }
            return s_instance;
        }
    }

    protected virtual void Awake()
    {
        if (s_instance != null && s_instance != this)
        {
            Destroy(gameObject);
            return;
        }
        s_instance = this;
    }
}

// 使用
public class GameManager : Singleton<GameManager>
{
    public void StartGame() { /* ... */ }
}

// 调用
GameManager.Instance.StartGame();
```

> ⚠️ **慎用**：单例会导致紧耦合、可测性差。优先用 ScriptableObject 注入或依赖注入。

### 对象池 (Object Pool)

**用途**：避免频繁实例化/销毁带来的 GC 压力（子弹、特效、敌人）。

```csharp
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

    public Bullet GetBullet() => m_pool.Get();
    public void ReturnBullet(Bullet bullet) => m_pool.Release(bullet);
}
```

### 状态模式 (State)

**用途**：对象行为随状态变化（角色控制器、AI、UI 流程）。

```csharp
public interface IPlayerState
{
    void Enter();
    void Update();
    void Exit();
}

public class PlayerController : MonoBehaviour
{
    private IPlayerState m_currentState;

    public void ChangeState(IPlayerState newState)
    {
        m_currentState?.Exit();
        m_currentState = newState;
        m_currentState.Enter();
    }

    private void Update() => m_currentState?.Update();
}

public class IdleState : IPlayerState
{
    private readonly PlayerController m_controller;
    public IdleState(PlayerController c) { m_controller = c; }
    public void Enter() { /* 播放 idle 动画 */ }
    public void Update() { /* 检查输入，必要时 ChangeState(new RunningState(...)) */ }
    public void Exit() { }
}
```

### 观察者 / 事件 (Observer / Event)

**用途**：解耦事件发布者与订阅者。

```csharp
public class Player : MonoBehaviour
{
    public event System.Action<int> OnHealthChanged;
    private int m_health = 100;

    public void TakeDamage(int amount)
    {
        m_health -= amount;
        OnHealthChanged?.Invoke(m_health);
    }
}

public class HealthBar : MonoBehaviour
{
    [SerializeField] private Player m_player;
    private void OnEnable() { m_player.OnHealthChanged += UpdateBar; }
    private void OnDisable() { m_player.OnHealthChanged -= UpdateBar; }
    private void UpdateBar(int health) { /* 更新 UI */ }
}
```

### 命令模式 (Command)

**用途**：输入处理、撤销/重做、操作记录。

```csharp
public interface ICommand
{
    void Execute();
    void Undo();
}

public class MoveCommand : ICommand
{
    private readonly Transform m_target;
    private readonly Vector3 m_offset;
    public MoveCommand(Transform t, Vector3 offset) { m_target = t; m_offset = offset; }
    public void Execute() => m_target.position += m_offset;
    public void Undo() => m_target.position -= m_offset;
}

public class InputController : MonoBehaviour
{
    private readonly Stack<ICommand> m_history = new Stack<ICommand>();

    public void ExecuteCommand(ICommand cmd)
    {
        cmd.Execute();
        m_history.Push(cmd);
    }

    public void Undo()
    {
        if (m_history.Count > 0) m_history.Pop().Undo();
    }
}
```

### 策略模式 (Strategy)

**用途**：可互换的算法（不同的移动方式、不同的攻击方式）。

```csharp
public interface IMovementStrategy
{
    void Move(Transform target, Vector3 direction);
}

public class WalkStrategy : IMovementStrategy
{
    public void Move(Transform t, Vector3 d) => t.position += d * 5f * Time.deltaTime;
}

public class FlyStrategy : IMovementStrategy
{
    public void Move(Transform t, Vector3 d) => t.position += d * 8f * Time.deltaTime;
}

public class Enemy : MonoBehaviour
{
    private IMovementStrategy m_movement;
    public void SetMovement(IMovementStrategy s) => m_movement = s;
    private void Update() => m_movement.Move(transform, Vector3.forward);
}
```

### MVC / MVVM 变体

Unity 没有官方的 MVC/MVVM 框架，但社区已有成熟实践：
- **Model**：纯 C# 类或 ScriptableObject（数据 + 业务规则）
- **View**：MonoBehaviour（仅负责显示、UI Toolkit、动画）
- **Controller / ViewModel**：MonoBehaviour 或普通类（处理输入、订阅 Model 变化、更新 View）

```csharp
// Model
public class PlayerData
{
    public int Health { get; set; }
    public event System.Action<int> OnHealthChanged;
    public void TakeDamage(int amount)
    {
        Health -= amount;
        OnHealthChanged?.Invoke(Health);
    }
}

// View
public class HealthBarView : MonoBehaviour
{
    [SerializeField] private PlayerData m_data;
    private void OnEnable() { m_data.OnHealthChanged += Refresh; }
    private void OnDisable() { m_data.OnHealthChanged -= Refresh; }
    private void Refresh(int health) { /* 调整 UI */ }
}
```

---

## 架构模式

### ScriptableObject 架构 (SOA)

**把可变状态、配置、共享数据抽到 ScriptableObject 中**，多个 MonoBehaviour 通过引用共享。

```csharp
[CreateAssetMenu(fileName = "GameSettings", menuName = "Game/Settings")]
public class GameSettings : ScriptableObject
{
    public float PlayerSpeed = 5f;
    public int MaxLevel = 50;
    public bool EnableDebugMode = false;
}

public class Player : MonoBehaviour
{
    [SerializeField] private GameSettings m_settings;
    private void Update()
    {
        transform.position += Vector3.forward * m_settings.PlayerSpeed * Time.deltaTime;
    }
}
```

> **好处**：美术/策划可直接在 Inspector 调参；多个系统可共享同一份配置。

### MVC / MVVM

详见上节。

### ECS (实体组件系统)

适用于**大量实体 + 重数据/重计算**（上千敌人、上万粒子）。Unity 提供了：
- **DOTS / Entities**：纯数据导向，最大性能。
- **社区轻量 ECS**：如 Entitas。

```csharp
// Unity DOTS 示例（简略）
public struct Position : IComponentData
{
    public float3 Value;
}

public class MoveSystem : ISystem
{
    public void OnUpdate(ref SystemState state)
    {
        foreach (var (transform, pos) in
                 SystemAPI.Query<RefRO<LocalTransform>, RefRW<Position>>())
        {
            /* 更新位置 */
        }
    }
}
```

> ⚠️ **注意**：DOTS 学习曲线较陡，UI/动画/物理的成熟度仍不及传统 MonoBehaviour 工作流，建议在性能关键子系统中引入，而不是全盘替换。

---

## 代码异味与反模式

- ❌ **巨型 MonoBehaviour**：在一个类中塞入所有逻辑。拆分为多个组件。
- ❌ **FindObjectOfType 每帧调用**：缓存引用或使用 [SerializeField]。
- ❌ **协程滥用**：优先用 Unity 6 的 `Awaitable`。
- ❌ **public 字段满天飞**：使用 [SerializeField] private + 属性。
- ❌ **事件未取消订阅**：导致内存泄漏与 NRE。
- ❌ **静态可变状态滥用**：破坏多场景/多存档可重入。
- ❌ **未使用对象池**：频繁 Instantiate/Destroy。
- ❌ **Update 中 new**：每帧分配。
- ❌ **不写空检查**：尤其是 Camera.main、Rigidbody、Renderer。

---

## 推荐阅读

- [Refactoring Guru - 设计模式](https://refactoringguru.cn/design-patterns)
- [Game Programming Patterns（中文版）](https://game-programming-patterns-cn.com/)
- [Unity 官方 - DOTS / Entities 文档](https://docs.unity3d.com/Packages/com.unity.entities@latest)
- [Catlike Coding - 教程合集](https://catlikecoding.com/)
