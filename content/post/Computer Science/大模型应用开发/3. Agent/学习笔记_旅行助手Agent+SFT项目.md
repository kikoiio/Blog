# 旅行助手 Agent + SFT 项目学习笔记

> [!info] 项目概述
> 这是一个**旅行助手智能体（Agent）+ 监督微调（SFT）**项目，目标是训练一个能通过**函数调用（Function Calling）**完成旅行规划、路线查询、酒店推荐等任务的 Qwen3-0.6B 小模型。项目整合了 **RAG（检索增强生成）**、**工具调用**和 **LoRA 微调**三大核心技术。

---

## 思维导图结构

```
Agent+SFT 旅行助手项目
├── 1. 核心概念
│   ├── Agent（智能体）
│   ├── SFT（监督微调）
│   ├── Function Calling（函数调用）
│   ├── LoRA（低秩适配）
│   └── RAG（检索增强生成）
├── 2. 项目架构
│   ├── 数据层：合成数据生成 → 格式转换 → 多轮拆分
│   ├── 训练层：LoRA 微调 → 权重合并
│   ├── 工具层：天气/路线/酒店/攻略检索
│   ├── RAG层：Milvus向量库 + 混合检索
│   └── 推理层：模型推理 + 工具执行循环
├── 3. 五大工作流
│   ├── WF1: 旅行规划（攻略+天气）
│   ├── WF2: 路线导航（步行/公交/驾车）
│   ├── WF3: 酒店推荐（推荐+评价）
│   ├── WF4: 旅行闲聊（无工具）
│   └── WF5: 拒绝非旅行话题
├── 4. 数据流水线
│   ├── generate_dataset.py → 1010条合成数据
│   ├── convert_dataset_final_fixed.py → 对话格式转换
│   ├── conversation_splitter.py → 多轮拆分（3x增强）
│   └── 最终训练集 merged_train_final_multiturn_v2.json
└── 5. 优化方案
    ├── 训练优化
    ├── 数据优化
    ├── RAG优化
    └── 推理优化
```

---

## 1. 核心概念详解

### 1.1 Agent（智能体）

> [!tip] 一句话理解
> Agent = LLM + 工具使用能力 + 决策循环

Agent 不是简单的问答，而是一个**感知-决策-行动**循环：

```
用户输入 → LLM判断意图 → 选择工具 → 执行工具 → 拿到结果 → LLM生成回答
                ↑                                              |
                └──────── 如果需要更多信息，继续循环 ──────────┘
```

**例子**：用户问"我下周去北京玩，帮我规划一下"
1. LLM 判断这是**旅行规划**意图
2. 调用 `search_travel_guide("北京")` 获取攻略
3. 调用 `get_weather_info("北京", "2026-04-02", 3)` 获取天气
4. LLM 综合攻略和天气，生成个性化旅行计划

### 1.2 SFT（Supervised Fine-Tuning，监督微调）

> [!tip] 一句话理解
> SFT = 用标注好的对话数据"教"模型学会特定格式和行为

基座模型（如 Qwen3-0.6B）虽然有通用能力，但不知道如何按照特定格式调用工具。SFT 就是用大量"正确示范"让模型学会：

```
# SFT 训练数据的一条样本（简化）
{
  "messages": [
    {"role": "system", "content": "你是旅行助手..."},
    {"role": "user", "content": "我想去杭州旅游"},
    {"role": "assistant", "content": "",
     "tool_calls": [{"function": {"name": "search_travel_guide",
                                   "arguments": "{\"location\": \"杭州\"}"}}]},
    {"role": "tool", "content": "杭州攻略：西湖、灵隐寺..."},
    {"role": "assistant", "content": "根据攻略，推荐您..."}
  ]
}
```

**关键**：模型通过学习这些样本，掌握了**何时该调用工具、调用哪个工具、传什么参数**。

### 1.3 Function Calling（函数调用）

> [!tip] 一句话理解
> Function Calling = 让 LLM 输出结构化的 JSON 来调用外部函数

LLM 本身不能上网、不能查数据库。Function Calling 机制让 LLM 输出一段**结构化 JSON**，由外部程序解析并执行对应函数：

