# 06 - Java Web/API 设计规则

> 🟢 本文件适用于 Java 项目的 Web API 设计（RESTful/Controller/参数校验/限流等）。<br>
> 🔴 不适用：业务逻辑实现、UI 样式细节、数据库 schema 设计

---

## 1. RESTful 规范

### 1.1 资源命名

🟡 **推荐**：

- URL 用**名词**（资源），**不用动词**（动作）
  - **正例**：`GET /orders`（资源是"订单"）
  - **反例**：`GET /getOrders` / `GET /queryOrderList`
- 资源名用**复数**（`/users` 不是 `/user`）
- URL 全小写，多词用 `-` 分隔（不是 `_` 或驼峰）
  - **正例**：`/user-profiles`
  - **反例**：`/userProfiles` / `/user_profiles`

🟡 **推荐**：

- **版本号放 URL**（推荐 header / 路径 `/api/v1/`，不要 query string）
  - **路径方式**：`/api/v1/orders`（简单）
  - **Header 方式**：`Accept: application/vnd.myapi.v1+json`（更 RESTful，但浏览器调试麻烦）

### 1.2 HTTP 方法语义

🟡 **推荐**：

| 方法 | 语义 | 幂等 | 何时用 |
|---|---|---|---|
| `GET` | 获取资源 | ✅ | 查询 |
| `POST` | 创建资源 | ❌ | 新增 |
| `PUT` | 全量替换资源 | ✅ | 完整更新 |
| `PATCH` | 部分更新资源 | ❌ | 局部更新 |
| `DELETE` | 删除资源 | ✅ | 删除 |

🟡 **推荐**：

- **`GET` 不能有副作用**（不能改数据、不能删除）—— 浏览器 / 爬虫 / CDN 都会缓存 GET
- **`POST` 用于创建**，`PUT` 用于完整替换
  - **反例**：用 `POST /orders/update`（既不是 RESTful 又难排查）
  - **正例**：`PUT /orders/{id}` 更新

### 1.3 HTTP 状态码

🟡 **推荐**（AI 在 Controller 返回值时立即用）：

| 状态码 | 含义 | 何时用 |
|---|---|---|
| `200 OK` | 成功 | 通用成功 |
| `201 Created` | 资源已创建 | POST 创建成功 |
| `204 No Content` | 成功无返回体 | PUT/PATCH/DELETE 成功 |
| `400 Bad Request` | 客户端请求错误 | 参数错误 |
| `401 Unauthorized` | 未认证 | 未登录 |
| `403 Forbidden` | 已认证但无权访问 | 权限不足 |
| `404 Not Found` | 资源不存在 | id 不存在 |
| `405 Method Not Allowed` | HTTP 方法不允许 | URL 错 |
| `409 Conflict` | 资源冲突 | 并发冲突 |
| `422 Unprocessable Entity` | 校验失败 | Bean Validation 失败 |
| `500 Internal Server Error` | 服务器错误 | 兜底 |
| `502 Bad Gateway` | 上游服务错误 | 微服务网关 |
| `503 Service Unavailable` | 服务不可用 | 熔断降级 |

### 1.4 URL 设计决策表

🟡 **推荐**：

| 操作 | URL | 方法 |
|---|---|---|
| 列出订单 | `/api/v1/orders` | `GET` |
| 查询单个订单 | `/api/v1/orders/{id}` | `GET` |
| 创建订单 | `/api/v1/orders` | `POST` |
| 完整替换订单 | `/api/v1/orders/{id}` | `PUT` |
| 局部更新订单 | `/api/v1/orders/{id}` | `PATCH` |
| 删除订单 | `/api/v1/orders/{id}` | `DELETE` |
| 用户的所有订单 | `/api/v1/users/{userId}/orders` | `GET` |
| 给用户加订单 | `/api/v1/users/{userId}/orders` | `POST` |
| 激活订单（动作）| `/api/v1/orders/{id}/activate` | `POST` |

🟡 **推荐**：

- **嵌套不超过 2 层**：`/users/{id}/orders/{id}/items`（3 层）改为查询参数
- **避免查询参数放路径**：`/orders?userId=123` 比 `/users/123/orders` 更适合"非主路径"场景
- **`?` 后的参数**：筛选 / 分页 / 排序

### 1.5 路径变量与查询参数

🟡 **推荐**：

- **路径变量（`{id}`）**：标识资源的**必要信息**
  - `GET /orders/{orderId}` —— 订单 id 是必需的
