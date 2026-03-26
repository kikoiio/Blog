# 一、提示词工程（Prompt Engineering）

## 1. 大模型API调用基础

大模型API调用是指通过HTTP接口向大语言模型发送请求并获取生成结果的过程。目前主流提供商（OpenAI、阿里通义、硅基流动、百度文心、火山引擎、腾讯云等）均采用兼容OpenAI SDK的接口格式，只需更换 `base_url` 和 `api_key` 即可切换不同模型。

- 所有LLM应用的基础——无论是聊天机器人、RAG系统还是Agent，底层都依赖API调用
- 统一的OpenAI兼容格式降低了学习和切换成本
- 掌握API调用才能进行参数调优、流式输出、结构化输出等进阶操作

**基本调用模板：**

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.openai.com/v1/",  # 更换为不同提供商的URL
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一个有帮助的助手。"},
        {"role": "user", "content": "请解释什么是RAG"}
    ]
)

print(response.choices[0].message.content)
```

**流式输出（Streaming）：**

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "请解释RAG"}],
    stream=True
)

for chunk in response:
    # 部分模型有reasoning_content（思考过程）
    if hasattr(chunk.choices[0].delta, 'reasoning_content'):
        reasoning = chunk.choices[0].delta.reasoning_content
        if reasoning:
            print(reasoning, end='')
    # 正式回复内容
    content = chunk.choices[0].delta.content
    if content:
        print(content, end='')
```

> [!note] 多提供商切换
> 阿里通义：`base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"`
> 硅基流动：`base_url="https://api.siliconflow.cn/v1"`
> 百度文心：`base_url="https://qianfan.baidubce.com/v2"`
> 只需替换 `base_url` 和 `api_key`，代码结构完全不变。

---

## 2. 关键生成参数

生成参数控制模型输出的随机性、多样性和长度等特征。

不同任务需要不同的生成策略：代码生成需要确定性高的输出（低temperature），创意写作需要多样性（高temperature），而结构化输出需要严格格式控制。

| 参数 | 作用 | 取值范围 | 使用建议 |
|------|------|----------|----------|
| `max_tokens` | 最大生成token数 | 正整数 | 根据任务需求设置上限 |
| `temperature` | 控制随机性 | 0.0 ~ 2.0 | 代码/事实类=0.0，对话=0.7，创意=1.0+ |
| `top_p` | 核采样概率阈值 | 0.0 ~ 1.0 | 与temperature二选一调节 |
| `top_k` | 候选token数量 | 正整数 | 限制每步只考虑概率最高的k个token |
| `repetition_penalty` | 重复惩罚 | > 0 | 1.0=不惩罚，>1.0=减少重复 |
| `seed` | 随机种子 | 整数 | 固定seed可获得可复现输出 |

**Temperature的数学原理——Softmax温度缩放：**

$$P(x_i) = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}$$

- $T \to 0$：概率集中在最高logit的token上，输出几乎确定
- $T = 1$：标准softmax分布
- $T > 1$：概率分布趋于均匀，输出更随机

```python
response = client.chat.completions.create(
    model="gpt-4o",
    temperature=0.0,     # 确定性输出
    max_tokens=500,
    messages=[{"role": "user", "content": "列出Python的5个核心特性"}]
)
```

> [!warning] 参数冲突
> `temperature` 和 `top_p` 通常不建议同时调整。如果你设置了 `temperature=0`，就不需要再设 `top_p`。

---

## 1.3 结构化输出（Structured Output）

### 是什么？

结构化输出让大模型按照预定义的JSON Schema返回数据，确保输出格式可解析、可编程处理。

### 为什么？

- 直接将LLM输出用于下游程序处理（如存入数据库、调用API）
- 避免手动解析自然语言回复中的关键信息
- 提高系统的健壮性和可靠性

### 怎么做？

**方法一：使用Pydantic定义输出格式（推荐）**

```python
from pydantic import BaseModel

class MovieReview(BaseModel):
    title: str
    rating: float
    summary: str
    keywords: list[str]

completion = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "请分析用户提供的电影评论。"},
        {"role": "user", "content": "《流浪地球2》特效震撼，剧情宏大，是中国科幻电影的里程碑。"}
    ],
    response_format=MovieReview
)

result = completion.choices[0].message.parsed
print(result.title)     # 流浪地球2
print(result.rating)    # 9.0
print(result.keywords)  # ['科幻', '特效', '中国电影']
```

**方法二：JSON模式**

```python
response = client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": "请以JSON格式返回分析结果，包含title、rating、summary字段。"},
        {"role": "user", "content": "分析《流浪地球2》"}
    ]
)
```

> [!tip] 实践建议
> Pydantic方式更安全——它自动做类型校验。JSON模式需要在system prompt中明确描述你期望的字段结构。

---

## 1.4 提示词模板设计

### 是什么？

提示词模板是一套结构化的指令格式，用于引导模型产生高质量、符合预期的回复。

### 为什么？

好的提示词模板能显著提升模型表现。不同类型的模型（推理型 vs 非推理型）适合不同的模板结构。

### 怎么做？

**非推理模型模板（如GPT-4o、Qwen）：**

```
角色：你是一位{领域}专家。
任务：{具体任务描述}
要求：
1. {约束条件1}
2. {约束条件2}
输出格式：{期望格式}
```

**推理模型模板（如DeepSeek-R1、QwQ）：**

推理模型不需要"一步步思考"的指令（它们自带CoT能力），而是需要明确的任务边界：

```
任务：{任务描述}
约束：{具体约束}
输入：{用户输入}
```

> [!note] 关键区别
> 推理模型（如DeepSeek-R1）自带思维链能力，不需要在prompt中写"请一步步思考"。非推理模型则需要显式引导推理过程。

---

## 1.5 Few-shot Learning（少样本学习）

### 是什么？

在提示词中提供几个输入-输出示例，让模型学习期望的回答模式，无需微调即可适应新任务。

### 为什么？

- 比zero-shot（零样本）更精确——模型能从示例中推断任务规则
- 比微调成本低——不需要训练数据和GPU
- 适合格式要求严格的任务

### 怎么做？

