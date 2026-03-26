# AI Agent 与 MCP 协议完全教程

> [!note] 教程说明
> 本教程涵盖 AI Agent 的完整架构设计、RAG 组件实现、Web 搜索模块、ReAct/Reflexion 框架，以及 MCP（Model Context Protocol）协议的原理与实践。所有代码和案例均来自实际项目。

---

# 第一部分：AI Agent 基础架构

## 1.1 什么是 AI Agent？

**是什么？**

AI Agent 是一种以大型语言模型（LLM）作为"大脑"的自主或半自主系统。与传统的对话式 AI 不同，Agent 不仅能够对话，还能调用外部工具、访问网络、运行代码、自动执行复杂任务。

**为什么需要 AI Agent？**

传统对话式 AI 存在明显局限：知识只来自训练数据（静态）、无法执行操作、不能访问实时信息。AI Agent 通过给 LLM "赋予双手"，让它从简单问答跃升为能完成完整任务链的"智能工作者"。

| 对比维度 | 传统对话式 AI | 基于 LLM 的 AI Agent |
|---------|------------|-------------------|
| 交互方式 | 单轮或有限多轮对话 | 支持多轮交互，任务持续性强 |
| 能力边界 | 仅限于预设回复 | 可动态调用工具，灵活执行复杂任务 |
| 知识更新 | 静态（训练时固定） | 可实时联网，获取最新信息 |
| 执行复杂任务 | 很弱 | 支持规划、执行、反馈、修正的闭环流程 |

**怎么做？——五大核心模块**

一个完整的 AI Agent 包含以下五个核心模块：

1. **Planning（计划模块）**：理解目标任务，拆解为可执行的步骤，生成行动计划
2. **Memory（记忆模块）**：存储历史记录和上下文信息，支持长期记忆与短期记忆
3. **Tools（工具模块）**：调用外部工具（搜索引擎、API、代码执行器等），实现感知-行动闭环
4. **Executor（执行模块）**：根据计划执行每一步操作，反馈结果并调整策略
5. **Output（输出模块）**：综合所有信息，生成最终回答

> [!tip] 核心理念
> 对我们而言，核心是深入一个场景，把最牛的做这件事情的人的流程拆解下来，将 know-how 融入到工作流中。

---

## 1.2 Agent 的真实应用场景：电动车销售助手

以"星辰电动 ES9 销售助手"为例，看 Agent 如何工作。

**场景**：用户问"比较一下和华为汽车的优劣势"。

这个问题涉及两个信息源：本地产品文档（ES9 参数）和网络上的竞品信息（华为汽车），单靠一次检索无法完成。Agent 需要：

1. **Plan**：分析用户意图，决定同时使用"本地文档搜索"和"网络搜索"
2. **Tools**：分别执行本地 RAG 检索和网络搜索
3. **Memory**：将检索到的信息存储在记忆列表中
4. **Executor**：依次执行搜索任务，收集结果
5. **Output**：综合所有信息生成对比分析回答

---

# 第二部分：RAG 组件实现（Milvus + BGE-M3）

## 2.1 什么是 RAG？

**是什么？**

RAG（Retrieval-Augmented Generation，检索增强生成）是一种将外部知识库与 LLM 结合的技术架构。它先从知识库中检索相关文档，再将检索结果作为上下文传给 LLM 生成回答。

**为什么需要 RAG？**

LLM 的知识有截止日期，且无法获取私有数据（如公司内部产品文档）。RAG 让 LLM 在回答时能够引用最新、最准确的信息源。

**怎么做？——RAG 的四个步骤**

### 步骤一：文档解析

使用 LlamaParse 将 PDF 文档解析为 Markdown 格式的文本：

```python
from llama_cloud_services import LlamaParse

parser = LlamaParse(
    api_key="your_api_key",
    result_type="markdown",
    num_workers=3,
    language="ch_sim",  # 中文简体
)

file_extractor = {".pdf": parser}
documents_cloud = SimpleDirectoryReader(
    "./data", file_extractor=file_extractor
).load_data()
```

> [!note] 关键点
> `result_type="markdown"` 将 PDF 转为 Markdown 格式，保留了标题层级和表格结构，有利于后续切块时保持语义完整性。

### 步骤二：文本切块

将长文本切分为适合向量化的小块（chunk），同时保持段落和表格的完整性：