- **查询参数（`?xxx=yyy`）**：筛选、分页、排序
  - `GET /orders?status=PAID&page=1&size=20&sort=createdAt,desc`

### 1.6 不应该有的 URL 反例

🟡 **推荐**：

- ❌ URL 中出现动词：`/api/getOrders` / `/api/submitForm`
- ❌ URL 中出现文件后缀：`/api/orders.json`（用 `Accept` Header）
- ❌ URL 中有大写：`/api/Orders`
- ❌ URL 中有空格或中文：`/api/订单列表`
- ❌ 过长嵌套：`/api/companies/{c}/departments/{d}/employees/{e}/projects/{p}/tasks`（5 层）
- ❌ Query String 用作路径语义：`/api/orders?id=123` 应该是 `/api/orders/123`

---

## 2. Controller 编写规范

### 2.1 Controller 应薄

🟡 **推荐**：

- Controller 只做：**参数接收 → 调 Service → 返回结果**
- **业务逻辑全部在 Service**

**反例**（胖 Controller）：
```java
// ❌ Controller 管业务
@PostMapping("/orders")
public OrderDTO createOrder(@RequestBody OrderDTO dto) {
    // 校验
    if (dto.getItems().isEmpty()) {
        throw new BizException("20101", "订单项不能为空");
    }
    // 业务逻辑
    BigDecimal total = dto.getItems().stream()
        .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQty())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    // 持久化
    Order order = new Order(dto.getUserId(), total, dto.getItems());
    orderRepository.save(order);
    // 通知
    notificationService.send(dto.getUserId(), "订单已创建");
    return OrderMapper.toDTO(order);
}
```

**正例**（薄 Controller）：
```java
// ✅ Controller 只做三件事
@PostMapping("/orders")
public ApiResponse<OrderDTO> createOrder(@Valid @RequestBody CreateOrderRequest req) {
    Order order = orderApplicationService.createOrder(req);  // Service 处理
    return ApiResponse.ok(OrderMapper.toDTO(order));
}
```

### 2.2 Controller 不写事务

🟡 **推荐**：

- **不在 Controller 上加 `@Transactional`**（Controller 是入口，不应该是事务边界）
- **事务边界在 Service / Application Service**

### 2.3 Controller 不直接 catch 业务异常

🟡 **推荐**：

- 见 见 03-异常处理规则 § 6.3
- **业务异常直接 throw**，由 `@ControllerAdvice` 统一处理

### 2.4 接收参数方式

🟡 **推荐**：4 种参数接收方式按场景选：

| 方式 | 注解 | 何时用 |
|---|---|---|
| **JSON body** | `@RequestBody` | POST / PUT，复杂参数 |
| **表单字段** | `@ModelAttribute` | 表单提交（不常用）|
| **路径变量** | `@PathVariable` | URL 中的标识符 |
| **查询参数** | `@RequestParam` | 简单筛选 / 分页参数 |
| **header** | `@RequestHeader` | token / traceId 等 |

🟡 **推荐**：

- **`POST` 方法必须用 `@RequestBody`** 接收 JSON（不要用 `@RequestParam` 接收多个字段）
- **简单分页参数用 `@RequestParam`**，复杂查询用 `@RequestBody` + `Query` 对象
- 接收 DTO 不暴露 DO：`CreateOrderRequest` / `OrderResponse`

### 2.5 Controller 命名与目录

🟡 **推荐**：

- Controller 命名：`XxxController`（不带 `Controller` 后缀的也算标准，但带后缀更清晰）
- Controller 放接口层包：`interfaces.controller` 或 `controller`
- 一个 Controller 不超过 30 个端点（多了就拆，按业务域拆）

---

## 3. 参数校验（Bean Validation）

P3C 没有 Bean Validation 章节。AI 写 Web 接口时**必须**做参数校验。

### 3.1 启用校验

🟡 **推荐**：

- `@Valid` 或 `@Validated` 注解启用 Bean Validation
- Spring Boot 项目通常在 DTO 上加 `@NotNull` / `@NotBlank` / `@Size` / `@Min` 等

**正例**（接收 DTO）：
```java
@Data
public class CreateOrderRequest {
    @NotNull(message = "用户 ID 不能为空")
    private Long userId;

    @NotEmpty(message = "订单项不能为空")
    @Size(max = 100, message = "订单项不能超过 100 个")
    @Valid  // 嵌套校验
    private List<OrderItemDTO> items;

    @Size(max = 200, message = "备注不能超过 200 字")
    private String remark;
}

@PostMapping("/orders")
public ApiResponse<OrderDTO> createOrder(@Valid @RequestBody CreateOrderRequest req) {
    // req 已经被校验，items 非空且 ≤ 100
    return ApiResponse.ok(orderService.createOrder(req));
}
```

