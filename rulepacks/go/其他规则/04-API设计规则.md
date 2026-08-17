# 04 - Go API 设计规则

> - 🟢 本文件适用于 **HTTP REST API** 和 **gRPC API** 的设计与修改
> - 🔴 **不适用**：内部 Go 包之间的函数签名（见 [01-代码编写规则](01-代码编写规则.md) 和 [02-模式设计](02-模式设计.md)）

---

## 1. 路径与方法

### 1.1 REST 风格路由命名

🔴 必加约束

```text
GET    /api/v1/users          # 列表
GET    /api/v1/users/{id}     # 详情
POST   /api/v1/users          # 创建
PUT    /api/v1/users/{id}     # 全量更新
PATCH  /api/v1/users/{id}     # 部分更新
DELETE /api/v1/users/{id}     # 删除
```

**规则**：

| 规则 | 说明 |
|---|---|
| **全部小写**，单词用连字符 `-` 分隔 | `/user-orders`，不用 `/userOrders` 或 `/user_orders` |
| **名词复数**（资源集合） | `/users` 而非 `/user` |
| **不用动词** | `/createUser` → `POST /users` |
| **层级不超过 3 层** | `/users/{id}/orders/{oid}/items` → 拆为 `/orders?user_id={id}` |
| **不要在路径中放操作名** | `/users/activate` → `POST /users/{id}/activate` 勉强可以，但更好的设计是 `PATCH /users/{id}` + `{"status":"active"}` |
| **查询参数用于过滤/排序/分页** | `GET /users?status=active&page=2&size=20` |

```text
// 反例
POST /createUser
GET  /getUserById?id=123
GET  /users/123/orders/456/items/789

// 正例
POST /users
GET  /users/123
GET  /items?order_id=456
```

### 1.2 RPC 风格路由

🟡 项目既有协议采用 RPC 风格，或新接口经契约评审确认不适合资源语义时，可以使用动作型路由；不得仅因接口是内部调用或非 CRUD 就自动改成 RPC/gRPC。

```text
POST /api/v1/rpc/send-email
POST /api/v1/rpc/export-report
POST /api/v1/rpc/batch-update-status
```

**REST、RPC 与 gRPC 的选择依据**：

| 场景 | 决策要求 |
|---|---|
| 资源 CRUD（用户、订单、商品） | 可评估 REST，并沿用现有路径、版本和错误契约 |
| 操作/动作（发邮件、导出、转账） | 可使用资源子路径、命令资源或 RPC；以幂等、审计和既有协议为准 |
| 内部服务间调用 | 沿用现有 HTTP、gRPC、消息或其他协议；不能默认引入 gRPC |
| 前端 BFF 层 | 以调用方契约、聚合需求、缓存和现有网关能力决定，不预设混合模式 |

### 1.3 HTTP 方法语义

🔴 必加约束

| 方法 | 语义 | 幂等性 | 安全（不修改资源） |
|---|---|---|---|
| `GET` | 读取 | ✅ 是 | ✅ 是 |
| `POST` | 创建 | ❌ 否 | ❌ 否 |
| `PUT` | 全量替换 | ✅ 是 | ❌ 否 |
| `PATCH` | 部分更新 | 取决于补丁语义 | ❌ 否 |
| `DELETE` | 删除 | ✅ 是 | ❌ 否 |

- **GET 请求绝不修改资源**——这是 HTTP 规范的基本约束，违反会导致缓存、爬虫、重试产生副作用
- **GET 请求参数通常放 query string**。`net/http` 可以读取 GET body，但中间代理、缓存和客户端支持不一致，除非既有协议明确约定，否则不要依赖 GET body。
- **PUT 必须传完整资源**（全量替换）；**PATCH 传部分字段**（部分更新）

```go
// 反例：GET 修改资源
GET /users/123?action=delete

// 正例
DELETE /users/123
```

## 2. 请求与响应结构

### 2.1 JSON 字段命名

🔴 必加约束