```python
def chunk_text(text, max_chunk_size=300):
    lines = text.split('\n')
    chunks = []
    current_chunk = []
    current_size = 0
    in_table = False
    table_content = []

    for line in lines:
        # 检测表格开始（含有 | 字符的行）
        if '|' in line and not in_table:
            in_table = True
            if current_chunk:
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_size = 0
            table_content.append(line)
        elif in_table:
            table_content.append(line)
            if not line.strip():  # 空行表示表格结束
                in_table = False
                chunks.append('\n'.join(table_content))
                table_content = []
        else:
            line_length = len(line)
            if current_size + line_length > max_chunk_size and current_chunk:
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_size = 0
            current_chunk.append(line)
            current_size += line_length
    # 处理剩余内容...
    return chunks
```

> [!warning] 切块策略
> 切块大小（`max_chunk_size=300`）需要根据实际场景调优。太小会丢失上下文，太大会引入噪声。此处对表格做了特殊处理，避免表格被截断。

### 步骤三：向量化与存储（Milvus + BGE-M3）

**BGE-M3 模型**可以同时生成两种向量表示：
- **稠密向量（Dense）**：捕捉语义信息，适合语义相似度搜索
- **稀疏向量（Sparse）**：类似 TF-IDF，适合关键词精确匹配

```python
from milvus_model.hybrid import BGEM3EmbeddingFunction

# 加载 BGE-M3 模型
ef = BGEM3EmbeddingFunction(
    model_name_or_path="BAAI/bge-m3",
    use_fp16=False,
    device="cpu"
)

# 生成嵌入向量
chunks_embeddings = ef(chunks)
# chunks_embeddings["dense"]  -> 稠密向量列表
# chunks_embeddings["sparse"] -> 稀疏向量矩阵
```

在 **Milvus** 中创建 Collection，同时存储稠密向量和稀疏向量：

```python
from pymilvus import (
    connections, utility, FieldSchema,
    CollectionSchema, DataType, Collection,
)

connections.connect(uri="./milvus.db")

fields = [
    FieldSchema(name="pk", dtype=DataType.VARCHAR,
                is_primary=True, auto_id=True, max_length=100),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=512),
    FieldSchema(name="sparse_vector", dtype=DataType.SPARSE_FLOAT_VECTOR),
    FieldSchema(name="dense_vector", dtype=DataType.FLOAT_VECTOR,
                dim=dense_dim),
]

schema = CollectionSchema(fields)
col = Collection("hybrid_demo", schema, consistency_level="Strong")

# 分别为两种向量创建索引
col.create_index("sparse_vector",
                 {"index_type": "SPARSE_INVERTED_INDEX", "metric_type": "IP"})
col.create_index("dense_vector",
                 {"index_type": "AUTOINDEX", "metric_type": "IP"})
col.load()
```

> [!tip] 为什么选择 Milvus？
> Milvus 原生支持在同一个 Collection 中存储稠密向量和稀疏向量，这是实现混合检索的基础。`IP`（Inner Product）作为度量类型适用于归一化后的向量。

---

## 2.2 混合检索：稠密 + 稀疏 + WeightedRanker

**是什么？**

混合检索同时利用稠密向量的语义匹配能力和稀疏向量的关键词匹配能力，通过加权排序（WeightedRanker）融合两路结果，获得更高质量的检索效果。

**为什么？**

单独使用稠密检索可能遗漏包含关键术语的文档，单独使用稀疏检索则缺乏语义理解。二者互补。

**怎么做？**

```python
from pymilvus import AnnSearchRequest, WeightedRanker

def hybrid_search(col, query_dense_embedding, query_sparse_embedding,
                  sparse_weight=1.0, dense_weight=1.0, limit=10):
    # 构建稠密向量搜索请求
    dense_req = AnnSearchRequest(
        [query_dense_embedding], "dense_vector",
        {"metric_type": "IP", "params": {}}, limit=limit
    )
    # 构建稀疏向量搜索请求
    sparse_req = AnnSearchRequest(
        [query_sparse_embedding], "sparse_vector",
        {"metric_type": "IP", "params": {}}, limit=limit
    )
    # 使用 WeightedRanker 融合两路结果
    rerank = WeightedRanker(sparse_weight, dense_weight)
    res = col.hybrid_search(
        [sparse_req, dense_req], rerank=rerank,
        limit=limit, output_fields=["text"]
    )[0]
    return [hit.get("text") for hit in res]
```

调用示例：