```python
# LLM 输出（不是自然语言，而是结构化调用）
{
  "name": "get_weather_info",
  "arguments": {
    "location": "北京",
    "start_date": "2026-04-01",
    "num_days": 3
  }
}

# 外部程序拿到这个 JSON 后：
result = get_weather_info(location="北京", start_date="2026-04-01", num_days=3)
# result: [{"date": "4/1", "天气": "晴", "温度": "12-22°C"}, ...]
```

本项目定义了 5 个工具函数（`all_tools.json`）：

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `search_travel_guide` | 搜索旅行攻略 | `location`, `search_mode` |
| `get_weather_info` | 查询天气 | `location`, `start_date`, `num_days` |
| `query_route` | 查询路线 | `start_location`, `end_location`, `city_code` |
| `recommend_hotels` | 推荐酒店 | `requirements` |
| `get_hotel_reviews` | 酒店评价 | `hotel_name` |

### 1.4 LoRA（Low-Rank Adaptation，低秩适配）

> [!tip] 一句话理解
> LoRA = 只训练一小部分参数，达到接近全量微调的效果

全量微调 Qwen3-0.6B 需要更新所有 6 亿参数，LoRA 只在关键层插入**低秩矩阵**：

```
原始权重 W (d × d)          不更新 ❄️
LoRA 分解: ΔW = A × B       A (d × r), B (r × d)  ← 只训练这部分 🔥

# r 就是"秩"，本项目 r=32
# 实际训练参数量 ≈ 2 × d × r，远小于 d × d
```

**本项目 LoRA 配置**（`train_qwen_last_assistant_lora.py`）：
```python
LoraConfig(
    r=32,              # 秩：决定适配器容量
    lora_alpha=64,     # 缩放因子（通常设为 2r）
    lora_dropout=0.05, # 防过拟合
    target_modules=[   # 作用在哪些层
        "q_proj", "k_proj", "v_proj", "o_proj",  # 注意力层
        "gate_proj", "up_proj", "down_proj"       # FFN层
    ]
)
```

**例子理解秩 r**：
- `r=4`：适配器很小，学习能力有限，适合简单任务
- `r=32`：适配器较大，能学到复杂的函数调用模式（本项目选择）
- `r=128`：接近全量微调，但训练成本高

### 1.5 RAG（Retrieval-Augmented Generation，检索增强生成）

> [!tip] 一句话理解
> RAG = 先检索相关文档，再让 LLM 基于文档生成回答

LLM 不可能记住所有旅游攻略。RAG 把攻略存到向量数据库（Milvus），查询时先检索再生成：

```
用户: "杭州有什么好玩的？"
    ↓
1. Embedding: "杭州有什么好玩的？" → [0.12, -0.34, 0.56, ...] (1024维向量)
    ↓
2. 向量检索: 在 Milvus 中找最相似的文档
    ↓
3. 返回: "杭州攻略：西湖十景、灵隐寺、宋城..."
    ↓
4. LLM 基于检索结果生成个性化回答
```

**本项目的混合检索策略**（`rag_api.py`）：
- **向量检索**：语义匹配，能理解"有什么好玩的"≈"旅游景点推荐"
- **关键词检索**：精确匹配，确保包含"杭州"的文档被找到
- **混合检索（RRF）**：用 Reciprocal Rank Fusion 融合两种结果

```python
# RRF 融合公式
rrf_score = Σ 1 / (k + rank_i)  # k=60（常数），rank_i 是在各检索中的排名
```

---

## 2. 项目架构详解

### 2.1 目录结构