### 3.2 常用校验注解

🟡 **推荐**（按使用频率排序）：

| 注解 | 适用 | 示例 |
|---|---|---|
| `@NotNull` | 任何对象 | `@NotNull Long userId` |
| `@NotBlank` | String | `@NotBlank String username` |
| `@NotEmpty` | Collection / 数组 / String | `@NotEmpty List<T> items` |
| `@Size(min, max)` | String / 集合 | `@Size(max=200)` |
| `@Min` / `@Max` | 数字 | `@Min(0) @Max(150) Integer age` |
| `@Pattern(regexp=...)` | String 格式 | `@Pattern(regexp="^1[3-9]\\d{9}$") String phone` |
| `@Email` | 邮箱 | `@Email String email` |
| `@Past` / `@Future` | 时间 | `@Past LocalDate birthday` |
| `@DecimalMin` / `@DecimalMax` | BigDecimal | `@DecimalMin("0.01") BigDecimal price` |
| `@Digits` | 数字精度 | `@Digits(integer=10, fraction=2)` |
| `@Positive` / `@Negative` | 正负数 | `@Positive BigDecimal price` |

### 3.3 分组校验

🟡 **推荐**：同一 DTO 在不同场景下校验规则不同（如创建 vs 更新）：

```java
public class OrderDTO {
    @Null(groups = Create.class, message = "创建时 ID 必须为空")
    @NotNull(groups = Update.class, message = "更新时 ID 不能为空")
    private Long id;

    @NotBlank(groups = {Create.class, Update.class})
    private String status;
}

public interface Create {}
public interface Update {}

@PostMapping("/orders")
public ApiResponse<Void> create(@Validated(Create.class) @RequestBody OrderDTO dto) { ... }

@PutMapping("/orders/{id}")
public ApiResponse<Void> update(@Validated(Update.class) @RequestBody OrderDTO dto) { ... }
```

### 3.4 自定义校验注解

🟡 **推荐**：业务专用校验写自定义注解：

```java
// 1. 自定义注解
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PhoneValidator.class)
public @interface Phone {
    String message() default "手机号格式不正确";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 2. 校验器
public class PhoneValidator implements ConstraintValidator<Phone, String> {
    private static final Pattern PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && PATTERN.matcher(value).matches();
    }
}

// 3. 使用
public class UserDTO {
    @Phone
    private String mobile;
}
```

### 3.5 校验失败的全局处理

🟡 **推荐**：

- 用 `@ControllerAdvice` + `@ExceptionHandler(MethodArgumentNotValidException.class)` 统一处理
- 详见 见 03-异常处理规则 § 6.1

### 3.6 SQL 注入防御

🟡 **推荐**：

- **所有用户输入的 SQL 参数严格使用参数绑定或 METADATA 字段值限定**
- **禁止字符串拼接 SQL**
  - **反例**：`String sql = "SELECT * FROM users WHERE name = '" + name + "'";`（注入！）
  - **正例**：
    ```java
    @Query("SELECT u FROM User u WHERE u.name = :name")
    List<User> findByName(@Param("name") String name);
    ```
- **MyBatis 用 `#{}` 不 `${}`**（见 见 07 §3）

### 3.7 XSS 与 SQL 注入 URL 重定向

🟡 **推荐**（安全性已经在 见 12 详述，这里跟 Web 接口层相关的几点）：

- 用户输入校验（`@Valid` 已经做）
- 输出到 HTML 时转义（Spring 默认 Escape）
- 重定向到用户可控 URL 时禁止（防止开放重定向漏洞）


---

## 4. 统一响应格式

详细 `ApiResponse` 设计见 见 03-异常处理规则 § 6.2。这里补充 **Web 层的统一响应规范**。

### 4.1 包装 vs 不包装

🟡 **推荐**：

- **所有 Controller 方法返回 `ApiResponse<T>`**（统一包装）
- ✅ 优点：前端开发友好（统一处理错误）、错误信息一致
- ❌ 缺点：透传返回类型（需要在拦截器 / filter 解包）

### 4.2 响应体规范

🟡 **推荐**：标准响应体结构：