```python
messages = [
    {"role": "system", "content": "你是一个情感分析助手。"},
    # 示例1
    {"role": "user", "content": "这家餐厅的菜太难吃了"},
    {"role": "assistant", "content": "负面"},
    # 示例2
    {"role": "user", "content": "服务态度很好，环境也不错"},
    {"role": "assistant", "content": "正面"},
    # 示例3
    {"role": "user", "content": "价格一般，味道还行"},
    {"role": "assistant", "content": "中性"},
    # 实际问题
    {"role": "user", "content": "性价比超高，下次还来！"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    temperature=0
)
# 输出：正面
```

> [!tip] 示例选择原则
> 1. 示例应覆盖所有预期的输出类别
> 2. 示例应简短明确，避免模糊边界
> 3. 通常3-5个示例即可获得良好效果

---

## 1.6 Chain of Thought（思维链推理）

### 是什么？

通过在提示词中引导模型逐步推理（而非直接给出答案），显著提升复杂推理任务的准确率。

### 为什么？

- 直接回答复杂问题时模型容易出错
- 逐步推理让模型能"检查"中间步骤
- 对数学、逻辑、多步推理任务效果显著

### 怎么做？

**Zero-shot CoT：**

```python
messages = [
    {"role": "user", "content": """
一个商店有100个苹果。第一天卖出了30%，第二天卖出了剩余的50%。
还剩多少个苹果？

请一步一步地思考，然后给出最终答案。
"""}
]
```

模型会输出：
1. 初始：100个苹果
2. 第一天卖出：100 x 30% = 30个，剩余70个
3. 第二天卖出：70 x 50% = 35个，剩余35个
4. 最终答案：35个

**Few-shot CoT：**

在示例中直接展示推理过程，模型会模仿这种逐步推理的方式。

---

## 1.7 Self-Consistency（自一致性）

### 是什么？

对同一个问题多次采样（使用较高temperature），然后通过投票选出最一致的答案。

### 为什么？

- 单次推理可能因随机性出错
- 多次推理取众数能提高准确率
- 是对CoT的自然增强

### 怎么做？

```python
import collections

def self_consistency(question, n_samples=5):
    answers = []
    for _ in range(n_samples):
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.7,  # 需要一定随机性以产生多样答案
            messages=[
                {"role": "user", "content": f"{question}\n请一步步思考并给出最终答案。"}
            ]
        )
        # 提取最终答案（需要根据具体格式解析）
        answers.append(extract_final_answer(response))

    # 投票：选出出现次数最多的答案
    counter = collections.Counter(answers)
    return counter.most_common(1)[0][0]
```

> [!example] 应用场景
> 适合数学题、逻辑推理、选择题等有明确答案的任务。对于开放式生成任务（如写作）不适用。

---

# 第二部分：Function Call（函数调用）

## 2.1 Function Call机制

### 是什么？

Function Call让大模型能够"调用外部函数"——模型根据用户意图决定调用哪个函数、传入什么参数，开发者执行函数后将结果返回给模型生成最终回复。

### 为什么？

- 大模型无法直接获取实时数据（天气、股票、数据库等）
- 模型无法执行计算或操作外部系统
- Function Call是构建Agent的基础能力

### 怎么做？

**完整流程（以查询天气为例）：**

**第一步：定义工具（JSON Schema）**

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "查询指定城市的天气信息",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，例如：北京"
                    }
                },
                "required": ["city"],
                "additionalProperties": False
            }
        }
    }
]
```

**第二步：发送请求，模型决定是否调用函数**

```python
messages = [{"role": "user", "content": "北京今天天气怎么样？"}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools
)

# 检查模型是否决定调用函数
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    print(tool_call.function.name)       # "get_weather"
    print(tool_call.function.arguments)  # '{"city": "北京"}'
```

**第三步：执行函数并返回结果**

```python
import json

def get_weather(city):
    # 实际中调用天气API
    return {"city": city, "temperature": "25°C", "condition": "晴"}

# 解析参数并执行
args = json.loads(tool_call.function.arguments)
result = get_weather(**args)

# 将函数结果返回给模型
messages.append(response.choices[0].message)  # 加入模型的tool_call消息
messages.append({
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": json.dumps(result, ensure_ascii=False)
})

# 模型基于函数结果生成最终回复
final_response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools
)

print(final_response.choices[0].message.content)
# 输出：北京今天天气晴朗，温度25°C，适合外出活动。
```

> [!warning] 关键细节
> 1. `strict: True` 确保模型严格按照schema生成参数，不会遗漏或添加字段
> 2. `tool_call_id` 必须与原始调用的id匹配
> 3. 函数结果以 `role: "tool"` 的消息返回

---

# 第三部分：RAG基础

## 3.1 RAG概念与原理

### 是什么？

RAG（Retrieval-Augmented Generation，检索增强生成）是一种将外部知识检索与大模型生成能力结合的技术。模型不再仅依赖训练数据，而是在回答时先检索相关文档，再基于检索结果生成回复。

### 为什么？

- **解决知识时效性问题**：模型训练数据有截止日期，RAG可以接入最新信息
- **减少幻觉**：基于真实文档回答，而非模型"想象"
- **支持私有数据**：企业内部文档、个人知识库等模型未见过的数据
- **降低成本**：比微调便宜，且知识库可随时更新

### RAG的核心流程

```
用户提问 → 向量化查询 → 在向量数据库中检索相似文档 → 将文档+问题送入LLM → 生成回答
```

---

## 3.2 向量嵌入与余弦相似度

### 是什么？

**向量嵌入（Embedding）** 将文本转换为高维数值向量，语义相近的文本在向量空间中距离更近。

**余弦相似度** 是衡量两个向量方向相似程度的指标。

### 余弦相似度公式

$$\text{cosine\_similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{||\vec{A}|| \times ||\vec{B}||}$$

- 值域：[-1, 1]
- 1 = 完全相同方向（最相似）
- 0 = 正交（不相关）
- -1 = 完全相反方向

### 怎么做？

```python
import numpy as np

def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

# 创建嵌入
response = client.embeddings.create(
    model="text-embedding-ada-002",
    input="什么是人工智能？"
)
query_embedding = response.data[0].embedding
```

---

## 3.3 从零实现基础RAG

### 是什么？

不依赖任何框架，用纯Python + OpenAI API实现完整的RAG管道。

### 怎么做？

**步骤一：PDF文本提取**

```python
import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path):
    mypdf = fitz.open(pdf_path)
    all_text = ""
    for page_num in range(mypdf.page_count):
        page = mypdf[page_num]
        all_text += page.get_text("text")
    return all_text