```python
hybrid_results = hybrid_search(
    col,
    query_embeddings["dense"][0],
    query_embeddings["sparse"]._getrow(0),
    sparse_weight=0.7,  # 稀疏权重
    dense_weight=1.0,   # 稠密权重
)
```

> [!example] 实际效果对比
> 查询"什么是以人为本的座舱"时，稠密检索和稀疏检索的 Top3 结果一致，但排序不同。混合检索结合了两者的优势，将最相关的文档排在最前面。

---

## 2.3 封装 RAG 函数

将检索和生成步骤封装为一个完整的 RAG 函数：

```python
def rag(query):
    # 1. 检索
    formatted_references = format_list_with_markers(retrieval(query))

    # 2. 构造带引用的 Prompt
    prompt = f"""
    你是一个智能助手，负责根据用户的问题和提供的参考内容生成回答。
    1. 回答必须基于提供的参考内容。
    2. 每一块内容必须标注引用来源，格式为：[引用编号]。
    3. 如果没有参考内容，根据你自己的知识进行回答。

    参考内容：
    {formatted_references}

    用户问题：{query}
    """

    # 3. 调用 LLM 生成回答
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return formatted_references, completion.choices[0].message.content
```

---

# 第三部分：Web 搜索模块

## 3.1 网络搜索的挑战

**是什么？**

Web 搜索模块让 Agent 能够从互联网获取实时信息，弥补本地知识库的不足。

**为什么？**

本地 RAG 只能回答知识库中有的问题。当用户问"华为汽车最新动态"或"竞品对比"时，需要联网搜索。

**三大挑战：**
- 返回的网页中有大量无关信息（噪声）
- 搜索结果太多，需要找到最相关的内容
- 网页提取速度慢

## 3.2 Serper API 搜索

使用 Serper API（Google Search 的封装）获取搜索结果：

```python
# 在 websearch 模块的 fetch_web_content.py 中
# Serper API 返回搜索结果列表，包含标题、链接、摘要
```

## 3.3 网页爬取与内容提取

使用 `WebScraper` 类爬取网页并提取核心内容：

```python
class WebScraper:
    def __init__(self, user_agent='macOS'):
        self.headers = self._get_headers(user_agent)

    def get_webpage_html(self, url):
        if url.endswith(".pdf"):
            return requests.Response()  # 跳过 PDF
        try:
            response = requests.get(url, headers=self.headers, timeout=8)
            response.encoding = "utf-8"
        except requests.exceptions.Timeout:
            return requests.Response()
        return response

    def extract_main_content(self, html_soup, rule=0):
        main_content = []
        # 只提取 h1-h6 和 p 标签的内容
        tag_rule = re.compile("^(h[1-6]|p)")
        for tag in html_soup.find_all(tag_rule):
            tag_text = tag.get_text().strip()
            if tag_text and len(tag_text.split()) > 10:
                main_content.append(tag_text)
        return "\n".join(main_content).strip()
```

> [!note] 关键设计
> - 使用正则 `^(h[1-6]|p)` 只提取标题和段落标签，过滤导航栏、广告等噪声
> - `len(tag_text.split()) > 10`：只保留超过 10 个词的段落，进一步去噪
> - `timeout=8`：设置超时避免爬取卡死

## 3.4 内容重排序（Retrieval）

爬取到的网页内容通过向量化和相似度计算，筛选出与查询最相关的片段：

```python
class EmbeddingRetriever:
    TOP_K = 20

    def retrievel_embeddings(self, contents_list, link_list, query):
        metadatas = [{'url': link} for link in link_list]
        texts = self.text_splitter.create_documents(
            contents_list, metadatas=metadatas
        )
        # 使用 SentenceTransformer 进行嵌入
        embedding = SentenceTransformerEmbeddings(
            model_name='sentence-transformers/all-MiniLM-L6-v2'
        )
        # 使用 Chroma 向量数据库进行相似度检索
        db = Chroma.from_documents(documents=texts, embedding=embedding)
        retriever = db.as_retriever(
            search_kwargs={"k": min(self.TOP_K, len(texts))}
        )
        return retriever.get_relevant_documents(query)
```

**完整的 Web 检索流程：**

```
用户查询 -> Serper API 搜索 -> 多线程爬取网页 -> 提取正文内容
         -> 向量化 + Chroma 检索 -> 返回最相关的片段
```

> [!tip] 多线程加速
> 网页爬取使用多线程并发执行（10个线程），将总耗时从数十秒降低到几秒内完成。

