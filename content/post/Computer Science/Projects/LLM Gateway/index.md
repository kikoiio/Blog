+++
date = 2026-09-04
title = "MyLLMGateway"
+++

# MyLLMGateway

## 1. 项目是什么

MyLLMGateway 是一个用 Go 实现的 **LLM API 网关**：对应用暴露 OpenAI 兼容的 Chat Completions / Embeddings 接口，对内以「逻辑模型」屏蔽真实供应商、部署与凭证，并在请求路径上提供路由、重试、流式边界、故障域隔离、健康熔断等网关语义。

接入方式是 OpenAI 兼容的：应用只改 base_url 和 key，就从「直连某个供应商」切换为「经过网关」——供应商的差异、故障与重试细节被关在网关内部，调用方只看到一份稳定契约。

## 2. 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 数据平面 | Go 1.26，标准库 `net/http` | 并发模型清晰、流式与取消易控制、单二进制部署、可用 race detector |
| 配置 | YAML 单文档 + 严格解码 + 语义校验 | 配置不可变、可校验、可回滚（快照 + checksum） |
| 上游测试 | 自研 mockprovider（确定性场景引擎） | 无真实供应商即可复现 429/5xx/慢响应/半截 SSE 等全部关键故障 |
| 密钥 | `env://` 引用 + TTL 缓存解析器 | 配置与日志只出现引用，不出现明文 |
| 部署 | Dockerfile + docker-compose + Makefile | 本地三命令即可构建、测试、起服务 |
| 质量门禁 | golangci-lint（CI 锁定）+ `go test -race` | 回归基线：全量测试通过、lint `0 issues` |

## 3. 总体架构

```text
应用 / OpenAI SDK
      │  POST /v1/chat/completions（OpenAI 兼容，只改 base_url + key）
      ▼
┌────────────────────────────────────────────────────────────┐
│ MyLLMGateway（Go 单进程，模块化单体）                        │
│                                                            │
│  transport/httpapi    HTTP Server、healthz/readyz、请求 ID  │
│  transport/openaiwire OpenAI wire ⇄ Canonical IR 双向转换   │
│  gateway              Service 编排（能力校验→构建→执行→归一化）│
│  routing              AttemptPlan：候选过滤 + 三种排序策略    │
│  execution            重试循环、退避、尝试记录               │
│  scheduler            request/stream/probe 三车道并发隔离    │
│  health               熔断器（Closed→Open→HalfOpen）+ 注册表 │
│  provider/openai      OpenAI 适配器（Chat/Embedding/SSE）   │
│  provider/sse         通用 SSE 解析器（任意字节分片）        │
│  canonical            统一中间表示 IR、统一错误、能力契约     │
│  config / secrets     版本化配置快照、密钥引用解析           │
└───────────────┬────────────────────────────────────────────┘
                │  OpenAI 协议（HTTP/SSE）
                ▼
        LLM Provider（验收环境由 mockprovider 扮演）
```

## 4. 核心设计

### 4.1 Canonical IR：统一中间表示

所有供应商协议先转换为统一的 Canonical IR，网关内部只处理 IR，不处理任何供应商私有格式：

- **Chat**：消息（system/developer/user/assistant/tool 五种角色、文本与图片多部分 content）、工具定义 / 工具调用 / 工具选择、response_format（text / json_object / json_schema）、采样参数、`provider_options` 受控扩展命名空间。
- **Usage**：输入 / 输出 / 缓存 / 推理 token 四类用量。
- **流式事件**：`MessageStart / ContentDelta / ToolDelta / Usage / Finish` 五种事件，是流式状态机的基本单元。
- **统一错误**：14 种稳定错误类别（`invalid_request`、`rate_limited`、`upstream_rate_limit`、`timeout`、`gateway_overloaded`、`partial_stream`……），每种映射固定 HTTP 状态码，并携带 `Retryable` / `FallbackAllowed` / `RetryAfter` 三个重试决策字段。对外只暴露脱敏后的公开错误。
- **能力契约**：每个字段的处理结果必须是 `Native / Transformed / Dropped / Rejected / Passthrough` 五者之一，默认「不能正确转换就拒绝」，禁止静默丢字段。