```json
{
    "code": "0",
    "message": "success",
    "data": {
        "id": 12345,
        "userId": 100,
        "totalAmount": 99.50
    },
    "timestamp": 1719742800000,
    "traceId": "a1b2c3d4e5"
}
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `code` | String | 业务码（`"0"`=成功，其他=失败）|
| `message` | String | 人类可读的描述 |
| `data` | Object / Array | 业务数据（成功时）|
| `timestamp` | long | 响应时间戳（毫秒）|
| `traceId` | String | 链路追踪 ID（用于问题定位）|

### 4.3 分页响应

🟡 **推荐**：分页专用响应：

```java
@Data
public class PageResponse<T> {
    private List<T> records;     // 数据
    private long total;          // 总记录数
    private int page;            // 当前页（1-indexed）
    private int size;            // 每页大小
    private int totalPages;      // 总页数（计算属性）

    @JsonIgnore
    public int getTotalPages() { return (int) Math.ceil((double) total / size); }
}
```

使用：
```java
@GetMapping("/orders")
public ApiResponse<PageResponse<OrderDTO>> list(
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(orderService.list(page, size));
}
```

🟡 **推荐**：

- **`page` 从 1 开始**（不是 0，跟用户直觉一致）
- **`size` 默认 20，上限 100**（防 DoS）
- **不要返回 `List<T>` 当分页结果**（前端无法知道总数）

### 4.4 错误响应（业务码 vs HTTP 码）

🟡 **推荐**：

- **业务错误用 HTTP 200 + 业务码表达**（如库存不足返回 `"30102"`）
- **HTTP 层面错误用对应 HTTP 状态码**（如 401 / 403 / 404 / 500）
- 详见 见 03-异常处理规则 § 6.4

### 4.5 二进制接口（文件下载 / 上传）

🟢 **参考**：

- 文件下载：`Content-Type: application/octet-stream`，响应体直接是字节流，不包装 JSON
- 文件上传：`multipart/form-data`，参数用 `@RequestParam("file") MultipartFile`
- 大文件分片上传：客户端先调 `POST /files/init` 获取 uploadId，再分片上传 `PUT /files/{uploadId}/parts/{partNumber}`，最后 `POST /files/{uploadId}/complete` 合并

---

## 5. 接口文档（OpenAPI 3 / Swagger）

### 5.1 用 springdoc-openapi 替代 springfox

🟡 **推荐**：Spring Boot 3.x 项目用 **springdoc-openapi**（springfox 已停止维护）：

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
</dependency>
```

访问 UI：`http://localhost:8080/swagger-ui.html`

### 5.2 关键注解

🟡 **推荐**（让 swagger UI 自动生成文档）：

| 注解 | 何时用 | 示例 |
|---|---|---|
| `@Operation` | Controller 方法 | `@Operation(summary = "创建订单")` |
| `@Parameter` | 方法参数 | `@Parameter(description = "订单 ID")` |
| `@Tag` | Controller | `@Tag(name = "订单管理", description = "订单 CRUD")` |
| `@Schema` | DTO 类 / 字段 | `@Schema(description = "用户 ID") Long userId` |
| `@ApiResponses` | 多种响应 | 见下 |

**正例**：
```java
@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "订单管理", description = "订单 CRUD 操作")
public class OrderController {

    @Operation(
        summary = "创建订单",
        description = "传入订单明细，返回订单 ID"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "创建成功"),
        @ApiResponse(responseCode = "400", description = "参数错误"),
        @ApiResponse(responseCode = "500", description = "服务器错误")
    })
    @PostMapping
    public ApiResponse<OrderDTO> create(
        @Valid @RequestBody CreateOrderRequest req
    ) { ... }
}
```

### 5.3 文档应包含

🟡 **推荐**：

每个接口文档**必须**包含：

- **summary + description**：方法做什么
- **请求参数说明**：包括 `@Parameter` 和 `@Schema` 描述
- **响应示例**：包括成功和失败
- **错误码列表**：本接口可能抛的业务错误码
- **鉴权要求**：是否需要登录 / 特定角色

🟡 **推荐**：用 `@SecurityRequirement` 标注需要鉴权：

```java
@Operation(summary = "删除订单")
@SecurityRequirement(name = "bearer-jwt")
@DeleteMapping("/{id}")
public ApiResponse<Void> delete(@PathVariable Long id) { ... }
```

### 5.4 不要在 Controller 里写完代码忘记加文档注解

🟡 **推荐**：

- **写完 Controller 必须补文档注解**（否则 swagger UI 是空的，调用方看不到参数）