---

# 第四部分：Agent 决策流程

## 4.1 Planning 模块：RAG vs Web Search 的规划

**是什么？**

Planning 模块是 Agent 的"大脑"，负责分析用户查询并决定使用哪些工具。

**怎么做？**

通过一个专门的 LLM 调用来进行任务规划：

```python
def agent_plan(query):
    prompt = '''
    你是一个专业的汽车销售助手的规划模块。你的任务是：
    1. 分析用户的查询:{0}
    2. 决定使用哪个工具（本地文档搜索或网络搜索）
    3. 将原始查询拆解或延伸为1-2个相关问题

    ## 工具选择规则
    - 涉及星辰电动ES9的具体信息时 -> 本地文档搜索
    - 涉及竞品对比、最新动态、实时数据时 -> 网络搜索

    ## 输出格式（JSON）
    [
      {{
        "action_name": "工具名称",
        "prompts": ["原始查询", "拆解问题1", "拆解问题2"]
      }}
    ]
    '''.format(query)
    result = middle_json_model(prompt)
    return json.loads(extract_json_content(result))
```

> [!example] 实际输出示例
> 用户问"比较一下和华为汽车的优劣势"时，Planning 模块输出：
> ```json
> [
>   {
>     "action_name": "本地文档搜索",
>     "prompts": [
>       "星辰电动ES9的技术规格和配置有哪些优势？",
>       "星辰电动ES9在智能驾驶和智能座舱方面有哪些特点？"
>     ]
>   },
>   {
>     "action_name": "网络搜索",
>     "prompts": [
>       "华为汽车的主要优势和特点是什么？",
>       "华为汽车的最新技术规格和市场反馈如何？"
>     ]
>   }
> ]
> ```

## 4.2 Executor 模块：执行动作

```python
def process_actions(actions):
    memory = []
    for action in actions:
        action_name = action['action_name']
        prompt = action['prompt']

        try:
            if action_name == '本地文档搜索':
                result = rag(prompt)
            elif action_name == '网络搜索':
                result = web_search_answer(prompt)
            else:
                result = f"未知的动作类型: {action_name}"

            memory.append({"提问": prompt, "结果": result})
        except Exception:
            continue

    return memory
```

## 4.3 Output 模块：最终生成

使用 DeepSeek-R1 等推理模型，基于 memory 中收集的所有信息生成最终回答：

```python
def final_answer(memory_global, user_query):
    final_prompt = f'''
    你是一个星辰电动ES9的智能销售助手。
    基于提供的参考内容进行回答，
    用有打动力的销售语言输出，突出星辰电动的优势。

    参考内容：{memory_global}
    用户问题：{user_query}
    '''
    completion = client.chat.completions.create(
        model="deepseek-r1",
        messages=[{"role": "user", "content": final_prompt}],
        stream=True,
    )
    # 流式输出思考过程和最终回答...
```

---

# 第五部分：ReAct 框架与 Reflexion 机制

## 5.1 ReAct（Reasoning + Acting）

**是什么？**

ReAct 是一种将推理（Reasoning）和行动（Acting）交织在一起的框架。模型在每一步都先推理"应该做什么"，然后执行行动，再根据行动结果继续推理。

**为什么？**

传统方法中，推理和行动是分开的。ReAct 让模型在推理过程中可以与外部环境交互（如调用搜索 API），从而：
- 缓解幻觉问题（通过外部信息验证）
- 减少错误传播
- 生成更具可解释性的决策过程

**怎么做？——在销售助手中的应用**

在我们的 Agent 中，ReAct 体现为：
1. **Reasoning**（Plan 模块）：分析用户问题，决定使用哪些工具
2. **Acting**（Executor 模块）：调用 RAG 或 Web Search 获取信息
3. **Reasoning**（基于结果继续推理）：决定信息是否充足
4. **Acting**（再次调用工具或生成最终回答）

---

## 5.2 Reflexion 机制（自我反思与改进）

**是什么？**

Reflexion 是一种通过语言反馈强化 Agent 的框架。Agent 在任务执行后进行自我反思，评估信息是否充足，识别可能的不足，并生成补充查询。

**为什么？**

一次检索往往不够全面。Reflexion 让 Agent 有机会"回头看"，发现遗漏的信息并进行补充。

**怎么做？**

Reflexion 包含三个角色：