```

**步骤二：文本分块（固定长度+重叠）**

```python
def chunk_text(text, n=1000, overlap=200):
    chunks = []
    for i in range(0, len(text), n - overlap):
        chunks.append(text[i:i + n])
    return chunks
```

**步骤三：创建嵌入向量**

```python
def create_embeddings(text, model="text-embedding-ada-002"):
    response = client.embeddings.create(model=model, input=text)
    return response
```

**步骤四：语义搜索**

```python
def semantic_search(query, text_chunks, embeddings, k=5):
    query_embedding = create_embeddings(query).data[0].embedding
    similarity_scores = []
    for i, chunk_embedding in enumerate(embeddings):
        score = cosine_similarity(
            np.array(query_embedding),
            np.array(chunk_embedding.embedding)
        )
        similarity_scores.append((i, score))
    similarity_scores.sort(key=lambda x: x[1], reverse=True)
    top_indices = [idx for idx, _ in similarity_scores[:k]]
    return [text_chunks[idx] for idx in top_indices]
```

**步骤五：基于检索结果生成回复**

```python
def generate_response(query, context, model="gpt-4o"):
    system_prompt = "你是一名AI助手，只根据提供的上下文回答问题。"
    user_prompt = f"Context:\n{context}\n\nQuestion: {query}\n\n请基于上下文回答。"

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    return response.choices[0].message.content
```

---

## 3.4 LlamaIndex快速上手

### 是什么？

LlamaIndex是一个专为RAG设计的框架，将复杂的RAG流程封装为简洁的API。

### 为什么？

- 4行代码即可实现完整RAG
- 内置多种数据加载器、索引类型、检索策略
- 支持高级功能：对话记忆、Agent、流式输出等

### 怎么做？

**最简RAG（4行代码）：**

```python
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

documents = SimpleDirectoryReader("./data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("什么是人工智能？")
print(response)
```

**LlamaIndex核心组件：**

| 组件 | 作用 | 示例 |
|------|------|------|
| Data Connectors | 加载数据 | SimpleDirectoryReader, PyMuPDFReader, WebReader |
| Data Indexes | 构建索引 | VectorStoreIndex, FAISS |
| Engines | 查询/对话 | QueryEngine, ChatEngine |
| Data Agents | 自主工具调用 | FunctionTool, QueryEngineTool |

**配置模型与分块：**

```python
from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(model="gpt-4o", temperature=0)
Settings.embed_model = OpenAIEmbedding(model_name="text-embedding-ada-002")
Settings.text_splitter = SentenceSplitter(chunk_size=1000, chunk_overlap=200)
```

**使用FAISS向量存储：**

```python
import faiss
from llama_index.vector_stores.faiss import FaissVectorStore
from llama_index.core import StorageContext

d = 1536  # embedding维度
faiss_index = faiss.IndexFlatL2(d)
vector_store = FaissVectorStore(faiss_index=faiss_index)
storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
```

**对话引擎（带记忆）：**

```python
from llama_index.core.memory import ChatMemoryBuffer

memory = ChatMemoryBuffer.from_defaults(token_limit=15000)
chat_engine = index.as_chat_engine(
    chat_mode="context",
    memory=memory,
    system_prompt="你是一个有帮助的AI助手。"
)
response = chat_engine.chat("什么是深度学习？")
# 多轮对话自动保留上下文
response2 = chat_engine.chat("它有哪些应用？")
```

---

# 第四部分：高级RAG技术（21种）

> [!note] 学习路径
> 以下21种技术按照"分块优化 → 检索增强 → 生成优化 → 系统级策略"的逻辑组织，建议按顺序学习。

---

## 4.1 语义分块（Semantic Chunking）

### 是什么？

与固定长度分块不同，语义分块根据句子之间的**语义相似度变化**来决定分块边界。当连续句子之间的相似度突然下降时，说明话题发生了切换，此处即为分块点。

### 为什么？

- 固定长度分块可能在句子中间截断，丢失语义完整性
- 语义分块保证每个块在内容上是连贯的
- 提高检索时的命中精度

### 怎么做？

**核心流程：**
1. 将文本按句子分割
2. 为每个句子生成嵌入
3. 计算相邻句子的余弦相似度
4. 用断点方法找到相似度骤降的位置
5. 在断点处分割文本

**三种断点检测方法：**

```python
def compute_breakpoints(similarities, method="percentile", threshold=90):
    if method == "percentile":
        # 百分位法：相似度低于第X百分位的位置为断点
        threshold_value = np.percentile(similarities, threshold)
    elif method == "standard_deviation":
        # 标准差法：相似度低于 均值-X*标准差 的位置
        mean = np.mean(similarities)
        std_dev = np.std(similarities)
        threshold_value = mean - (threshold * std_dev)
    elif method == "interquartile":
        # IQR法：使用四分位距检测异常低值
        q1, q3 = np.percentile(similarities, [25, 75])
        threshold_value = q1 - 1.5 * (q3 - q1)

    return [i for i, sim in enumerate(similarities) if sim < threshold_value]
```

> [!tip] 方法选择
> **百分位法**（threshold=90）最常用，适合大多数场景。标准差法对数据分布敏感，IQR法对极端值鲁棒。

---

## 4.2 分块大小选择

### 是什么？

通过实验比较不同分块大小（如128、256、512字符）对检索质量的影响，选出最优值。

### 为什么？

- 块太小：缺少上下文，检索到的片段信息不完整
- 块太大：包含无关信息，降低检索精度
- 最佳块大小取决于具体文档和任务

### 怎么做？

评估指标：
- **忠实度（Faithfulness）**：回复是否忠于检索到的内容
- **相关性（Relevancy）**：检索到的内容是否与问题相关

一般经验：对中文文档，500-1000字符的块大小表现较好。建议在实际数据上做A/B测试。

---

## 4.3 上下文增强检索（Context-Enriched Retrieval）

### 是什么？

检索到最相关的文本块后，同时返回其前后相邻的块，提供更完整的上下文。

### 为什么？

- 最相关的块可能只包含答案的一部分
- 前后文块可能包含补充信息（如定义、例子）
- 提高回复的完整性

### 怎么做？

```python
def context_enriched_search(query, text_chunks, embeddings, k=1, context_size=1):
    query_embedding = create_embeddings(query).data[0].embedding
    similarity_scores = []

    for i, chunk_embedding in enumerate(embeddings):
        score = cosine_similarity(
            np.array(query_embedding),
            np.array(chunk_embedding.embedding)
        )
        similarity_scores.append((i, score))

    similarity_scores.sort(key=lambda x: x[1], reverse=True)
    top_index = similarity_scores[0][0]

    # 取前后context_size个块
    start = max(0, top_index - context_size)
    end = min(len(text_chunks), top_index + context_size + 1)

    return [text_chunks[i] for i in range(start, end)]
```

> [!example] 效果
> 查询"什么是XAI"时，不仅返回XAI定义的块，还返回前一块（伦理AI原则）和后一块（隐私保护），提供完整的AI伦理上下文。

---

## 4.4 上下文片段标题（Contextual Chunk Headers）

### 是什么？

使用LLM为每个文本块生成一个描述性标题，嵌入时同时嵌入标题和内容，检索时综合两者的相似度。

### 为什么？

- 文本块可能缺少主题关键词（比如一个讲XAI的段落可能没有"可解释性"这个词）
- 标题可以补充高层语义信息
- 综合标题和内容的相似度能提高检索准确率

### 怎么做？

```python
def generate_chunk_header(chunk, model="gpt-4o"):
    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": "Generate a concise and informative title for the given text."},
            {"role": "user", "content": chunk}
        ]
    )
    return response.choices[0].message.content.strip()

