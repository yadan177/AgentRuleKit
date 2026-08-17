# 13 - React 组件规则

> - 🟢 本文件适用于 React 组件设计（useEffect 依赖/状态位置/Props/z-index）。
> - 🔴 不适用：业务逻辑实现、UI 样式设计、其他框架（Vue / Angular）

---

## 1. 🔴 硬约束 · 这些绝对不要写

### 1.1 useEffect 依赖数组漏写 / 多余写

```jsx
// ❌ 错误1：漏依赖,闭包拿到旧值,bug
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1); // count 永远是 0,因为闭包
    }, 1000);
    return () => clearInterval(interval);
  }, []); // 💥 漏了 count 依赖！

  return <div>{count}</div>; // 永远是 1,不涨
}

// ❌ 错误2：多余依赖,无限循环
function Search() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);

  const fetchData = () => {
    api.search(keyword).then(setResults);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]); // 💥 fetchData 每次渲染都是新函数,Effect 无限执行！

  // ...
}

// ✅ 正确1：函数式更新,不需要依赖
function Counter2() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1); // 用函数式更新,不依赖外部 count
    }, 1000);
    return () => clearInterval(interval);
  }, []); // ✅ 空依赖数组,正确

  return <div>{count}</div>;
}

// ✅ 正确2：把函数放到 Effect 里面,或者用 useCallback
function Search2() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // 把函数移到 Effect 里面,依赖就清晰了
    const fetchData = () => {
      api.search(keyword).then(setResults);
    };
    fetchData();
  }, [keyword]); // ✅ 只有 keyword 依赖,正确
}
```

> 📌 规则：
> - **依赖数组里的变量，必须在 Effect 里用到**
> - **Effect 里用到的变量，必须在依赖数组里**
> - ESLint `react-hooks/exhaustive-deps` 报错时先确认同步边界，不要为消除提示随意关闭
> - 需要函数式更新能解决的，就不要往依赖数组里加东西

---

### 1.2 把 useEffect 当万能胶水（不该用的 5 种场景

```jsx
// ❌ 错误1：数据转换不需要 useEffect
function UserList({ users }) {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    // 💥 完全不需要！每次渲染先 set 一下,多一次重渲染
    setActiveUsers(users.filter(u => u.active));
  }, [users]);

  // ✅ 正确：直接 render 时计算,或者用 useMemo
  const renderedActiveUsers = useMemo(
    () => users.filter(u => u.active),
    [users]
  );
}

// ❌ 错误2：事件处理不需要 useEffect
function Form() {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      // 💥 提交逻辑为什么要放到 Effect 里？绕了一圈
      api.submit(value);
      setSubmitted(false);
    }
  }, [submitted, value]);

  return (
    <button onClick={() => setSubmitted(true)}>
      Submit
    </button>
  );

  // ✅ 正确：直接写到事件处理函数里
  const handleSubmit = () => {
    api.submit(value);
  };

  return <button onClick={handleSubmit}>Submit</button>;
}

// ❌ 错误3：父子通信不需要 useEffect
function Parent() {
  const [data, setData] = useState(null);
  return <Child data={data} onReady={() => console.log('ready')} />;
}
function Child({ data, onReady }) {
  useEffect(() => {
    if (data) {
      // 💥 为什么要等渲染完再回调？渲染和回调绑定在一起了
      onReady();
    }
  }, [data, onReady]);

  // ✅ 正确：放到获取数据的地方直接调用
}

// ❌ 错误4：在 render 阶段执行应用级初始化
function App() {
  initApp(); // render 可能重试或被丢弃，不能在这里产生外部副作用
  return <MainRoutes />;
}

// ✅ 应用级初始化放在 React 根渲染之前；组件级外部同步则使用可清理的 Effect
async function startApplication() {
  await initApp();
  createRoot(document.getElementById('root')).render(<App />);
}
void startApplication();

// ❌ 错误5：状态同步不需要 useEffect
function Parent({ value }) {
  return <Child parentValue={value} />;
}
function Child({ parentValue }) {
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    // 💥 为什么要等渲染完再同步？多一次重渲染
    setLocalValue(parentValue);
  }, [parentValue]);

  // ✅ 正确：直接用,不需要本地状态同步,或者用 key 重置
  // const localValue = parentValue;
}
```