### 4.2 OpenAI 兼容传输层

传输层负责 OpenAI wire 格式 ⇄ Canonical IR 的双向转换：

- **严格解码**：拒绝未知字段；单请求必须是恰好一个 JSON 值；请求体默认上限 1 MiB，字符串 / 工具载荷分别有 64 KiB / 256 KiB 上限——超限在访问上游之前返回 4xx。
- **入站映射**：`max_tokens` 与 `max_completion_tokens` 互斥校验、stop 字符串/数组归一、tool_choice 三种形态归一、embedding input 支持文本 / token / 批量同构数组。
- **出站映射**：Canonical 响应重新编码为标准 OpenAI `chat.completion` / embedding `list` JSON；SSE 侧逐事件编码写出并以 `[DONE]` 收尾。
- **错误封装**：网关错误以稳定的 `{"type","code","message"}` 信封返回。

### 4.3 Provider 抽象与 OpenAI 适配器

Provider 接口按能力拆分，不为不支持的能力实现空方法。OpenAI 适配器实现四件事：

1. **构建请求**：Canonical → OpenAI DTO，附带 `Authorization: Bearer <运行时凭证>`；
2. **解析响应**：上游 JSON → Canonical，提取上游 `X-Request-ID` 进入 `ProviderMeta` 用于对账；
3. **准备流**：把上游 SSE 字节流解析为 Canonical 事件流——支持任意分片、心跳注释跳过、`[DONE]` 终止、usage 尾包、流内错误信封识别；
4. **错误归一化**：上游状态码 → 统一错误——401/403→`upstream_auth_error`（不可重试）、429→`upstream_rate_limit`（解析 ≤30s 的 `Retry-After`）、5xx→`upstream_server_error`、普通 4xx→`invalid_request`（不可重试不可回退）。

底层配套：适配器注册表、按故障域隔离的 HTTP client、通用 SSE 分帧解析器（对半个 JSON、多行 data、空行等畸形输入有确定性测试）。

### 4.4 路由：不可变执行计划

路由器不直接发请求，只生成**不可变执行计划**：

- 从配置快照取出模型策略，生成带快照版本 / 校验和 / 最大尝试次数 / 截止时间的执行计划；候选 deployment 不存在时记入排除清单并附原因（可解释路由）。
- 三种策略：`ordered`（按配置序）、`weighted`（按 requestID 做 FNV 散列的确定性加权排序，同一请求结果稳定）、`lowest-cost`（按快照价格表的输入+输出单价排序）。
- 计划一旦生成即固化：配置切换不影响执行到一半的请求。

### 4.5 执行引擎：重试判定与退避

执行引擎实现候选内重试：

- 逐次执行、每次生成一条尝试记录（起止时间、结果、usage、错误）；错误不可重试或达到上限即停止。
- **重试判定**：只有 `Retryable && FallbackAllowed && 未提交首事件` 三者同时成立才允许重试——这是「首事件提交后禁止透明回退」规则的代码落点。
- **退避**：有上限的指数退避 + 抖动，尊重上游 `Retry-After`，并被请求剩余时间预算 clamp。

### 4.6 故障域并发调度

调度器把并发容量划分为 **request / stream / probe 三条独立车道**，防止长流式连接耗尽非流式容量：

- 获取的是有界租约，支持 ctx 取消（客户端离开时不会永久占槽）；
- 车道容量支持**热更新**且不影响已持有的租约；
- 暴露 limit / in-use / waiting 观测面。

### 4.7 健康与熔断