### 5.5 用枚举规范响应示例

🟡 **推荐**：在 `@ApiResponse` 里给 `example` JSON 示例：

```java
@ApiResponse(
    responseCode = "200",
    description = "订单详情",
    content = @Content(
        mediaType = "application/json",
        examples = @ExampleObject(value = """
            {"code":"0","message":"success","data":{"orderId":12345,"status":"PAID"},"traceId":"abc"}
            """)
    )
)
```


---

## 6. 接口幂等性

### 6.1 什么是幂等

🟢 **参考**：

- 幂等：同一请求执行 1 次和执行 N 次效果相同
- `GET` / `PUT` / `DELETE`（HTTP 协议级别幂等）
- `POST` **不是天然幂等**（每次调用都可能创建新资源）

### 6.2 必须幂等的场景

🟡 **推荐**（高资金风险 / 用户重复提交常见场景）：

- **支付接口**（防用户重复支付 / 网络重试）
- **转账接口**（防重复扣款）
- **创建订单**（防重复创建订单）
- **优惠券领券**（防用户连续点击）

### 6.3 幂等性方案选择

🟡 **推荐**：

| 方案 | 复杂度 | 适用场景 |
|---|---|---|
| **唯一索引**（数据库层）| ⭐ | 数据库唯一约束防重复 |
| **Token 机制**（前端获取 + 后端校验）| ⭐⭐ | 用户主动防重复提交（防止表单连点） |
| **状态机**（业务状态流转）| ⭐⭐ | 订单从"已创建"→"已支付"只能转换一次 |
| **乐观锁**（version 字段）| ⭐⭐ | 并发更新场景 |

### 6.4 Token 机制实现

🟡 **推荐**：

```java
// 1. 前端进入页面时获取 token（用户不可见）
@GetMapping("/idempotent-token")
public ApiResponse<String> generateToken(@RequestHeader("userId") Long userId) {
    String token = idempotentService.generate(userId);
    return ApiResponse.ok(token);
}

// 2. 提交时带 token
@PostMapping("/orders")
public ApiResponse<OrderDTO> create(
    @RequestHeader("idempotentToken") String token,
    @Valid @RequestBody CreateOrderRequest req) {
    return ApiResponse.ok(orderService.createIdempotent(token, req));
}

@Service
public class OrderService {
    public Order createIdempotent(String token, CreateOrderRequest req) {
        // 拿 token 去 Redis 检查并设置（原子操作）
        Boolean firstTime = redisTemplate.opsForValue()
            .setIfAbsent("idem:" + token, "1", Duration.ofMinutes(5));

        if (Boolean.FALSE.equals(firstTime)) {
            throw new BizException("30901", "请勿重复提交");
        }

        try {
            return createOrder(req);
        } catch (Exception e) {
            redisTemplate.delete("idem:" + token);  // 失败要释放 token，否则用户永远不能重试
            throw e;
        }
    }
}
```

### 6.5 状态机幂等

🟡 **推荐**：用订单状态机防重复：

```java
public class Order {
    private OrderStatus status;

    public void pay() {
        if (status != OrderStatus.UNPAID) {
            throw new BizException("30103", "订单当前不可支付: " + status);
        }
        this.status = OrderStatus.PAID;
    }
}

// 即使"支付"请求被网络重试 10 次
// 第一次：status=UNPAID → PAID
// 第二次到第十次：throw 30103 异常
// 业务上是幂等的（最终只支付一次）
```

### 6.6 数据库唯一索引幂等

🟡 **推荐**（最简单）：

```sql
-- 订单号唯一索引
ALTER TABLE orders ADD UNIQUE INDEX uk_order_no (order_no);

-- 业务方每次生成唯一 order_no（雪花算法 / UUID）
-- 重复请求 INSERT 会失败 → 业务幂等
```

🟡 **推荐**：

- **资金相关接口必须 2 种以上幂等方案组合**（token + 唯一索引 / token + 状态机）

---

## 7. 限流 / 熔断 / 降级

### 7.1 限流必要性

🟡 **推荐**：

- **生产环境服务必须有**接口级 / 用户级 / IP 级的限流
- 防止：恶意爬虫 / DDoS / 业务突发 / 风控拦截失效

### 7.2 限流算法选择

🟡 **推荐**：

| 算法 | 优点 | 缺点 | 适用 |
|---|---|---|---|
| **令牌桶** | 允许突发 | 配置较复杂 | API 限流（主流） |
| **漏桶** | 平滑流量 | 无法应对突发 | 流量整形 |
| **固定窗口** | 实现简单 | 临界问题 | 低精度场景 |
| **滑动窗口** | 平滑 | 实现复杂 | 精确限流 |