1. **行动者（Actor）**：即前面的 Plan + Executor，负责执行任务
2. **评估者（Evaluator）**：评估当前收集的信息是否足够回答用户问题
3. **自我反思（Self-Reflection）**：分析不足并生成补充查询

```python
def reflection(user_query, memory_global):
    prompt = '''
    你是一个专业的汽车销售助手的规划模块。
    1. 分析用户的查询:{0}
    2. 基于已有的信息，是否还需要延伸再进行查询

    已有的信息: {1}

    至多再扩展不超过3个查询，
    如果需要扩展则输出JSON格式，如果不需要则返回None
    '''.format(user_query, memory_global)
    result = middle_json_model(prompt)
    return json.loads(extract_json_content(result))
```

**带 Reflexion 的完整 Agent 流程：**

```python
def agent_reflection(user_query):
    memory_global = []
    # 第一轮：规划 + 执行
    action_tool = agent_plan(user_query)
    actions = adjust_format(action_tool) if action_tool else []
    if actions:
        memory_new = process_actions(actions)
        memory_global.extend(memory_new[1:])

    # 反思：评估信息是否充足，决定是否需要补充
    action_reflect = reflection(user_query, memory_global)
    if action_reflect:
        print("回顾内容，进行反思...")
        memory_new = process_actions(action_reflect)
        memory_global.extend(memory_new)

    # 最终回答
    final_answer(memory_global, user_query)
```

> [!example] Reflexion 实际效果
> 用户问"比较一下和华为汽车的优劣势"，第一轮检索后，Reflexion 模块发现还缺少"华为汽车在智能驾驶方面的最新进展"和"ES9的用户评价中提到的优缺点"，于是生成补充查询：
> ```json
> [
>   {"action_name": "网络搜索",
>    "prompts": "华为汽车在智能驾驶和电池技术方面的最新进展"},
>   {"action_name": "本地文档搜索",
>    "prompts": "星辰电动ES9的用户评价中提到的主要优缺点"},
>   {"action_name": "网络搜索",
>    "prompts": "华为汽车的用户评价中提到的主要优缺点"}
> ]
> ```

---

# 第六部分：MCP 协议（Model Context Protocol）

## 6.1 什么是 MCP？

**是什么？**

MCP（Model Context Protocol，模型上下文协议）是由 Anthropic 提出的一种标准化协议，用于规范 LLM 与外部工具/服务之间的通信方式。它定义了 Client（客户端）和 Server（服务器）之间的交互规范。

**为什么出现了 MCP？**

在 MCP 出现之前，每个 AI 应用需要为每个外部工具编写专门的集成代码。如果有 M 个应用和 N 个工具，就需要 M x N 个适配器。MCP 将这个问题简化为：每个应用只需实现一个 MCP Client，每个工具只需实现一个 MCP Server，就能互相连接。

**MCP 的架构：**

```
┌──────────────┐    MCP协议    ┌──────────────┐
│   MCP Host   │◄────────────►│  MCP Server  │
│ (如 Claude   │              │ (工具/服务)    │
│  Desktop)    │              │              │
│  ┌────────┐  │              └──────────────┘
│  │MCP     │  │    MCP协议    ┌──────────────┐
│  │Client  │◄─┼────────────►│  MCP Server  │
│  └────────┘  │              │ (另一个工具)   │
└──────────────┘              └──────────────┘
```

- **Host**：运行 LLM 的应用程序（如 Claude Desktop、Cherry Studio）
- **Client**：负责与 MCP Server 建立连接、发现工具、转发调用
- **Server**：提供具体功能的服务（如天气查询、搜索引擎、数据库操作）

**核心概念：**
- **Tools**：Server 暴露的可调用函数
- **Resources**：Server 提供的数据资源
- **Prompts**：Server 定义的提示模板

---

## 6.2 编写 MCP Server（以天气服务为例）

**是什么？**

MCP Server 是一个遵循 MCP 协议的服务程序，它向 Client 暴露自己的工具（函数）定义，Client 可以随时调用这些工具。

**怎么做？**

以下是一个完整的天气查询 MCP Server：

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# 初始化 MCP 服务器
mcp = FastMCP("weather", log_level="ERROR")

NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"

async def make_nws_request(url: str) -> dict[str, Any] | None:
    """向天气 API 发送请求"""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)
    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."
    alerts = [format_alert(f) for f in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.

    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)
    if not points_data:
        return "Unable to fetch forecast data for this location."
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)
    if not forecast_data:
        return "Unable to fetch detailed forecast."
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:
        forecast = f"""
{period['name']}:
Temperature: {period['temperature']}{period['temperatureUnit']}
Wind: {period['windSpeed']} {period['windDirection']}
Forecast: {period['detailedForecast']}
"""
        forecasts.append(forecast)
    return "\n---\n".join(forecasts)