标准熔断状态机 `Closed → Open → HalfOpen`：失败计数达阈值熔断，冷却期内拒绝，冷却结束后只允许**单个探测请求**（探测标志保证并发下探测唯一），探测成功即闭合复位。注册表按故障域复用熔断器，并区分端点 5xx / 凭证 401 / 凭证 429 三类故障。

### 4.8 配置与密钥

- **配置**：严格 YAML 单文档解码（多文档直接拒绝）、快照深拷贝 + checksum、语义校验覆盖 HTTPS 端点、凭证引用、策略、权重、超时与 attempt 上限。
- **密钥**：`env://` 引用解析器，带 TTL 缓存与 single-flight（并发解析同一引用只回源一次），配置与日志全程不出现明文。

### 4.9 HTTP API 与进程装配

- HTTP Server 提供 `/healthz`（进程存活）、`/readyz`（就绪闸门）、`/v1/chat/completions`（非流式 + SSE 自动分流）、`/v1/embeddings`；统一 request-ID 中间件回写 `X-Request-ID` / `X-Gateway-Request-ID` 响应头；错误统一脱敏后输出。
- 流式转发逐 Canonical 事件编码下发并立即 flush，`Finish` 事件后补 `[DONE]`；流中出现网关错误时以 SSE 错误事件终止。
- 入口按环境变量装配（监听地址 / 上游地址 / API key / 模型），构造适配器与服务编排（能力校验 → 构建请求 → 执行 → 错误归一化）后启动 HTTP Server；收到 SIGINT 后 10 秒优雅退出。

### 4.10 Mock 上游与契约测试

mockprovider 是确定性供应商模拟引擎：JSON 场景序列（状态码 / 头 / 延迟，序列耗尽后重复末位响应）、SSE 场景（逐 chunk 字节级控制 + 延迟注入）、按「端点 × 场景」的**调用计数**与重置接口。它让 429、慢响应、半截流等故障在无真实供应商时也能稳定复现。契约测试以 golden 样本驱动，覆盖 OpenAI 适配器的 chat / embedding / error / stream 全部分支。

## 5. 真实运行截图

### 5.1 构建与全量测试

![构建与测试](screenshots/01-tests.svg)

**观察点**：构建与全量测试全部通过——13 个有测试的包全 `ok`（含契约测试），lint 同为 `0 issues`。

### 5.2 服务启动与健康检查

![启动与健康检查](screenshots/02-startup-health.svg)

**观察点**：mock 上游加载 `chat` / `chat-stream` / `embed` 三个场景；网关日志确认监听 :8080 并指向上游 :9000；`/healthz` 返回 `{"status":"ok"}`、`/readyz` 返回 `{"status":"ready"}`，两者都携带 `X-Gateway-Request-Id` 响应头。

### 5.3 非流式 Chat：上游 429 → 错误归一化 → 恢复后成功

![非流式 Chat](screenshots/03-chat.svg)

**观察点**：mock 场景设定第一次调用返回 429 + `Retry-After: 1`。网关没有透传上游私有错误体，而是归一化为稳定网关错误 `{"type":"upstream_rate_limit", ...}`（HTTP 429）；再次调用（上游已恢复）返回标准 OpenAI `chat.completion` 响应，usage 三类 token 完整。调用方只看到稳定契约，不感知上游差异。

### 5.4 SSE 流式 · Embeddings · 上游调用计数

![流式与 Embeddings](screenshots/04-stream-embed.svg)

**观察点**：

1. `"stream":true` 时网关切换到流式路径，上游 SSE 被逐事件解析为 Canonical 事件、重新编码为标准 `chat.completion.chunk` 下发，以 `data: [DONE]` 收尾；
2. `/v1/embeddings` 返回标准 embedding `list` 结构；
3. mock 上游调用计数 `{"chat":2,"chat-stream":1,"embed":1}` 与演示调用次数**精确一致**——证明每一次上游访问都是可计数、可对账的真实调用，没有多发或漏发。