| 规则 | 示例 |
|---|---|
| **camelCase**（小驼峰） | `"firstName"`、`"createdAt"` |
| **不缩写**（除非是通用缩写如 ID/URL） | `"pageSize"` 而非 `"pgSz"` |
| **时间字段用 RFC3339** | `"createdAt": "2024-01-15T10:30:00Z"` |
| **布尔字段不要 `is` 前缀** | `"active"` 而非 `"isActive"`（JSON 层面） |
| **枚举用字符串**，不用数字 | `"status": "active"` 而非 `"status": 1` |

```go
// 反例
type User struct {
    UserId       int    `json:"user_id"`       // snake_case
    IsActivated  bool   `json:"is_activated"`  // is_ 前缀
    CreatedAt    int64  `json:"created_at"`    // Unix 时间戳，不是 RFC3339
    UserStatus   int    `json:"user_status"`   // 数字枚举
}

// 正例
type User struct {
    ID        int       `json:"id"`
    Activated bool      `json:"activated"`
    CreatedAt time.Time `json:"createdAt"`
    Status    string    `json:"status"` // "active" | "inactive" | "suspended"
}
```

> 源材料：序列化结构体使用字段标签.md

### 2.2 `omitempty` 规则

🔴 必加约束

| 字段类型 | omitempty 行为 | 建议 |
|---|---|---|
| `string` | 省略空字符串 | ✅ 默认加 `omitempty` |
| `int` / `float` | 省略 0 | ⚠️ 小心：0 可能是合法值 |
| `bool` | 省略 false | ⚠️ 小心：false 可能是合法值 |
| `time.Time` | 传统 `encoding/json` 下零值 struct 不会仅因 `omitempty` 被省略 | 按 Go 版本评估 `omitzero`、指针或自定义类型 |
| 指针类型 `*T` | 省略 nil | 可区分“未传”和“零值”，但也可使用可选类型或显式 presence 字段 |
| slice / map | nil 和长度为 0 的值都会被 `omitempty` 省略 | ⚠️ 契约可能要求 `[]` 或 `{}` |

```go
// 反例：count=0 是合法值但被 omitempty 省略了
type Config struct {
    Name  string `json:"name,omitempty"`
    Count int    `json:"count,omitempty"` // 0 会被省略！
}

// 正例：用指针区分"未传"和"零值"
type Config struct {
    Name  string `json:"name,omitempty"`
    Count *int   `json:"count,omitempty"` // nil → 省略；0 → 输出 0
}
```

**决策表**：

| 场景 | 标签 |
|---|---|
| 零值=未设置（字符串、时间） | `json:"field,omitempty"` |
| 零值是合法值（int/bool 可能是 0/false） | `json:"field"` 或用指针 + `omitempty` |
| 前端需要空数组而非 null | `json:"field"` + 初始化为 `make([]T, 0)` |

### 2.3 请求体设计

🔴 必加约束

```go
// 正例：请求体放 JSON body
type CreateUserRequest struct {
    Name  string `json:"name"`  // 必填
    Email string `json:"email"` // 必填
    Age   *int   `json:"age"`   // 可选
}
```

- **POST/PUT/PATCH 用 JSON body**，不用 form-urlencoded（除非是文件上传）
- **路径参数**放 URL 中，**业务参数**放 body 中
- **可选字段用指针** `*T` + `omitempty`（区分"未传"和"传了零值"）
- **请求体 ≤ 1MB**（在 handler 层拦截，返回 `413 Request Entity Too Large`）

```go
// handler 中限制请求体大小
func createUser(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB
    // ...
}
```

### 2.4 响应体设计

🔴 必加约束

```go
// 仅在既有接口契约采用响应信封时使用
type Response struct {
    Data  any    `json:"data,omitempty"`
    Error *APIError `json:"error,omitempty"`
}

// 列表响应
type ListResponse struct {
    Data       []User `json:"data"`
    TotalCount int    `json:"totalCount"`
    Page       int    `json:"page"`
    PageSize   int    `json:"pageSize"`
}
```

- 响应媒体类型、是否使用统一信封以及错误格式必须沿用协议；文件、流、空响应等不应强制包装为 JSON。
- 数据量可能增长且调用方需要遍历时提供分页；小型固定枚举和明确有界列表可以直接返回。
- 列表为空时返回 `null`、`[]`、省略字段或其他表示，必须沿用既有 API schema 和客户端契约；新契约应明确选择并加入序列化测试，不能由 Go 的 nil/空切片偶然状态决定。
- **响应体中不要泄露内部错误细节**（stack trace、SQL 语句、文件路径）