```
Agent+SFT/
├── 📜 核心脚本
│   ├── travel_assistant_funcall_fixed.py  # 主应用：旅行助手 Agent
│   ├── llm_main.py                       # 统一 LLM 接口（支持10+模型）
│   └── all_tools.json                    # 工具定义（OpenAI Schema）
│
├── 📊 数据流水线
│   ├── generate_dataset.py               # Step1: 生成1010条合成数据
│   ├── convert_dataset_final_fixed.py    # Step2: 转换为对话格式
│   ├── conversation_splitter.py          # Step3: 多轮拆分+3x增强
│   ├── merge_json_files.py              # Step4: 合并 JSON
│   └── split_dataset.py                 # Step5: 训练/测试集划分
│
├── 🏋️ 训练相关
│   ├── train_qwen_last_assistant_lora.py # LoRA 微调（核心）
│   ├── inspect_qwen_dataset.py          # 数据集检查+Dataset类定义
│   ├── merge_lora_into_base.py          # 合并 LoRA 到基座模型
│   └── run_train_last_assistant.sh      # 训练启动脚本
│
├── 🔧 工具实现 (tools/)
│   ├── get_route.py                     # 高德地图路线查询
│   ├── get_weather.py                   # 和风天气查询
│   └── get_hotel.py                     # LLM 生成酒店推荐
│
├── 🔍 RAG 系统 (rag-system/)
│   ├── rag_api.py                       # Flask RAG 微服务
│   ├── import_travel_guides.py          # 导入攻略到 Milvus
│   └── original_data/travel_guides/     # 200+城市旅行攻略
│
├── 🤖 模型文件
│   ├── qwen3-0_6b/                      # Qwen3-0.6B 基座模型
│   ├── qwen3-0_6b_lora_v1_last_assistant/  # LoRA v1
│   └── qwen3-0_6b_lora_v2_last_assistant/  # LoRA v2
│
└── 📦 数据文件
    ├── merged_train_final_multiturn_v2.json  # 最终训练集（19MB）
    └── merged_test_final.json                # 测试集（1.7MB）
```

### 2.2 完整数据流

```
┌─────────────────────────────────────────────────────────────┐
│                    数据生成与处理流水线                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  generate_dataset.py                                        │
│  ┌──────────────────┐                                       │
│  │ 100个城市 × 模板  │──→ 1010条原始对话                      │
│  │ + LLM 生成变体    │    (travel_assistant_dataset.json)     │
│  └──────────────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  convert_dataset_final_fixed.py                             │
│  ┌──────────────────────────┐                               │
│  │ 原始数据 → TravelAssistant │──→ 完整对话 + 工具调用        │
│  │ 实际执行工具调用生成结果     │    (converted_batch_xxx.json) │
│  └──────────────────────────┘                               │
│           │                                                 │
│           ▼                                                 │
│  conversation_splitter.py                                   │
│  ┌──────────────────────────┐                               │
│  │ 1轮对话 → N个训练样本      │──→ 多轮训练数据               │
│  │ 最后一轮 × 3（重复增强）   │    (multiturn_v2.json)        │
│  └──────────────────────────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                       训练流水线                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  train_qwen_last_assistant_lora.py                          │
│  ┌───────────────────────────────┐                          │
│  │ Qwen3-0.6B + LoRA(r=32)       │                          │
│  │ 只计算最后 assistant 的 loss    │──→ LoRA 适配器权重        │
│  │ cosine lr + warmup 3%          │                          │
│  └───────────────────────────────┘                          │
│           │                                                 │
│           ▼                                                 │
│  merge_lora_into_base.py                                    │
│  ┌───────────────────────────────┐                          │
│  │ 基座模型 + LoRA adapter        │──→ 合并后的完整模型       │
│  │ merge_and_unload()            │                          │
│  └───────────────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                       推理流水线                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  travel_assistant_funcall_fixed.py                           │
│  ┌─────────┐    ┌──────────┐    ┌──────────────┐           │
│  │ 用户输入 │──→│ LLM 推理  │──→│ 工具调用判断   │           │
│  └─────────┘    └──────────┘    └──────┬───────┘           │
│                                        │                    │
│                    ┌───────────────────┼───────────────┐    │
│                    ▼                   ▼               ▼    │
│              search_travel_guide  get_weather  query_route  │
│              (RAG检索)            (和风API)    (高德API)     │
│                    │                   │               │    │
│                    └───────────────────┼───────────────┘    │
│                                        ▼                    │
│                                  LLM 整合结果并回答          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 五大工作流详解

### 3.1 工作流1：旅行规划

```
用户: "我想下个月去成都玩5天"
  ↓
Assistant 判断: 旅行规划 → 需要攻略和天气
  ↓
Tool Call 1: search_travel_guide(location="成都", search_mode="hybrid")
  → 返回: "成都攻略：宽窄巷子、武侯祠、锦里、大熊猫基地..."
  ↓