> 📌 规则：
> - `useEffect` 用于让组件与外部系统同步，例如订阅、浏览器 API 或项目既有请求生命周期。
> - 纯数据转换和由用户动作直接触发的逻辑通常放在 render 或事件处理器中。
> - 状态同步是否需要 Effect 取决于外部系统、受控/非受控边界和重置语义，不能只按类别绝对禁止。

---

### 1.3 组件 Props 传巨型对象（上帝对象）

```jsx
// ❌ 错误：传整个 user 对象进去,组件依赖了根本用不到的字段
function UserAvatar({ user }) {
  // 组件只用到 avatar 和 name,但是依赖了整个 user 对象
  // user 任何字段变了,这个组件都会重渲染
  return <img src={user.avatar} alt={user.name} />;
}

// 调用方传了一堆没用的
<UserAvatar user={user} /> // user 里有 20 个字段,组件只用到 2 个

// ✅ 正确：只传用到的字段,依赖清晰,重渲染可控
function UserAvatar({ avatar, name }) {
  // 只依赖这两个字段,其他字段变了不影响
  return <img src={avatar} alt={name} />;
}

// 调用方明确传什么
<UserAvatar avatar={user.avatar} name={user.name} />
```

> 📌 规则：
> - **Props 最小化原则：只传组件真正用到的字段**
> - 不要传"以后可能会用到"的东西
> - 不要传整个 store / 整个大对象

---

### 1.4 状态放错地方（状态提升过度 / 提升不够）

```jsx
// ❌ 错误1：状态提得太高,整个 App 都能改
function App() {
  // 💥 搜索框状态只有 Search 组件用,为什么放到最顶层？
  const [searchKeyword, setSearchKeyword] = useState('');

  return (
    <div>
      <Header />
      <Search
        keyword={searchKeyword}
        onKeywordChange={setSearchKeyword}
      />
      <Content />
      <Footer />
    </div>
  );
}

// ✅ 正确：状态离使用的地方最近
function Search() {
  // 只有 Search 用,就放在 Search 里面
  const [keyword, setKeyword] = useState('');
}

// ❌ 错误2：状态提升不够,兄弟组件通信绕死
function Parent() {
  return (
    <div>
      <Filter /> {/* 在这里选筛选条件 */}
      <List />   {/* 在这里用筛选条件请求数据 */}
      {/* 两个组件需要通信,但状态各自在自己里面 */}
    </div>
  );
}

// ✅ 正确：提升到共同父组件
function Parent() {
  // 两个兄弟组件都要用,就放在父组件
  const [filter, setFilter] = useState({});
  return (
    <div>
      <Filter filter={filter} onFilterChange={setFilter} />
      <List filter={filter} />
    </div>
  );
}
```

> 📌 规则：
> - **状态放在离使用最近的公共祖先**
> - 只有一个组件用，就放组件里
> - 父子都用，放父组件
> - 兄弟都用，放共同父组件
> - 全局才用，放全局（Context/Zustand/Redux）
> - 默认不要什么都放全局

---

### 1.5 组件承担过多职责

```jsx
// ❌ 错误：一个文件 500 行,数据获取、状态管理、渲染、事件处理全在一起
function OrderPage() {
  // 50 行 state 定义
  // 3 个 useEffect 发请求
  // 10 个事件处理函数
  // 5 个工具函数
  // 8 个条件渲染分支
  // return 里 100 行 JSX,嵌套 5 层
  // = 没人敢改
}

// ✅ 正确：按职责拆分
// hooks/useOrderData.js - 只负责拿数据
function useOrderData(orderId) {
  const [loading, data, error] = ......;
  return { loading, data, error };
}

// components/OrderList.js - 只负责渲染列表
function OrderList({ orders, onItemClick }) { ... }

// components/OrderFilter.js - 只负责筛选
function OrderFilter({ filter, onFilterChange }) { ... }

// OrderPage.js 只做组装
function OrderPage() {
  const { loading, data, error } = useOrderData(orderId);
  const [filter, setFilter] = useState({});

  if (loading) return <Loading />;
  if (error) return <Error />;

  return (
    <div>
      <OrderFilter filter={filter} onFilterChange={setFilter} />
      <OrderList
        orders={filterOrders(data.orders, filter)}
        onItemClick={handleItemClick}
      />
    </div>
  );
}
```