### 2.5 分页

🔴 必加约束

```text
GET /api/v1/users?page=1&page_size=20
```

| 参数 | 默认值 | 上限 |
|---|---|---|
| `page` | 1 | — |
| `page_size` | 20 | 100 |
| `sort` | `-createdAt`（倒序） | — |
| `cursor` | — | — |

```go
// 正例：标准分页参数
type Pagination struct {
    Page     int `json:"page"`     // 从 1 开始
    PageSize int `json:"pageSize"` // 默认 20，上限 100
}

// 偏移分页（传统）
type OffsetPagination struct {
    Offset int `json:"offset"` // 从 0 开始
    Limit  int `json:"limit"`  // 默认 20，上限 100
}

// 游标分页（大数据量，推荐）
type CursorPagination struct {
    Cursor string `json:"cursor"` // 上一页最后一条的游标
    Limit  int    `json:"limit"`  // 默认 20，上限 100
}
```

> **游标 vs 偏移**：是否采用游标应根据稳定排序键、翻页深度、数据变化频率、查询计划和产品跳页需求决定，不以固定条数作为切换门槛。

## 3. 错误返回格式

### 3.1 统一错误响应结构

🔴 必加约束

```json
{
    "error": {
        "code": "USER_NOT_FOUND",
        "message": "用户不存在",
        "requestId": "req_abc123"
    }
}
```

| 字段 | 说明 |
|---|---|
| `code` | **机器可读**错误码（大写蛇形，如 `USER_NOT_FOUND`）——前端 switch 用 |
| `message` | **人类可读**错误描述（中文或英文，看产品语言）——展示给用户 |
| `requestId` | 请求追踪 ID——方便排查问题（见 [07-日志调试规则](07-日志调试规则.md)） |

```go
// 正例：统一错误结构
type APIError struct {
    Code      string `json:"code"`
    Message   string `json:"message"`
    RequestID string `json:"requestId"`
}

func writeError(w http.ResponseWriter, statusCode int, apiErr APIError) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(Response{Error: &apiErr})
}
```

### 3.2 HTTP 状态码映射

🔴 必加约束

| HTTP 状态码 | 场景 | Go 常量 |
|---|---|---|
| `200 OK` | 成功（GET/PUT/PATCH/DELETE） | `http.StatusOK` |
| `201 Created` | 创建成功（POST） | `http.StatusCreated` |
| `204 No Content` | 删除成功，无响应体 | `http.StatusNoContent` |
| `400 Bad Request` | 请求参数格式错误、校验失败 | `http.StatusBadRequest` |
| `401 Unauthorized` | 未认证（缺少或无效的 token） | `http.StatusUnauthorized` |
| `403 Forbidden` | 已认证但无权限 | `http.StatusForbidden` |
| `404 Not Found` | 资源不存在 | `http.StatusNotFound` |
| `409 Conflict` | 资源冲突（如重复创建） | `http.StatusConflict` |
| `413 Payload Too Large` | 请求体过大 | `http.StatusRequestEntityTooLarge` |
| `422 Unprocessable Entity` | 参数语义错误（格式对但业务不合法） | `http.StatusUnprocessableEntity` |
| `429 Too Many Requests` | 频率限制 | `http.StatusTooManyRequests` |
| `500 Internal Server Error` | 服务端未知错误 | `http.StatusInternalServerError` |
| `503 Service Unavailable` | 服务暂时不可用 | `http.StatusServiceUnavailable` |

```go
// 反例：所有错误都返回 200
w.WriteHeader(http.StatusOK)
json.NewEncoder(w).Encode(map[string]string{"error": "user not found"})

// 正例：HTTP 状态码 + 统一错误体
w.WriteHeader(http.StatusNotFound)
json.NewEncoder(w).Encode(Response{
    Error: &APIError{
        Code:      "USER_NOT_FOUND",
        Message:   "用户不存在",
        RequestID: requestID,
    },
})
```