Tool Call 2: get_weather_info(location="成都", start_date="2026-04-26", num_days=5)
  → 返回: [{"date":"4/26","天气":"多云","温度":"16-24°C"}, ...]
  ↓
Assistant: "根据攻略和天气，为您规划5天行程：
  Day1: 宽窄巷子+锦里（多云24°C，适合户外）
  Day2: 大熊猫基地（建议早上去）..."
```

### 3.2 工作流2：路线导航

```
用户: "从天安门到颐和园怎么走？"
  ↓
Tool Call: query_route(start_location="天安门", end_location="颐和园", city_code="110000")
  → 返回三种方式：
    步行: 18.5km, 约3.5小时
    公交: 地铁4号线→..., 约1.5小时, ¥5
    驾车: 17km, 约40分钟
  ↓
Assistant: "为您查询了三种出行方式：..."
```

### 3.3 工作流3：酒店推荐（最复杂）

```
用户: "推荐杭州西湖附近500元以内的酒店"
  ↓
Tool Call 1: recommend_hotels(requirements="杭州西湖附近，500元以内")
  → 返回: ["西湖印象酒店 ¥380", "湖畔居客栈 ¥298", ...]
  ↓
Tool Call 2: get_hotel_reviews(hotel_name="西湖印象酒店")  ← 紧接着查评价！
  → 返回: "评分4.5/5，位置好，服务周到..."
  ↓
Assistant: 综合推荐信息和评价给用户
```

> [!warning] 关键设计
> 酒店工作流要求**连续调用两个工具**——先推荐再查评价，中间不能停下来回复用户。这是训练数据中重点强调的模式。

### 3.4 工作流4：旅行闲聊

```
用户: "去云南需要带什么衣服？"
  ↓
Assistant 判断: 旅行相关闲聊，不需要工具
  ↓
直接回答: "云南早晚温差大，建议带薄外套和防晒用品..."
```

### 3.5 工作流5：拒绝非旅行话题

```
用户: "帮我写一段Python代码"
  ↓
Assistant: "抱歉，我是旅行助手，只能帮您处理旅行相关的问题哦~"
```

---

## 4. 关键代码解析

### 4.1 数据生成（`generate_dataset.py`）

数据分布设计体现了**工程思维**：

```python
# 数据分布（共1010条）
workflow_1_with_dest = 400     # 旅行规划（有目的地）
workflow_1_need_clarify = 50   # 旅行规划（需追问目的地）
workflow_2_direct = 100        # 路线查询（直接问）
workflow_2_need_followup = 20  # 路线查询（需追问）
workflow_3_direct = 200        # 酒店推荐（直接）
workflow_3_need_followup = 40  # 酒店推荐（需追问）
workflow_4 = 100               # 闲聊
workflow_5 = 100               # 拒绝

# 为什么旅行规划最多？因为这是最核心、最常用的功能
# 为什么要有"需追问"版本？教模型学会在信息不足时主动提问
```

### 4.2 LoRA 训练的"只训练最后一轮"策略

```python
# 关键：only_last_assistant=True
train_dataset = JsonlConversations(
    args.train_file,
    tokenizer,
    args.max_seq_length,
    only_last_assistant=True,  # ← 核心！
    default_tools=default_tools,
)
```

> [!note] 为什么只训练最后一轮 assistant 的 loss？
>
> 一条多轮对话中有多个 assistant 回复，但**只有最后一轮是"新学"到的**，前面的轮次在之前的训练样本中已经作为"最后一轮"被训练过了（因为 `conversation_splitter.py` 做了拆分）。
>
> 这避免了**重复计算梯度**，让训练更高效、收敛更快。

**例子**：一条 3 轮对话会被拆分成 3 个训练样本：

```
样本1: [sys, user1, assistant1✅]
样本2: [sys, user1, assistant1, user2, assistant2✅]
样本3: [sys, user1, assistant1, user2, assistant2, user3, assistant3✅✅✅]

✅ = 计算 loss 的部分
✅✅✅ = 最后一轮重复3次增强
```

### 4.3 多轮对话拆分的 3x 增强

```python
# conversation_splitter.py 核心逻辑
for i, msg in enumerate(messages):
    if msg["role"] == "assistant":
        # 取从开头到当前 assistant 的所有消息
        sub_conversation = messages[:i+1]

        if is_last_assistant:
            # 最后一轮复制3份，增加权重
            results.extend([sub_conversation] * 3)
        else:
            results.append(sub_conversation)