if __name__ == "__main__":
    mcp.run(transport='stdio')
```

> [!tip] MCP Server 编写要点
> 1. 使用 `FastMCP` 创建服务器实例
> 2. 使用 `@mcp.tool()` 装饰器注册工具函数
> 3. **函数的 docstring 极其重要**——它会被发送给 LLM，LLM 根据 docstring 决定何时调用该工具
> 4. 参数的类型注解（如 `state: str`）会被自动转换为 JSON Schema
> 5. 使用 `mcp.run(transport='stdio')` 启动服务器

---

## 6.3 编写更复杂的 MCP Server（搜索工具服务）

一个提供网络搜索、新闻搜索、天气查询三种工具的 MCP Server：

```python
from mcp.server import FastMCP
from mcp.types import TextContent

mcp = FastMCP("Search Tools Server")

class SearchTool:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
        self.base_url = "https://google.serper.dev/search"

    async def search(self, query: str, num_results: int = 10):
        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {"q": query, "num": num_results,
                   "gl": "cn", "hl": "zh-cn"}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url, headers=headers,
                json=payload, timeout=30.0
            )
            return response.json()

search_tool = SearchTool()

@mcp.tool()
async def web_search(query: str, num_results: int = 10):
    """执行网络搜索
    Args:
        query: 搜索查询词
        num_results: 返回结果数量，默认10条
    """
    result = await search_tool.search(query, num_results)
    # 格式化并返回结果...

@mcp.tool()
async def news_search(query: str, num_results: int = 10):
    """执行新闻搜索"""
    # ...

@mcp.tool()
async def weather_search(city: str):
    """查询天气信息"""
    # ...

if __name__ == "__main__":
    mcp.run()
```

---

## 6.4 MCP Client 实现（自动工具发现 + 动态 System Prompt）

**是什么？**

MCP Client 负责连接 MCP Server，自动发现其提供的工具，并将这些工具的定义传递给 LLM，让 LLM 能够自主决定何时调用。

**怎么做？**

```python
class LLMWithMCP:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        self.tools = []           # OpenAI 格式的工具定义
        self.mcp_tools_info = []  # MCP 工具详细信息

    async def initialize_mcp(self):
        """连接 MCP Server 并自动发现工具"""
        server_params = StdioServerParameters(
            command="python",
            args=["mcp_server.py"],
            env=None
        )
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                # 自动发现工具
                tools_result = await session.list_tools()
                for tool in tools_result.tools:
                    # 将 MCP 工具定义转换为 OpenAI 格式
                    openai_tool = {
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": tool.inputSchema
                        }
                    }
                    self.tools.append(openai_tool)
```

> [!note] 自动工具发现的核心步骤
> 1. `stdio_client(server_params)` 启动 MCP Server 子进程
> 2. `session.initialize()` 完成握手
> 3. `session.list_tools()` 获取所有可用工具的名称、描述、参数 Schema
> 4. 将工具定义转换为 OpenAI Function Calling 格式
> 5. 传递给 LLM，让 LLM 自主决定是否调用

**动态构建 System Prompt：**

```python
def build_system_prompt(self) -> str:
    """根据可用工具动态构建系统提示词"""
    tools_desc = []
    for i, tool in enumerate(self.mcp_tools_info, 1):
        tools_desc.append(f"{i}. {tool['name']} - {tool['description']}")
    tools_text = "\n".join(tools_desc)

    return f"""你是一个智能助手，具有以下工具能力：

{tools_text}

必须使用工具的情况：
- 用户明确要求"搜索"、"查找"某个话题
- 用户询问实时数据：股价、天气、新闻等
- 用户询问2023年之后的信息

不要使用工具的情况：
- 解释基本概念
- 回答常识性问题
- 提供教程或指导"""
```

**完整的对话流程（含工具调用）：**

```python
async def chat_with_tools(self, user_message: str) -> str:
    messages = [
        {"role": "system", "content": self.build_system_prompt()},
        {"role": "user", "content": user_message}
    ]

    # 第一次调用 LLM（传入工具定义）
    response = self.client.chat.completions.create(
        model=self.model_name,
        messages=messages,
        tools=self.tools,
    )
    assistant_message = response.choices[0].message

    # 如果 LLM 决定调用工具
    if assistant_message.tool_calls:
        messages.append(assistant_message)  # 记录 LLM 的工具调用决策

        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            # 通过 MCP 调用实际工具
            tool_result = await self.call_mcp_tool(
                function_name, function_args
            )

            # 将工具结果回传给 LLM
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result
            })

        # 第二次调用 LLM（基于工具结果生成最终回答）
        final_response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            # 注意：此处不传 tools 参数，避免再次触发工具调用
        )
        return final_response.choices[0].message.content
    else:
        return assistant_message.content