# 检索时综合标题和内容的相似度
def semantic_search(query, chunks, k=5):
    query_embedding = create_embeddings(query)
    similarities = []
    for chunk in chunks:
        sim_text = cosine_similarity(query_embedding, chunk["embedding"])
        sim_header = cosine_similarity(query_embedding, chunk["header_embedding"])
        avg_similarity = (sim_text + sim_header) / 2
        similarities.append((chunk, avg_similarity))
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [x[0] for x in similarities[:k]]
```

---

## 4.5 文档增强RAG（QA对生成）

### 是什么？

为每个文本块使用LLM生成若干个相关问题，将这些问题连同原文块一起存入向量库。检索时，用户查询不仅与原文匹配，还与生成的问题匹配。

### 为什么？

- 用户的提问方式可能与原文表述差异很大
- 生成的问题更接近用户可能的提问方式
- 通过问题匹配间接找到答案所在的文本块

### 怎么做？

```python
def generate_questions(text_chunk, num_questions=5, model="gpt-4o"):
    system_prompt = "你是一名擅长从文本中提炼关键信息并生成相关问题的专家。"
    user_prompt = f"请根据以下文本内容，生成 {num_questions} 个不同的问题：\n\n{text_chunk}"

    response = client.chat.completions.create(
        model=model,
        temperature=0.7,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )
    # 解析返回的问题列表...
    return questions

# 处理文档时，为每个块生成问题并存入向量库
for i, chunk in enumerate(text_chunks):
    chunk_embedding = create_embeddings(chunk)
    vector_store.add_item(text=chunk, embedding=chunk_embedding,
                          metadata={"type": "chunk", "index": i})

    questions = generate_questions(chunk, num_questions=3)
    for question in questions:
        q_embedding = create_embeddings(question)
        vector_store.add_item(text=question, embedding=q_embedding,
                              metadata={"type": "question", "chunk_index": i,
                                        "original_chunk": chunk})
```

> [!note] 检索结果处理
> 搜索结果中可能同时包含直接匹配的文本块和匹配的问题。需要去重——通过问题的 `chunk_index` 找到原始文本块，合并所有引用的不重复文本块作为上下文。

---

## 4.6 查询转换（Query Transformation）

### 是什么？

在检索前对用户查询进行改写或分解，以提高检索效果。包含三种技术：
1. **查询重写**：使查询更具体、更详细
2. **后退提示（Step-back Prompting）**：生成更宽泛的查询以获取背景知识
3. **子查询分解**：将复杂查询拆解为多个简单子问题

### 为什么？

- 用户查询往往过于简短或模糊
- 重写可补充关键术语，提高检索精度
- 后退提示获取宏观上下文
- 子查询确保复杂问题的各个方面都被覆盖

### 怎么做？

```python
def rewrite_query(original_query, model="gpt-4o"):
    """将查询改写得更具体、更详细"""
    system_prompt = "你是一名擅长优化检索查询的AI助手。"
    user_prompt = f"请将下列查询改写为更具体、更详细的表达：\n原始查询：{original_query}"
    response = client.chat.completions.create(
        model=model, temperature=0.0,
        messages=[{"role": "system", "content": system_prompt},
                  {"role": "user", "content": user_prompt}]
    )
    return response.choices[0].message.content.strip()

def generate_step_back_query(original_query, model="gpt-4o"):
    """生成更宽泛的后退查询"""
    system_prompt = "你的任务是将具体查询改写为更宽泛的问题，以获取背景信息。"
    # ...
    return step_back_query

def decompose_query(original_query, num_subqueries=4, model="gpt-4o"):
    """将复杂查询拆解为子问题"""
    system_prompt = "你的任务是把复杂查询分解为若干简单子问题。"
    # ...
    return sub_queries  # List[str]