```

> [!question] 为什么最后一轮要 3x？
> 最后一轮通常包含完整的工具调用链和最终回答，是模型最需要学好的部分。3x 增强相当于对这一轮施加更大的训练权重。

### 4.4 RAG 混合检索

```python
# rag_api.py 中的混合检索
def hybrid_search(self, query, top_k=5):
    # 1. 向量检索：语义匹配
    vector_results = self.vector_search(query, top_k=20)

    # 2. 关键词检索：精确匹配
    keyword_results = self.keyword_search(query, top_k=20)

    # 3. RRF 融合
    rrf_scores = {}
    k = 60  # RRF常数
    for rank, doc in enumerate(vector_results):
        rrf_scores[doc.id] = 1 / (k + rank)
    for rank, doc in enumerate(keyword_results):
        rrf_scores[doc.id] = rrf_scores.get(doc.id, 0) + 1 / (k + rank)

    # 按 RRF 分数排序，取 top_k
    return sorted(rrf_scores.items(), key=lambda x: -x[1])[:top_k]
```

**例子理解 RRF**：

假设查询"杭州美食"，两种检索结果：

| 文档 | 向量排名 | 关键词排名 | RRF分数 |
|------|---------|-----------|---------|
| 杭州美食攻略 | 1 | 2 | 1/61 + 1/62 = 0.0326 |
| 杭州旅行攻略 | 2 | 1 | 1/62 + 1/61 = 0.0326 |
| 苏州美食攻略 | 3 | - | 1/63 = 0.0159 |
| 杭州交通攻略 | - | 3 | 1/63 = 0.0159 |

→ 两种检索都排前面的文档 RRF 分数最高。

### 4.5 合并 LoRA 到基座模型

```python
# merge_lora_into_base.py
from peft import PeftModel

# 1. 加载基座模型
base_model = AutoModelForCausalLM.from_pretrained("qwen3-0_6b")

# 2. 加载 LoRA 适配器
lora_model = PeftModel.from_pretrained(base_model, "qwen3-0_6b_lora_v2")

# 3. 合并权重：W_merged = W_base + ΔW_lora
merged_model = lora_model.merge_and_unload()

# 4. 保存为独立模型（不再需要 peft 库来推理）
merged_model.save_pretrained("qwen3-0_6b_merged")
```

---

## 5. 工具实现细节

### 5.1 路线查询（高德地图 API）

```python
# tools/get_route.py

def geocode(address):
    """地址 → 经纬度坐标"""
    url = f"https://restapi.amap.com/v3/geocode/geo?address={address}&key={AMAP_KEY}"
    # 返回: "116.397128,39.916527"

def query_routes(start, end, city_code):
    """一次返回三种出行方式"""
    walking = get_walking(start, end)     # 步行
    transit = get_transit(start, end, city_code)  # 公交
    driving = get_driving(start, end)     # 驾车
    return {"walking": walking, "transit": transit, "driving": driving}
```

### 5.2 天气查询（和风天气 API）

```python
# tools/get_weather.py

def get_weather_by_date_range(location, start_date, num_days):
    """查询连续多天天气"""
    # 调用和风天气 API，返回结构化数据
    return [
        {"date": "2026-04-01", "day_weather": "晴",
         "day_temp": "22", "night_temp": "12",
         "sunrise": "06:15", "sunset": "18:42"},
        # ...
    ]
```

### 5.3 酒店推荐（LLM 生成）

```python
# tools/get_hotel.py — 注意：这个工具用 LLM 生成而非真实 API

def get_hotel_recommendations(requirements):
    """用 LLM 根据需求生成酒店推荐"""
    prompt = f"根据以下需求推荐3-5家酒店：{requirements}"
    response = llm.call(prompt)
    return response  # LLM 生成的酒店列表

def get_hotel_reviews(hotel_name):
    """用 LLM 生成酒店评价"""
    prompt = f"生成{hotel_name}的用户评价"
    response = llm.call(prompt)
    return response