### 3.3 错误码命名规范

🟡 推荐

```text
// 格式：<资源>_<错误类型>
USER_NOT_FOUND
USER_ALREADY_EXISTS
ORDER_STATUS_INVALID
PERMISSION_DENIED
RATE_LIMIT_EXCEEDED
VALIDATION_ERROR
INTERNAL_ERROR
```

- 全部大写 + 下划线
- 按资源分类，便于前端统一处理
- 不要在 code 中拼接动态信息——动态信息放 message

### 3.4 不要暴露内部错误

🔴 必加约束

```go
// 反例：把内部错误直接返回给客户端
func getUser(w http.ResponseWriter, r *http.Request) {
    user, err := service.GetUser(r.Context(), id)
    if err != nil {
        writeError(w, http.StatusInternalServerError, APIError{
            Code:    "INTERNAL_ERROR",
            Message: err.Error(), // 可能包含 "dial tcp 10.0.0.1:5432: connection refused"
        })
        return
    }
}

// 正例：记录内部错误日志，返回通用消息给客户端
func getUser(w http.ResponseWriter, r *http.Request) {
    user, err := service.GetUser(r.Context(), id)
    if err != nil {
        slog.Error("get user failed", "error", err, "userId", id)
        writeError(w, http.StatusInternalServerError, APIError{
            Code:    "INTERNAL_ERROR",
            Message: "服务器内部错误，请稍后重试",
        })
        return
    }
}
```

## 4. 版本号策略

### 4.1 三种方案对比

🔴 对外 API 必须有明确的兼容与演进策略。路径、请求头或子域名版本是可选方案，不要求所有 API 从第一版起都在 URL 中暴露版本号；应沿用既有网关、客户端和契约约定。

| 方案 | 示例 | 优点 | 缺点 |
|---|---|---|---|
| **URL 路径**（推荐） | `/api/v1/users` | 直观、易路由、缓存友好 | URL 变长 |
| **请求头** | `Accept: application/vnd.api+json;version=1` | URL 干净 | 不直观、难以在浏览器中测试 |
| **子域名** | `v1.api.example.com/users` | 可独立部署不同版本 | 需要 DNS 配置、跨域问题 |

> URL 路径版本直观且易于路由，但会影响客户端地址、缓存和网关配置；是否采用由现有契约和发布策略决定。

### 4.2 版本号粒度

🟡 推荐

- **主版本号**（`v1`、`v2`）放在路径中——表示**不兼容的变更**
- **次版本号不用出现在 API 中**——新字段、新端点通过兼容方式添加
- **废弃（deprecation）**用 HTTP 响应头通知：

```go
w.Header().Set("Sunset", "Sat, 31 Dec 2025 23:59:59 GMT")
w.Header().Set("Deprecation", "true")
w.Header().Set("Link", `</api/v2/users>; rel="successor-version"`)
```

### 4.3 兼容性规则

🔴 必加约束

| 变更类型 | 是否兼容 | 是否需要新版本 |
|---|---|---|
| 新增端点 | ✅ 兼容 | 否 |
| 新增可选字段（响应） | ✅ 兼容 | 否 |
| 新增可选字段（请求） | ✅ 兼容 | 否 |
| 删除端点 | ❌ 不兼容 | 是（废弃 → 新版本删除） |
| 删除字段（响应） | ❌ 不兼容 | 是 |
| 修改字段类型 | ❌ 不兼容 | 是 |
| 修改字段含义 | ❌ 不兼容 | 是 |
| 修改错误码含义 | ❌ 不兼容 | 是 |
| 重新排序列表 | ⚠️ 可能不兼容 | 视情况 |