```

> [!example] 实际效果
> 原始查询："中国政府在AI上有哪些政策？"
> - 重写后："2023年中国政府在人工智能领域的政策和战略有哪些具体内容？涉及技术研发、数据隐私、伦理规范等方面。"
> - 后退查询："各国政府在人工智能领域通常会制定哪些类型的政策和战略？"
> - 子查询：1.总体发展战略 2.研究创新措施 3.伦理监管政策 4.行业应用推动

---

## 4.7 重排序（Reranking）

### 是什么？

对初次检索返回的结果进行二次排序，将最相关的内容排到最前面。

### 为什么？

- 向量相似度搜索是"粗排"，可能存在语义偏差
- 重排序利用更精细的模型或规则进行"精排"
- 可以结合语义理解和关键词匹配

### 怎么做？

**方法一：LLM重排序（精度高，成本高）**

```python
def rerank_with_llm(query, chunks, model="gpt-4o"):
    scored_chunks = []
    for chunk in chunks:
        prompt = f"""请根据查询对以下文本的相关性打分（0-10分）。
查询：{query}
文本：{chunk['text']}
只返回数字分数。"""
        response = client.chat.completions.create(
            model=model, temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        score = float(response.choices[0].message.content.strip())
        scored_chunks.append({**chunk, "rerank_score": score})

    scored_chunks.sort(key=lambda x: x["rerank_score"], reverse=True)
    return scored_chunks
```

**方法二：关键词重排序（成本低，速度快）**

```python
import jieba

def rerank_with_keywords(query, chunks):
    query_keywords = set(jieba.cut(query))
    scored_chunks = []
    for chunk in chunks:
        chunk_words = list(jieba.cut(chunk['text']))
        score = 0
        for keyword in query_keywords:
            if keyword in chunk_words:
                # 位置越靠前，分数越高
                pos = chunk_words.index(keyword) / len(chunk_words)
                freq = chunk_words.count(keyword)
                score += (1 - pos) * 0.5 + freq * 0.5
        scored_chunks.append({**chunk, "keyword_score": score})

    scored_chunks.sort(key=lambda x: x["keyword_score"], reverse=True)
    return scored_chunks
```

---

## 4.8 相关段落提取（RSE）

### 是什么？

RSE（Relevant Segment Extraction）不是逐块独立判断相关性，而是找出文档中**连续最相关的段落**。它借鉴了最大子数组算法的思想。

### 为什么？

- 答案可能跨越多个相邻块
- 逐块检索可能漏掉中间过渡内容
- RSE能找到最优的连续段落区间

### 怎么做？

```python
def calculate_chunk_values(similarities, threshold=0.5, irrelevant_penalty=-0.2):
    """将相似度转换为收益值：相关块=正分，不相关块=负分"""
    values = []
    for sim in similarities:
        if sim >= threshold:
            values.append(sim)       # 相关块贡献正分
        else:
            values.append(irrelevant_penalty)  # 不相关块扣分
    return values

def find_best_segments(values, max_segments=3, min_length=1):
    """使用最大子数组变体寻找最优连续段落"""
    segments = []
    n = len(values)

    for _ in range(max_segments):
        best_sum = float('-inf')
        best_start = best_end = 0
        current_sum = 0
        start = 0

        for i in range(n):
            current_sum += values[i]
            if current_sum > best_sum and (i - start + 1) >= min_length:
                best_sum = current_sum
                best_start = start
                best_end = i
            if current_sum < 0:
                current_sum = 0
                start = i + 1

        if best_sum <= 0:
            break

        segments.append((best_start, best_end, best_sum))
        # 将已选区间置零，避免重复选择
        for i in range(best_start, best_end + 1):
            values[i] = 0

    return segments
```

---

## 4.9 上下文压缩（Contextual Compression）

### 是什么？

对检索到的文本块进行压缩，只保留与查询相关的关键信息，去除冗余内容。

### 为什么？

- 检索到的块往往包含大量与查询无关的信息
- 压缩后的上下文更精炼，LLM生成回复更准确
- 减少token消耗，降低成本
- 实验显示可实现72%-89%的压缩率

### 怎么做？

```python
def compress_chunk(chunk, query, compression_type="selective", model="gpt-4o"):
    if compression_type == "selective":
        prompt = f"只保留以下文本中与问题直接相关的句子：\n问题：{query}\n文本：{chunk}"
    elif compression_type == "summary":
        prompt = f"用2-3个简短句子总结以下文本中与问题相关的内容：\n问题：{query}\n文本：{chunk}"
    elif compression_type == "extraction":
        prompt = f"从以下文本中提取与问题相关的关键事实和数据：\n问题：{query}\n文本：{chunk}"

    response = client.chat.completions.create(
        model=model, temperature=0,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()
```

> [!tip] 压缩类型选择
> - **Selective**：保留原句，适合需要精确引用的场景
> - **Summary**：生成摘要，适合概览性回答
> - **Extraction**：提取事实数据，适合结构化信息需求

---

## 4.10 反馈回路RAG（Feedback Loop RAG）

### 是什么？

根据用户对RAG回复的反馈（满意/不满意），动态调整检索策略，持续优化系统性能。

### 为什么？

- 用户反馈是最直接的质量信号
- 高质量的QA对可以反哺向量库
- 实现RAG系统的自我进化

### 怎么做？

```python
def store_feedback(feedback_store, query, response, feedback_score, context):
    """存储用户反馈"""
    feedback_store.append({
        "query": query,
        "response": response,
        "feedback": feedback_score,  # 1=满意, 0=不满意
        "context": context
    })

def fine_tune_index(vector_store, feedback_store):
    """用高质量反馈增强向量库"""
    for item in feedback_store:
        if item["feedback"] >= 4:  # 高分反馈
            # 将高质量QA对作为新文档加入向量库
            qa_text = f"Q: {item['query']}\nA: {item['response']}"
            embedding = create_embeddings(qa_text)
            vector_store.add_item(
                text=qa_text,
                embedding=embedding,
                metadata={"type": "feedback", "relevance_score": 1.2}  # 提升权重
            )
```

---

## 4.11 自适应检索（Adaptive Retrieval）

### 是什么？

根据查询类型自动选择最佳检索策略。不同类型的问题适合不同的检索方式。

### 为什么？

- 事实性问题需要精确匹配
- 分析性问题需要多角度检索
- 观点类问题需要多样化来源
- 一刀切的策略无法适应所有查询

### 怎么做？

```python
def classify_query(query, model="gpt-4o"):
    """将查询分类为四种类型"""
    prompt = f"""将以下查询分类为：factual/analytical/opinion/contextual
查询：{query}
只返回类型名称。"""
    response = client.chat.completions.create(
        model=model, temperature=0,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip().lower()

def adaptive_retrieval(query, vector_store):
    query_type = classify_query(query)

    if query_type == "factual":
        # 精确匹配，少量高相似度结果
        return vector_store.similarity_search(query_embedding, k=3)
    elif query_type == "analytical":
        # 多角度检索，结合子查询分解
        sub_queries = decompose_query(query)
        results = []
        for sq in sub_queries:
            results.extend(vector_store.similarity_search(sq_embedding, k=2))
        return deduplicate(results)
    elif query_type == "opinion":
        # 多样化来源
        return vector_store.similarity_search(query_embedding, k=5)
    elif query_type == "contextual":
        # 上下文增强检索
        return context_enriched_search(query, ...)
```

---

## 4.12 Self-RAG（自反思RAG）

### 是什么？

Self-RAG在RAG的每个阶段加入**自我评估**，包括：是否需要检索、检索结果是否相关、回复是否有依据、回复质量如何。

### 为什么？

- 并非所有问题都需要检索（如"1+1=？"）
- 检索到的内容可能不相关
- 模型可能"忽略"检索结果而自行编造
- 多维度评估确保回复质量

### 怎么做？

```python
def self_rag(query, vector_store):
    # 1. 判断是否需要检索
    needs_retrieval = determine_if_retrieval_needed(query)
    if not needs_retrieval:
        return generate_without_retrieval(query)

    # 2. 检索文档
    results = vector_store.similarity_search(query_embedding, k=5)

    best_response = None
    best_utility = 0

    for result in results:
        # 3. 评估相关性
        relevance = evaluate_relevance(query, result["text"])  # "relevant"/"irrelevant"
        if relevance != "relevant":
            continue

        # 4. 生成回复
        response = generate_response(query, result["text"])

        # 5. 评估支撑度
        support = assess_support(response, result["text"])  # "fully"/"partially"/"no"

        # 6. 评估效用
        utility = rate_utility(query, response)  # 1-5分

        if utility > best_utility:
            best_utility = utility
            best_response = response

    return best_response
```

> [!warning] 成本考量
> Self-RAG需要多次LLM调用进行评估，API成本约为普通RAG的3-5倍。适合对回复质量要求极高的场景。

---

## 4.13 命题分块（Proposition Chunking）

### 是什么？

将文本块进一步分解为**原子化的事实命题**——每个命题包含一个独立、自包含的事实陈述。

### 为什么？

- 传统分块粒度太粗，一个块可能包含多个无关事实
- 命题级别的检索更精确——查询直接匹配具体事实
- 提高检索的召回率和精准率

### 怎么做？

```python
def generate_propositions(text_chunk, model="gpt-4o"):
    prompt = """将以下文本分解为独立的、自包含的事实命题。
每个命题应该：
1. 表达一个完整的事实
2. 脱离上下文也能理解
3. 尽可能简洁

文本：{text_chunk}

请以编号列表形式输出所有命题。"""
    response = client.chat.completions.create(
        model=model, temperature=0,
        messages=[{"role": "user", "content": prompt}]
    )
    return parse_propositions(response.choices[0].message.content)

def evaluate_proposition(proposition, original_chunk, model="gpt-4o"):
    """评估命题的质量：准确性、清晰性、完整性、简洁性"""
    # 返回0-5的评分
    ...
```

---

## 4.14 多模态RAG（Multi-modal RAG）

### 是什么？

处理包含文本和图像的文档，对图像使用视觉模型生成描述，将图像描述与文本统一检索。

### 为什么？

- 很多文档包含重要的图表、流程图
- 纯文本RAG会完全忽略图像信息
- 图像描述让视觉信息也能被语义检索

### 怎么做？

```python
def extract_content_from_pdf(pdf_path):
    """提取文本和图像"""
    doc = fitz.open(pdf_path)
    content = {"text": "", "images": []}

    for page in doc:
        content["text"] += page.get_text("text")
        for img_info in page.get_images():
            xref = img_info[0]
            img_data = doc.extract_image(xref)
            content["images"].append(img_data)

    return content

def generate_image_caption(image_base64, model="gpt-4o"):
    """使用视觉模型为图像生成描述"""
    response = client.chat.completions.create(
        model=model,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "请详细描述这张图片的内容。"},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/png;base64,{image_base64}"
                }}
            ]
        }]
    )
    return response.choices[0].message.content