```

> [!note] 设计取舍
> 酒店工具用 LLM 生成而非真实 API，因为项目重点是训练模型的**工具调用能力**，而不是真正的酒店数据。如果 LLM 调用失败，会降级到 mock 数据。

---

## 6. LLM 统一接口

`llm_main.py` 封装了 10+ 模型的统一调用接口：

```python
class LLMManager:
    MODELS = {
        "gpt-5":        {"provider": "openai",    "model": "gpt-5"},
        "claude-opus":  {"provider": "anthropic",  "model": "claude-opus-4-20250514"},
        "qwen-plus":    {"provider": "alibaba",    "model": "qwen-plus"},
        "deepseek-v3":  {"provider": "deepseek",   "model": "deepseek-chat"},
        "gemini-pro":   {"provider": "google",     "model": "gemini-2.5-pro"},
        # ...
    }

    def call_model(self, model_key, messages, stream=False, tools=None):
        """统一接口，自动路由到对应 provider"""
        config = self.MODELS[model_key]
        if config["provider"] == "openai":
            return self._call_openai(config, messages, stream, tools)
        elif config["provider"] == "anthropic":
            return self._call_anthropic(config, messages, stream, tools)
        # ...
```

---

## 7. 训练超参数解析

```bash
# run_train_last_assistant.sh

python train_qwen_last_assistant_lora.py \
    --model_name_or_path ./qwen3-0_6b \           # 基座模型
    --train_file ./merged_train_final_multiturn_v2.json \  # 训练数据
    --output_dir ./qwen3-0_6b_lora_v2_last_assistant \     # 输出目录
    --max_seq_length 4096 \    # 最大序列长度（包含工具调用）
    --learning_rate 2e-4 \     # 学习率（LoRA 通常比全量微调大）
    --num_train_epochs 3 \     # 3个epoch
    --per_device_train_batch_size 1 \   # 显存有限，batch=1
    --gradient_accumulation_steps 8 \   # 等效 batch_size=8
    --warmup_ratio 0.03 \      # 前3%步数 warmup
    --lr_scheduler_type cosine \  # 余弦退火
    --bf16 \                   # BF16 精度（省显存）
    --gradient_checkpointing \ # 梯度检查点（用时间换显存）
    --lora_r 32 \              # LoRA 秩
    --lora_alpha 64 \          # LoRA 缩放
    --tools_file ./all_tools.json  # 全局工具定义
```

> [!tip] 超参数经验法则
> - `learning_rate`：LoRA 通常用 1e-4 ~ 5e-4，比全量微调（1e-5 ~ 5e-5）大一个数量级
> - `lora_alpha / lora_r = 2`：缩放比通常为 2
> - `gradient_accumulation_steps × batch_size = 有效batch`：8×1=8
> - `warmup_ratio=0.03`：让学习率慢慢上升，防止初期震荡

---

## 8. 优化方案

### 8.1 数据优化

| 优化点 | 当前状态 | 改进方向 |
|--------|---------|---------|
| 数据量 | 1010条原始 | 可增加到5000+，覆盖更多场景 |
| 城市覆盖 | 100个城市 | 扩展到300+，含海外城市 |
| 负样本 | 100条拒绝 | 增加边界场景（如半旅行半编程的问题） |
| 数据质量 | LLM生成 | 加入人工审核和筛选流程 |
| 多语言 | 仅中文 | 增加英文训练数据 |

### 8.2 训练优化

| 优化点 | 当前状态 | 改进方向 |
|--------|---------|---------|
| 基座模型 | Qwen3-0.6B | 升级到 Qwen3-4B 或 7B 提升能力 |
| LoRA 秩 | r=32 | 实验 r=16 vs r=64，找最优平衡 |
| 训练轮次 | 3 epochs | 监控 loss 曲线，可能 2 epochs 就够 |
| 评估 | 无自动评估 | 加入 Function Calling 准确率指标 |
| DPO/RLHF | 无 | SFT 后加 DPO 对齐，提升拒绝能力 |

### 8.3 RAG 优化

| 优化点 | 当前状态 | 改进方向 |
|--------|---------|---------|
| Embedding | text-embedding-v4 | 尝试 BGE-M3 等开源模型降低成本 |
| 分块策略 | 按城市整篇存储 | 按段落分块+重叠，提升检索精度 |
| 检索阈值 | 固定阈值 | 动态阈值或 reranker 二次排序 |
| 数据更新 | 静态200+攻略 | 定期爬取更新，保持时效性 |
| 检索效果 | 无量化评估 | 建立标注集，计算 recall@k |

### 8.4 推理优化

| 优化点 | 当前状态 | 改进方向 |
|--------|---------|---------|
| 部署 | 本地 Python 脚本 | 用 vLLM/TGI 部署，提升吞吐量 |
| 缓存 | 无 | 加入查询缓存，热门城市秒回 |
| 工具并行 | 串行调用 | 攻略和天气可以并行调用 |
| 流式输出 | 支持 | 确保工具调用期间有 loading 提示 |
| 容错 | 基本容错 | 工具失败时的优雅降级策略 |

---

## 9. 关键设计模式总结

### 9.1 Agent ReAct 循环

```python
# travel_assistant_funcall_fixed.py 中的核心循环（简化版）
while True:
    response = llm.chat(messages, tools=tools)

    if response.tool_calls:
        # 模型决定调用工具
        for tool_call in response.tool_calls:
            result = execute_tool(tool_call.function.name,
                                  tool_call.function.arguments)
            messages.append({"role": "tool", "content": result})
        # 带着工具结果继续对话
    else:
        # 模型直接回答，结束循环
        print(response.content)
        break