> 📌 规则：
> - 行数、Effect 数和 JSX 层级只是审查信号，不作为固定门禁。
> - 当数据获取、状态机、事件和多块独立 UI 难以分别理解或测试时，再按职责拆分 Hook 与子组件。
> - 一个组件只做一件事

---

### 1.6 列表没有 key / 索引用 key

```jsx
const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];

// ❌ 错误1：没 key
items.map(item => <li>{item.name}</li>); // React 直接警告,重排性能爆炸

// ❌ 错误2：索引用 key,顺序变了就全乱
items.map((item, index) => <li key={index}>{item.name}</li>);
// 数组重排、插入、删除,key 没变但是对应不上,状态全乱

// ✅ 正确：用业务唯一 ID 当 key
items.map(item => <li key={item.id}>{item.name}</li>);
```

> 📌 规则：
> - map 必须有 key
> - key 在同级列表中必须稳定且唯一，优先使用数据自身 ID。
> - 列表会插入、删除、排序或子项持有状态时，不得使用数组索引；静态且永不重排、没有稳定 ID 的展示列表可以使用索引，但应确认这些前提。

## 2. 🟡 推荐 · 这些写法尽量避免

### 2.7 嵌套三元超过 3 层

```jsx
// ❌ 错误：嵌套三元,根本读不懂
return (
  <div>
    {loading
      ? error
        ? <Error />
        : data
          ? <List data={data} />
          : <Empty />
      : <Loading />
    }
  </div>
);

// ✅ 正确：提前 return,扁平化
if (loading) return <Loading />;
if (error) return <Error />;
if (!data) return <Empty />;
return <List data={data} />;
```

---

### 2.8 useState 初始化传函数（懒初始化）

```jsx
// ❌ 错误：每次渲染都会执行 expensiveCompute
const [value, setValue] = useState(expensiveCompute(props.data)); // 💥 每次渲染都算

// ✅ 正确：传函数,只执行一次
const [value, setValue] = useState(() => expensiveCompute(props.data)); // 只初始化时算一次
```

> 📌 初始化如果是重计算，一定要用函数式初始化

---

### 2.9 自定义 Hook 命名不以 use 开头

```jsx
// ❌ 错误：不是 use 开头,React 不认,Hook 规则检查不了
function getUserId() {
  const { userId } = useContext(UserContext); // 💥 里面用了 Hook 但名字不对
  return userId;
}

// ✅ 正确：自定义 Hook 必须以 use 开头
function useUserId() {
  const { userId } = useContext(UserContext);
  return userId;
}
```

## 3. 状态管理决策表

先检查项目已经采用的状态与数据方案。下表描述职责边界，不授权引入 Zustand、Jotai、React Query、SWR 或替换 Redux。

| 场景 | 用什么 | 不要用什么 |
|------|--------|-----------|
| 单个组件用 | useState | 别放全局 |
| 父子组件传 | Props 传 | 别放 Context |
| 兄弟组件用 | 提升到共同父组件 | 别放全局 |
| 很多地方都在用 | 项目已有全局状态方案 | 避免 Context + useState 无边界层层传递 |
| 复杂异步状态 / 服务端数据 | 项目已有请求缓存/服务端状态方案 | 避免每个组件重复实现请求状态机 |
| 全局表单状态 | 项目已有表单或状态方案 | 不因本表替换现有方案 |

## 4. React 组件自检

1. **明确 useEffect 边界**：只用于与组件外部系统同步，并保持依赖、取消和清理完整
2. **状态最小化**：能算出来的就不要存，能放组件里的就不放父组件，能放父组件的就不放全局
3. **Props 最小化**：只传真正用到的，别传大对象，别传"以后可能用得到"


> 本文件只列常见坑，不写完整 React 教程。遇到不确定的写法，先查 React 官方文档，不要猜。