```

---

## 4.15 融合检索（Fusion Retrieval）

### 是什么？

将**向量语义搜索**与**BM25关键词搜索**结合，通过加权融合两种分数获取最终排序。

### 为什么？

- 向量搜索擅长语义匹配（"汽车"→"车辆"）
- BM25擅长精确关键词匹配（专有名词、缩写）
- 融合两者的优势，比单独使用任一方法都好

### 怎么做？

```python
from rank_bm25 import BM25Okapi
import jieba

def fusion_retrieval(query, text_chunks, embeddings, alpha=0.5):
    """alpha控制向量搜索与BM25的权重"""
    # 向量搜索分数
    query_embedding = create_embeddings(query)
    vector_scores = [cosine_similarity(query_embedding, emb) for emb in embeddings]

    # BM25分数
    tokenized_chunks = [list(jieba.cut(chunk)) for chunk in text_chunks]
    bm25 = BM25Okapi(tokenized_chunks)
    query_tokens = list(jieba.cut(query))
    bm25_scores = bm25.get_scores(query_tokens)

    # 归一化
    vector_scores = normalize(vector_scores)
    bm25_scores = normalize(bm25_scores)

    # 加权融合
    combined = alpha * vector_scores + (1 - alpha) * bm25_scores

    top_indices = np.argsort(combined)[-k:][::-1]
    return [text_chunks[i] for i in top_indices]
```

> [!tip] alpha参数调节
> `alpha=0.7`（偏向语义）适合自然语言问题；`alpha=0.3`（偏向关键词）适合包含专业术语的查询。

---

## 4.16 图RAG（Graph RAG）

### 是什么？

构建**知识图谱**来表示文档中的概念和关系，通过图遍历而非向量相似度来检索相关信息。

### 为什么？

- 向量搜索只看局部相似性，无法理解概念间的关系
- 知识图谱能捕获"A导致B""A是B的子类"等结构化关系
- 图遍历可以发现多跳推理路径

### 怎么做？

```python
import networkx as nx

def extract_concepts(text_chunk, model="gpt-4o"):
    """使用LLM从文本中提取概念和关系"""
    prompt = f"""从以下文本中提取关键概念及其关系。
格式：概念A -> 关系 -> 概念B
文本：{text_chunk}"""
    response = client.chat.completions.create(model=model, ...)
    return parse_concepts(response.choices[0].message.content)

def build_knowledge_graph(text_chunks):
    """构建知识图谱"""
    graph = nx.Graph()
    for chunk in text_chunks:
        concepts = extract_concepts(chunk)
        for concept_a, relation, concept_b in concepts:
            graph.add_node(concept_a)
            graph.add_node(concept_b)
            graph.add_edge(concept_a, concept_b, relation=relation)
    return graph