```

> [!warning] 关键细节
> 第二次调用 LLM 时**不传 `tools` 参数**，这样 LLM 只会基于工具返回的结果生成文本回答，不会再次触发工具调用。

---

## 6.5 MCP 客户端工具一览

常用的 MCP Client 工具：

| 名称 | 类型 | 是否开源 | 支持特点 |
|------|------|---------|---------|
| **Claude Desktop** | 桌面应用 | 否 | Claude + MCP 工具调度 |
| **Cline** | 浏览器插件 | 是 | ChatGPT & Claude 集成 |
| **Cherry Studio** | 桌面 IDE | 是 | 支持 Claude、GPT、工具调用 |

MCP Server 获取平台：
- https://mcp.so/
- https://mcpmarket.com/zh
- https://github.com/modelcontextprotocol/servers

---

# 第七部分：完整 Agent 项目——SalesPilot 电动车销售助手

## 7.1 项目架构

SalesPilot 是一个完整的 Agent 项目，将前述所有组件集成在一起，作为星辰电动 ES9 的智能销售助手。

**核心文件**：`backend/app/service/agent/agent.py`

该文件包含了 Agent 的完整流程实现：

```python
# agent.py 中的核心函数

def final_answer(user_query):
    """完整的 Agent 流程（Generator，支持 SSE 流式输出）"""

    # 1. 规划
    action_tool = agent_plan(user_query)
    actions = adjust_format(action_tool) if action_tool else []

    # 2. 向前端推送当前执行状态
    for action in actions:
        message = {
            "role": "agent",
            "content": f'正在执行{action["action_name"]}: "{action["prompt"]}"'
        }
        yield f"event: message\ndata: {json.dumps(message)}\n\n"

    # 3. 执行检索并去重
    memory_new = process_actions(actions)
    memory_global = list(memory_new)[1:]

    # 4. Reflexion 反思
    action_reflect = reflection(user_query, memory_global)
    if action_reflect:
        memory_new = process_actions(actions)
        memory_global.extend(memory_new)

    # 5. 流式输出最终回答（使用 DeepSeek-R1）
    completion = client.chat.completions.create(
        model="deepseek-r1",
        messages=[{"role": "user", "content": final_prompt}],
        stream=True,
    )
    for chunk in completion:
        if chunk.choices[0].finish_reason == "stop":
            yield "event: end\ndata: [DONE]\n\n"
            break
        delta = chunk.choices[0].delta
        if delta.content:
            yield f"event: message\ndata: {json.dumps(...)}\n\n"