### 7.3 限流位置

🟡 **推荐**：

| 位置 | 实现 | 适用 |
|---|---|---|
| **网关层**（Nginx / Spring Cloud Gateway）| Sentinel / Nginx limit_req | 全局粗粒度（整个服务）|
| **应用层**（Spring Interceptor / 注解）| Sentinel @SentinelResource | 接口级细粒度 |
| **业务层**（带业务上下文）| 自定义组件 | 用户级 / 业务场景 |

### 7.4 Sentinel 注解限流

🟡 **推荐**（阿里 Sentinel，Java 生态最常用）：

```java
@GetMapping("/orders")
@SentinelResource(
    value = "listOrders",
    blockHandler = "listOrdersBlock"  // 限流时回调
)
public ApiResponse<PageResponse<OrderDTO>> list(
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(orderService.list(page, size));
}

// 限流 / 降级回调
public ApiResponse<Void> listOrdersBlock(int page, int size, BlockException ex) {
    return ApiResponse.fail("50901", "接口访问过于频繁，请稍后再试");
}
```

### 7.5 限流阈值

🟡 **推荐**：接口限流阈值的判断：

- **内部接口**：1000 QPS 起，根据系统容量调整
- **外部 API**：按业务场景（如登录 100 QPS / IP，注册 5 QPS / IP）
- **核心接口**：设高（如支付 100 QPS），非核心设低（如导出报表 1 QPS / 用户）

### 7.6 熔断降级

🟡 **推荐**：使用 Resilience4j 或 Sentinel 的熔断器：

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      orderService:
        failureRateThreshold: 50        # 失败率 50% 触发熔断
        waitDurationInOpenState: 10s    # 熔断后 10 秒进入半开
        slidingWindowSize: 10           # 滑动窗口大小
```

```java
@CircuitBreaker(name = "orderService", fallbackMethod = "fallback")
public Order createOrder(CreateOrderRequest req) {
    return remoteOrderService.create(req);
}

private Order fallback(CreateOrderRequest req, Throwable t) {
    log.warn("调用远程订单服务失败，触发熔断降级", t);
    return Order.localFallback(req);  // 本地兜底
}
```

🟡 **推荐**：

- **所有跨服务 RPC 调用必须有熔断降级**（Resilience4j / Sentinel）
- **fallback 必须有**，不能空跑

### 7.7 限流响应

🟡 **推荐**：

- 限流触发返回 HTTP `429 Too Many Requests`
- 业务码统一用 `"50901"`（"系统繁忙"系列）


---

## 8. 跨域（CORS）

### 8.1 跨域问题来源

🟢 **参考**：

- 浏览器同源策略：协议 + 域名 + 端口全相同才算"同源"
- **前后端分离项目必然遇到跨域**（前端 8080 / 后端 8081）
- **AI 写接口时必须考虑**：调用方是不是浏览器

### 8.2 Spring 跨域配置

🟡 **推荐**：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")  // 哪些路径允许跨域
            .allowedOrigins(
                "http://localhost:3000",
                "https://app.example.com"
            )
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("traceId", "Authorization")
            .allowCredentials(true)
            .maxAge(3600);  // 预检请求缓存 1 小时
    }
}
```

🟡 **推荐**：

- **不要用 `allowedOrigins("*")` + `allowCredentials(true)`**：浏览器不允许这种组合（CSRF 风险）

### 8.3 注解式跨域

🟢 **可选**：单接口粒度：

```java
@CrossOrigin(origins = "https://app.example.com", maxAge = 3600)
@RestController
public class OrderController { ... }
```

### 8.4 预检请求（OPTIONS）

🟢 **参考**：

- 复杂请求（自定义 header / `Content-Type: application/json`）会先发 OPTIONS 预检
- Spring 默认处理 OPTIONS 预检不需要 Controller 处理
- 跨域配置 `maxAge` 控制预检结果缓存时间

### 8.5 反向代理解决跨域

🟡 **推荐**：生产环境通常用 Nginx 同源代理（**比 CORS 配置更安全**）：

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://frontend:3000;
    }
    location /api/ {
        proxy_pass http://backend:8080;
    }
}
```

浏览器请求 `app.example.com/api/orders`，Nginx 转发到后端，**对浏览器来说是同源**（不需要 CORS）。

---