def traverse_graph(graph, query_concepts, max_depth=2):
    """从查询相关节点出发，BFS遍历图获取相关信息"""
    relevant_nodes = set()
    for concept in query_concepts:
        if concept in graph:
            # 广度优先搜索，限制深度
            for node in nx.bfs_tree(graph, concept, depth_limit=max_depth):
                relevant_nodes.add(node)
    return relevant_nodes
```

---

## 4.17 分层检索RAG（Hierarchical Retrieval）

### 是什么？

构建两级索引：**摘要级**（每页/每章的摘要）和**详细级**（原始文本块）。检索时先在摘要级定位相关章节，再在对应章节的详细块中精确检索。

### 为什么？

- 直接在大量小块中搜索容易引入噪声
- 两级过滤逐步缩小范围，提高精度
- 类似人类查阅文档：先看目录，再看具体章节

### 怎么做？

```python
def generate_page_summary(page_text, model="gpt-4o"):
    """为每页生成摘要"""
    response = client.chat.completions.create(
        model=model, temperature=0,
        messages=[{"role": "user", "content": f"请用2-3句话总结：\n{page_text}"}]
    )
    return response.choices[0].message.content

def retrieve_hierarchically(query, summary_store, detailed_store, top_summaries=3, top_chunks=5):
    """分层检索"""
    # 第一级：在摘要中搜索，定位相关页面
    query_embedding = create_embeddings(query)
    summary_results = summary_store.similarity_search(query_embedding, k=top_summaries)

    # 获取相关页面的ID
    relevant_pages = [r["metadata"]["page_id"] for r in summary_results]

    # 第二级：只在相关页面的详细块中搜索
    filtered_results = detailed_store.similarity_search(
        query_embedding, k=top_chunks,
        filter={"page_id": {"$in": relevant_pages}}
    )

    return filtered_results