```go
// 正例：兼容扩展——新增字段，旧客户端忽略
type UserV1 struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

type UserV2 struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email,omitempty"` // v2 新增；兼容性取决于客户端是否容忍未知字段
}
```

## 5. 参数校验

### 5.1 校验在哪一层

🔴 必加约束

```
┌──────────────────────────────────────────────┐
│ handler 层（HTTP/gRPC）                       │
│ ├── 格式校验：类型是否正确、字段是否必填       │
│ ├── 范围校验：长度、大小、枚举值               │
│ └── 序列化/反序列化                           │
├──────────────────────────────────────────────┤
│ service 层（业务逻辑）                         │
│ ├── 业务规则校验：状态机、权限、业务约束       │
│ └── 跨字段校验：A=1 时 B 必填                 │
├──────────────────────────────────────────────┤
│ repository 层（数据访问）                      │
│ └── 数据库约束（唯一索引、外键）作为最后防线   │
└──────────────────────────────────────────────┘
```

**各层职责**：

| 层 | 校验内容 | 返回 |
|---|---|---|
| **handler** | 类型、必填、长度、枚举、格式（email/URL） | `400 Bad Request` |
| **service** | 业务规则、权限、跨字段逻辑 | 业务错误码 |
| **repository** | DB 约束 | 包装后返回 |

```go
// 反例：在 handler 中做业务校验
func createOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    json.NewDecoder(r.Body).Decode(&req)
    // 在 handler 中检查库存——越界
    if !inventory.HasStock(req.ProductID, req.Quantity) {
        writeError(...)
        return
    }
}

// 正例：handler 只做格式校验，service 做业务校验
func createOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, APIError{Code: "VALIDATION_ERROR", Message: "请求格式错误"})
        return
    }
    if err := requestValidator.Struct(req); err != nil { // 复用项目已注入的校验器
        writeError(w, http.StatusBadRequest, APIError{Code: "VALIDATION_ERROR", Message: err.Error()})
        return
    }
    order, err := svc.CreateOrder(r.Context(), req) // 业务校验在 service 内部
    // ...
}
```

### 5.2 校验库选择

🟡 推荐

| 库 | 适用场景 |
|---|---|
| `go-playground/validator` | 最流行，struct tag 声明式校验 |
| `ozzo-validation` | 代码式校验，更灵活 |
| 手写 | 规则复杂、跨字段校验、团队不想引入第三方依赖 |

```go
// go-playground/validator 示例
type CreateUserRequest struct {
    Name  string `json:"name"  validate:"required,min=1,max=100"`
    Email string `json:"email" validate:"required,email"`
    Age   *int   `json:"age"   validate:"omitempty,gte=0,lte=150"`
}
```

### 5.3 校验错误格式

🟡 推荐：校验失败返回结构化错误

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "请求参数校验失败",
        "details": [
            {"field": "name", "reason": "必填字段"},
            {"field": "email", "reason": "邮箱格式不正确"}
        ],
        "requestId": "req_abc123"
    }
}
```

```go
type ValidationDetail struct {
    Field  string `json:"field"`
    Reason string `json:"reason"`
}
```

## 6. gRPC 特殊规则

### 6.1 Protobuf 命名

🔴 必加约束

```protobuf
// 正例：标准命名
syntax = "proto3";

package user.v1;                          // 小写 + 点分隔

option go_package = "github.com/example/server/api/user/v1;userv1";

service UserService {                     // PascalCase
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message GetUserRequest {                  // PascalCase
    string user_id = 1;                   // snake_case 字段名
}
```

| 元素 | 命名规则 |
|---|---|
| package | 小写 + 点分隔：`user.v1` |
| service | PascalCase：`UserService` |
| rpc | PascalCase：`GetUser` |
| message | PascalCase：`GetUserRequest` |
| 字段 | snake_case：`user_id` |
| 枚举值 | UPPER_SNAKE_CASE：`STATUS_ACTIVE` |

### 6.2 错误码映射

🔴 必加约束：使用 `google.golang.org/grpc/codes` 和 `google.golang.org/grpc/status`

```go
// 正例：gRPC 标准错误
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func (s *UserService) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    user, err := s.svc.GetUser(ctx, req.UserId)
    if errors.Is(err, ErrUserNotFound) {
        return nil, status.Error(codes.NotFound, "用户不存在")
    }
    if err != nil {
        return nil, status.Errorf(codes.Internal, "获取用户失败: %v", err)
    }
    return toProto(user), nil
}
```

**HTTP ↔ gRPC 状态码映射**：