```

### 9.2 数据飞轮

```
合成数据 → 训练模型 → 模型生成更多/更好的数据 → 再训练
```

本项目中 `convert_dataset_final_fixed.py` 用**大模型（qwen-plus）**生成训练数据来训练**小模型（qwen3-0.6B）**，这是**知识蒸馏**的一种变体。

### 9.3 工具去重机制

```python
# convert_dataset_final_fixed.py 中防止重复调用
called_tools = set()
for tool_call in response.tool_calls:
    call_key = f"{tool_call.function.name}:{tool_call.function.arguments}"
    if call_key not in called_tools:
        called_tools.add(call_key)
        result = execute_tool(tool_call)
```

---

## 10. 常见问题 FAQ

> [!faq]- Q: 为什么选 Qwen3-0.6B 这么小的模型？
> A: 小模型推理快、部署成本低。通过 SFT 让小模型专精于旅行助手这一垂直领域，比通用大模型更高效。这体现了"小模型 + 精准微调 > 大模型 + 通用能力"的思路。

> [!faq]- Q: LoRA 和全量微调怎么选？
> A: LoRA 优势：训练快、显存省、可以保存多个适配器切换任务。全量微调优势：能力天花板更高。本项目用 LoRA 因为 0.6B 参数量较小，LoRA 已经足够。

> [!faq]- Q: 为什么不直接用 GPT-4 / Claude 做旅行助手？
> A: 成本和延迟。自己微调的小模型：推理成本约 1/100，延迟约 1/10。在旅行助手这个特定场景下，微调后的小模型质量可以接近大模型。

> [!faq]- Q: RAG 和 SFT 可以互相替代吗？
> A: 不能。RAG 提供**知识**（旅行攻略内容），SFT 提供**能力**（知道何时调用什么工具）。两者互补：SFT 教模型"调用 search_travel_guide"，RAG 确保这个函数能返回有用内容。

---

## 11. 技术栈总结

```
┌────────────────────────────────────────────────┐
│  框架/库              用途                       │
├────────────────────────────────────────────────┤
│  PyTorch             深度学习框架                │
│  Transformers        模型加载/训练               │
│  PEFT                LoRA 实现                  │
│  Datasets            数据集处理                  │
│  Accelerate          分布式训练                  │
│  TRL                 训练工具（可选）             │
│  Flask               RAG 微服务                 │
│  PyMilvus            向量数据库客户端             │
│  jieba               中文分词（关键词检索）       │
│  OpenAI SDK          调用各类 LLM API            │
│  requests            调用天气/地图 API            │
└────────────────────────────────────────────────┘
```

---

## 12. 测试题

测试题在单独文件中：[[旅行助手Agent+SFT_测试题]]
答案在：[[旅行助手Agent+SFT_测试题答案]]