```

---

## 4.18 HyDE（假设文档嵌入）

### 是什么？

HyDE（Hypothetical Document Embeddings）先让LLM生成一个"假设性回答文档"，再用这个假设文档的嵌入去检索真实文档。

### 为什么？

- 用户查询通常很短（"什么是XAI？"），嵌入信息量有限
- 假设文档包含更丰富的语义信息
- 假设文档与真实文档在嵌入空间中更接近

### 怎么做？

```python
def generate_hypothetical_document(query, model="gpt-4o"):
    """生成假设性回答"""
    prompt = f"请写一段可能回答以下问题的文档内容（不需要完全准确）：\n{query}"
    response = client.chat.completions.create(
        model=model, temperature=0.7,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def hyde_rag(query, vector_store):
    # 1. 生成假设文档
    hypothetical_doc = generate_hypothetical_document(query)

    # 2. 用假设文档的嵌入检索
    hyp_embedding = create_embeddings(hypothetical_doc)
    results = vector_store.similarity_search(hyp_embedding, k=5)

    # 3. 基于真实检索结果生成回复
    context = "\n".join([r["text"] for r in results])
    return generate_response(query, context)
```

> [!warning] 注意事项
> HyDE的效果依赖于假设文档的质量。如果LLM对该领域完全不了解，生成的假设文档可能误导检索方向。

---

## 4.19 CRAG（纠正式RAG）

### 是什么？

CRAG（Corrective RAG）在检索后评估文档相关性，根据相关性得分决定：直接使用、知识精炼、或转向网络搜索补充信息。

### 为什么？

- 检索到的文档可能不相关
- 知识库可能不包含最新信息
- 网络搜索作为补充来源提高回答的全面性

### 怎么做？

```python
def evaluate_document_relevance(query, document, model="gpt-4o"):
    """评估文档与查询的相关性（0-1分）"""
    prompt = f"评估以下文档与查询的相关性（0-1分）：\n查询：{query}\n文档：{document}"
    response = client.chat.completions.create(model=model, ...)
    return float(response.choices[0].message.content.strip())

def crag_pipeline(query, vector_store):
    # 1. 检索文档
    results = vector_store.similarity_search(query_embedding, k=5)

    # 2. 评估每篇文档的相关性
    for result in results:
        result["relevance"] = evaluate_document_relevance(query, result["text"])

    # 3. 根据相关性分级处理
    high_relevance = [r for r in results if r["relevance"] >= 0.7]
    medium_relevance = [r for r in results if 0.3 <= r["relevance"] < 0.7]

    if high_relevance:
        # 高相关性：直接使用
        context = "\n".join([r["text"] for r in high_relevance])
    elif medium_relevance:
        # 中等相关性：精炼知识 + 网络搜索补充
        refined = [refine_knowledge(query, r["text"]) for r in medium_relevance]
        web_results = web_search(rewrite_search_query(query))
        context = "\n".join(refined + web_results)
    else:
        # 低相关性：完全依赖网络搜索
        web_results = web_search(query)
        context = "\n".join(web_results)

    return generate_response(query, context)
```

---

## 4.20 强化学习增强RAG（RL-enhanced RAG）

### 是什么？

使用强化学习（RL）训练一个策略网络来动态选择最优的RAG操作（查询重写、上下文扩展、过滤、生成），以最大化回复质量。

### 为什么？

- 不同查询在不同阶段需要不同的策略
- 固定流程无法适应所有场景
- RL可以通过反复尝试学习最优决策序列

### 怎么做？

**RL组件定义：**

```python
def define_state(query, context, history):
    """状态 = 当前查询 + 已有上下文 + 操作历史"""
    return {"query": query, "context": context, "history": history}

def define_action_space():
    """可选操作"""
    return ["rewrite_query", "expand_context", "filter_context", "generate_response"]

def calculate_reward(response, reference_answer):
    """奖励 = 回复与参考答案的余弦相似度"""
    resp_emb = create_embeddings(response)
    ref_emb = create_embeddings(reference_answer)
    return cosine_similarity(resp_emb, ref_emb)

def policy_network(state, epsilon=0.1):
    """epsilon-greedy策略：以epsilon概率随机探索，否则选最优"""
    if random.random() < epsilon:
        return random.choice(define_action_space())
    else:
        return select_best_action(state)
```

**训练循环：**

```python
def training_loop(queries, reference_answers, num_episodes=100):
    for episode in range(num_episodes):
        for query, ref_answer in zip(queries, reference_answers):
            state = define_state(query, "", [])
            total_reward = 0

            for step in range(max_steps):
                action = policy_network(state, epsilon)
                new_state, reward = rl_step(state, action)
                total_reward += reward
                # 更新策略网络...
                state = new_state

                if action == "generate_response":
                    break
```

> [!note] 实际应用
> RL增强RAG目前仍处于研究阶段，实际部署中更常见的是规则驱动的自适应策略（如4.11节）。RL方法在训练数据充足时可以发现更优的策略组合。

---

# 第五部分：综合测验

> [!tip] 测验说明
> 共20道题，包含选择题和简答题。请独立完成后再对照答案文件。

**一、选择题**

**第1题**：在OpenAI API中，哪个参数控制输出的随机性？
A. max_tokens
B. temperature
C. top_k
D. seed

**第2题**：当temperature趋近于0时，模型的输出特性是？
A. 更加随机多样
B. 更加确定性（趋向最高概率token）
C. 输出更长
D. 不受影响

**第3题**：Function Call中，函数执行结果应该以什么role返回给模型？
A. user
B. assistant
C. system
D. tool

**第4题**：RAG中使用的余弦相似度值域是？
A. [0, 1]
B. [-1, 1]
C. [0, ∞)
D. (-∞, +∞)

**第5题**：以下哪种分块方法基于语义变化来确定分块边界？
A. 固定长度分块
B. 语义分块
C. 重叠分块
D. 按段落分块

**第6题**：上下文增强检索（Context-Enriched Retrieval）的核心思想是？
A. 压缩检索结果
B. 检索最相关块及其前后相邻块
C. 对查询进行重写
D. 用BM25替代向量搜索

**第7题**：文档增强RAG中，为文本块生成问题的主要目的是？
A. 训练模型
B. 扩展用户查询
C. 让用户查询能通过问题匹配间接找到答案文本块
D. 减少向量库大小

**第8题**：查询转换中"后退提示（Step-back Prompting）"的策略是？
A. 将查询改写得更具体
B. 将查询分解为子问题
C. 生成更宽泛的查询以获取背景信息
D. 直接使用原始查询

**第9题**：融合检索中，BM25算法的优势是？
A. 语义理解能力强
B. 精确关键词匹配
C. 多模态处理
D. 跨语言检索

**第10题**：HyDE技术的核心思路是？
A. 用真实文档去检索
B. 先生成假设回答，用假设回答的嵌入去检索真实文档
C. 用多个查询融合检索
D. 构建知识图谱检索

**二、简答题**

**第11题**：请简述RAG系统的核心流程（5个步骤）。

**第12题**：语义分块中的"百分位法"断点检测是如何工作的？

**第13题**：Self-RAG相比普通RAG，增加了哪些自我评估环节？各自的作用是什么？

**第14题**：请解释CRAG（纠正式RAG）中三级相关性处理策略。

**第15题**：Graph RAG与普通向量检索RAG的根本区别是什么？在什么场景下Graph RAG更有优势？

**第16题**：分层检索RAG的"两级索引"分别是什么？这种设计的优势是什么？

**第17题**：上下文压缩有哪三种类型？各自适合什么场景？

**第18题**：请解释Few-shot Learning中示例选择的三个原则。

**第19题**：强化学习增强RAG中的state、action、reward分别代表什么？

**第20题**：请比较"查询重写"、"后退提示"和"子查询分解"三种查询转换技术的适用场景。

---

# 第六部分：知识体系思维导图

```
提示词工程与RAG
├── 一、提示词工程
│   ├── API调用基础
│   │   ├── OpenAI兼容格式
│   │   ├── 流式输出（Streaming）
│   │   └── 多提供商切换
│   ├── 生成参数
│   │   ├── temperature / top_p / top_k
│   │   ├── max_tokens / seed
│   │   └── repetition_penalty
│   ├── 结构化输出
│   │   ├── Pydantic模式
│   │   └── JSON模式
│   ├── 提示词模板
│   │   ├── 推理模型模板
│   │   └── 非推理模型模板
│   └── 高级技巧
│       ├── Few-shot Learning
│       ├── Chain of Thought
│       └── Self-Consistency
│
├── 二、Function Call
│   ├── 工具定义（JSON Schema）
│   ├── 模型决策调用
│   ├── 函数执行
│   └── 结果回传与最终生成
│
├── 三、RAG基础
│   ├── 核心概念
│   │   ├── 向量嵌入
│   │   ├── 余弦相似度
│   │   └── 检索-生成流程
│   ├── 从零实现
│   │   ├── PDF提取
│   │   ├── 文本分块
│   │   ├── 嵌入创建
│   │   ├── 语义搜索
│   │   └── 回复生成
│   └── LlamaIndex框架
│       ├── 4行代码RAG
│       ├── Data Connectors
│       ├── Vector Store (FAISS)
│       ├── Query/Chat Engine
│       └── Data Agents
│
└── 四、高级RAG技术（21种）
    ├── 分块优化
    │   ├── 语义分块
    │   ├── 分块大小选择
    │   ├── 上下文片段标题
    │   ├── 命题分块
    │   └── 文档增强（QA对）
    ├── 检索增强
    │   ├── 上下文增强检索
    │   ├── 查询转换（重写/后退/分解）
    │   ├── 融合检索（向量+BM25）
    │   ├── 图RAG
    │   ├── 分层检索
    │   ├── HyDE
    │   └── 相关段落提取（RSE）
    ├── 结果优化
    │   ├── 重排序（LLM/关键词）
    │   ├── 上下文压缩
    │   └── 多模态RAG
    └── 系统级策略
        ├── 反馈回路RAG
        ├── 自适应检索
        ├── Self-RAG
        ├── CRAG（纠正式RAG）
        └── RL增强RAG
```

---

> [!tip] 学习建议
> 1. **先掌握基础**：提示词工程 → Function Call → 基础RAG → LlamaIndex
> 2. **再学进阶**：语义分块 → 查询转换 → 重排序 → 融合检索
> 3. **最后攻克系统级**：Self-RAG → CRAG → 自适应检索 → RL增强
> 4. **动手实践**：每个技术都在从零-RAG大师的对应notebook中有完整代码实现，建议逐个运行理解。

---

*本教程基于以下学习资料整理：提示词工程+Functioncall+RAG（4个notebook）、从零-RAG大师（22个notebook）*