| HTTP | gRPC Code |
|---|---|
| `200 OK` | `OK` |
| `400 Bad Request` | `InvalidArgument` |
| `401 Unauthorized` | `Unauthenticated` |
| `403 Forbidden` | `PermissionDenied` |
| `404 Not Found` | `NotFound` |
| `409 Conflict` | `AlreadyExists` |
| `429 Too Many Requests` | `ResourceExhausted` |
| `500 Internal Server Error` | `Internal` |
| `503 Service Unavailable` | `Unavailable` |
| `504 Gateway Timeout` | `DeadlineExceeded` |

### 6.3 流式接口

🟡 推荐

```protobuf
service LogService {
    // 服务端流：客户端发一次，服务端持续推送
    rpc TailLogs(TailLogsRequest) returns (stream LogEntry);

    // 客户端流：客户端持续发送，服务端汇总响应
    rpc UploadLogs(stream LogEntry) returns (UploadLogsResponse);

    // 双向流：双向持续通信
    rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

**使用原则**：

- **大量数据返回**（> 1000 条记录）→ 服务端流（避免一次性加载到内存）
- **批量上传**（> 100 条记录）→ 客户端流
- **实时通信**（聊天、监控推送）→ 双向流

### 6.4 gRPC 超时

🔴 必加约束

```go
// 客户端必须设置 deadline
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
resp, err := client.GetUser(ctx, &pb.GetUserRequest{UserId: "123"})

// 服务端必须检查 ctx 是否超时
func (s *UserService) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    if ctx.Err() != nil {
        return nil, status.Error(codes.DeadlineExceeded, "请求已超时")
    }
    // ...
}
```

## 7. 文档与契约

### 7.1 OpenAPI（HTTP API）

🔴 对外 HTTP API 必须有可维护、可验证的契约来源。项目采用 OpenAPI 时，应让规范与实现同步并纳入版本控制；采用其他网关 schema、生成协议或受控文档体系时，沿用其单一事实来源，不为满足本规则重复维护一份易漂移的 OpenAPI。

推荐工具：

| 工具 | 方式 | 适用 |
|---|---|---|
| [swaggo/swag](https://github.com/swaggo/swag) | 注释生成 | 简单项目，从代码生成 |
| [go-swagger](https://github.com/go-swagger/go-swagger) | 代码生成 | 从 spec 生成 handler 骨架 |
| [ogen](https://github.com/ogen-go/ogen) | 代码生成 | 高性能，从 spec 生成完整 server/client |
| 手写 `openapi.yaml` | 手写 | 需要精确控制 spec 的场景 |

**最小化注释示例**（swaggo）：

```go
// @title           用户服务 API
// @version         1.0
// @description     用户管理相关接口
// @host            localhost:8080
// @BasePath        /api/v1

// @Summary         获取用户
// @Description     根据 ID 获取用户详情
// @Tags            用户
// @Produce         json
// @Param           id  path      string  true  "用户 ID"
// @Success         200 {object}  Response{data=User}
// @Failure         404 {object}  Response
// @Router          /users/{id} [get]
func getUser(w http.ResponseWriter, r *http.Request) { /* ... */ }
```

### 7.2 Protobuf（gRPC API）

🔴 必加约束：Protobuf 文件**就是** API 文档。注释必须完整。

```protobuf
// UserService 提供用户管理相关接口。
service UserService {
    // GetUser 根据用户 ID 获取用户详情。
    // 如果用户不存在，返回 NOT_FOUND 错误。
    rpc GetUser(GetUserRequest) returns (GetUserResponse);

    // ListUsers 分页查询用户列表。
    // 支持按 status 过滤，默认按创建时间倒序排列。
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}
```

### 7.3 API 文档即代码

🟡 推荐

- **Protobuf 是第一真理来源**——服务端和客户端代码都从 `.proto` 生成
- **OpenAPI spec 提交到仓库**——与代码一起版本控制
- **CI 中检查 spec 是否最新**——`go generate` 后 `git diff --exit-code`

```makefile
# Makefile
.PHONY: api-docs
api-docs:
	swag init -g cmd/server/main.go -o api/docs
	protoc --go_out=. --go-grpc_out=. api/**/*.proto
```