```

> [!note] 项目特色
> - 使用 SSE（Server-Sent Events）实现流式输出，前端可以实时显示思考过程和回答
> - 对 memory 进行全局去重（`deduplicate_memory_global`），避免重复信息干扰 LLM
> - 前端可以看到 Agent 正在执行哪些搜索操作（`"role": "agent"` 消息）

---

# 第八部分：小测验

> [!tip] 答题说明
> 以下 15 道题目覆盖本教程的核心知识点，答案见《教程_Agent与MCP_答案.md》。

**1.** AI Agent 的五大核心模块分别是什么？它们各自的职责是什么？

**2.** 在 RAG 系统中，BGE-M3 模型能够同时生成哪两种向量表示？它们各自擅长什么？

**3.** 在 Milvus 混合检索中，`WeightedRanker(0.7, 1.0)` 的两个参数分别控制什么？如果想让关键词匹配的权重更高，应该如何调整？

**4.** 文本切块函数 `chunk_text` 中为什么要对表格做特殊处理？如果不做处理会怎样？

**5.** Web 搜索模块中，`WebScraper` 类的 `extract_main_content` 方法为什么只提取 `h1-h6` 和 `p` 标签，而不是所有 HTML 标签？

**6.** Agent 的 Planning 模块在收到"比较一下和特斯拉的优劣势"这种查询时，为什么需要同时规划"本地文档搜索"和"网络搜索"两种工具？

**7.** 什么是 ReAct 框架？它如何解决 LLM 的幻觉问题？

**8.** Reflexion 机制中的三个角色（行动者、评估者、自我反思）分别对应 Agent 代码中的哪些函数？

**9.** MCP 协议解决了什么问题？如果没有 MCP，M 个应用要对接 N 个工具需要多少适配器？有了 MCP 后呢？

**10.** 在编写 MCP Server 时，`@mcp.tool()` 装饰器的函数 docstring 为什么重要？如果没有 docstring 会怎样？

**11.** MCP Client 的 `initialize_mcp` 方法中，`session.list_tools()` 返回的信息包含哪些字段？这些信息如何被转换为 OpenAI Function Calling 格式？

**12.** 在 MCP Client 的 `chat_with_tools` 方法中，第二次调用 LLM 时为什么不传 `tools` 参数？

**13.** SalesPilot 项目中的 `deduplicate_memory_global` 函数的作用是什么？为什么需要对 memory 去重？

**14.** 在 MCP Client 的 `build_system_prompt` 方法中，为什么要区分"必须使用工具"和"不要使用工具"两种情况？如果不做区分会有什么问题？

**15.** SalesPilot 项目使用 SSE（Server-Sent Events）进行流式输出有什么优势？`"role": "agent"` 类型的消息有什么作用？

---

# 思维导图结构建议

以下是本教程内容的思维导图结构，可以使用 Xmind、Markmap 或 Obsidian 的 Mindmap 插件生成：

```
AI Agent 与 MCP 协议
├── 1. AI Agent 基础
│   ├── 定义：以 LLM 为大脑的自主系统
│   ├── 五大模块
│   │   ├── Planning（计划）
│   │   ├── Memory（记忆）
│   │   ├── Tools（工具）
│   │   ├── Executor（执行）
│   │   └── Output（输出）
│   └── vs 传统对话式 AI
│
├── 2. RAG 组件
│   ├── 文档解析（LlamaParse）
│   ├── 文本切块（chunk_text）
│   ├── 向量化（BGE-M3）
│   │   ├── 稠密向量（语义匹配）
│   │   └── 稀疏向量（关键词匹配）
│   ├── 向量数据库（Milvus）
│   └── 混合检索（WeightedRanker）
│
├── 3. Web 搜索模块
│   ├── Serper API 搜索
│   ├── 多线程网页爬取（WebScraper）
│   ├── 内容提取（h/p 标签过滤）
│   └── 相似度重排序（Chroma + SentenceTransformer）
│
├── 4. Agent 决策流程
│   ├── Planning：工具选择 + 查询拆解
│   ├── Execution：RAG / Web Search
│   └── Output：综合生成
│
├── 5. 高级框架
│   ├── ReAct（推理 + 行动交织）
│   └── Reflexion（自我反思）
│       ├── Actor（行动者）
│       ├── Evaluator（评估者）
│       └── Self-Reflection（自我反思）
│
├── 6. MCP 协议
│   ├── 核心概念
│   │   ├── Host（宿主应用）
│   │   ├── Client（客户端）
│   │   └── Server（服务端）
│   ├── MCP Server 编写
│   │   ├── FastMCP 初始化
│   │   ├── @mcp.tool() 装饰器
│   │   └── transport='stdio' 启动
│   ├── MCP Client 实现
│   │   ├── 自动工具发现（list_tools）
│   │   ├── 动态 System Prompt
│   │   └── 工具调用流程（两次 LLM 调用）
│   └── MCP 生态
│       ├── Client 工具（Claude Desktop, Cherry Studio）
│       └── Server 平台（mcp.so, mcpmarket.com）
│
└── 7. 完整项目：SalesPilot
    ├── Agent 流程编排
    ├── SSE 流式输出
    ├── Memory 去重
    └── DeepSeek-R1 推理输出
```

---

> [!note] 学习建议
> 1. 先理解 Agent 的五大模块架构，这是贯穿全文的核心框架
> 2. 动手搭建一个简单的 RAG 系统（Milvus + BGE-M3），理解向量检索的原理
> 3. 编写一个最简单的 MCP Server（如天气查询），然后用 Cherry Studio 等工具连接测试
> 4. 最后将所有组件串联起来，构建一个完整的 Agent 应用
