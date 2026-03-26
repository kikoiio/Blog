---
tags:
  - LLM
  - multi-agent
  - deep-research
  - answers
created: 2026-03-26
aliases:
  - Deep Research 答案
---

# Deep Research Agent 测试题答案

> [!warning] 请先独立作答，再查看答案！
> 返回题目：[[Deep_Research_Agent_Tutorial]]

---

## 基础题

**1. Orchestrator-Workers 架构中，Orchestrator 和 Workers 各自负责什么？**

- **Orchestrator（协调者）**：负责理解用户任务、拆分子任务、判断查询类型、动态调度 Worker 数量、合成最终报告、执行质量控制和迭代优化。
- **Workers（工作者）**：负责执行具体的子任务，SearchWorker 通过 OODA 循环进行搜索和信息分析，最终返回子领域的研究结果。

> [!tip] 关键区分
> Orchestrator 是"思考者+管理者"，Workers 是"执行者"。

---

**2. 项目支持哪三种查询类型？各自适用什么场景？**

| 类型 | 场景 | 示例 |
|------|------|------|
| `depth_first` | 单一主题，需从多个维度深入挖掘 | "深度分析气候变化对农业的影响" |
| `breadth_first` | 多个独立子话题，需横向覆盖 | "分析特斯拉的商业模式、竞争优势、财务和风险" |
| `simple` | 单一聚焦、相对简单的问题 | "GPT-4的工作原理是什么？" |

---

**3. OODA 循环的四个步骤分别是什么？每步做了什么事？**

- **O - Observe（观察）**：执行初始搜索查询，收集原始网页信息
- **O - Orient（定向）**：用 LLM 分析搜索结果，提取关键发现，识别信息缺口
- **D - Decide（决策）**：判断信息缺口是否值得补充搜索，以及是否还有剩余预算
- **A - Act（行动）**：若需补充搜索则执行，否则结束本轮并提交结果

---

**4. `tools.py` 中 `LLMClient` 和 `SearchClient` 分别封装了什么功能？**

- **LLMClient**：封装了与 Aliyun DashScope（OpenAI兼容接口）的交互，提供同步调用 `chat()` 和流式调用 `chat_stream()` 两个方法
- **SearchClient**：封装了 Bocha 搜索 API，提供单次搜索 `search()` 和批量搜索 `multi_search()` 两个方法

另外 `tools.py` 还包含三个工具函数：`extract_xml()`（XML解析）、`extract_json()`（从文本中提取JSON）、`format_search_context()`（格式化搜索结果用于Prompt）。

---

**5. 质量控制的最小迭代次数和质量阈值分别是多少？**

- **最小迭代次数**：2次（`min_iterations = 2`）
- **最大迭代次数**：5次（`max_iterations = 5`）
- **质量阈值**：80分（`quality_threshold = 80`）

两个条件需**同时满足**才能提前终止：质量 ≥ 80分 AND 已完成 ≥ 2次迭代。

---

## 中级题

**6. 解释"边际收益递减检测"的触发条件，并举一个数值例子。**

**触发条件**：连续3次迭代的质量提升均小于5分（`diminishing_returns_threshold = 5`）。

**数值示例**：
```
迭代1：质量72分
迭代2：质量80分（+8分，不触发）
迭代3：质量83分（+3分）
迭代4：质量85分（+2分）
迭代5：质量86分（+1分）
→ 第3、4、5次连续3次 < 5分 → 触发终止
```

即使第5次没到5次迭代上限，也会因边际收益递减而停止，**避免浪费API调用**。

---

**7. SearchWorker 的研究预算是如何根据任务复杂度分配的？**

| 复杂度 | 最大查询次数 | 最大OODA循环次数 |
|--------|------------|----------------|
| simple | 3次 | 1次 |
| medium | 5次 | 2次 |
| complex | 8次 | 3次 |

Worker 在执行前先**评估子任务复杂度**，然后按对应预算执行搜索，预算耗尽后即停止，避免无限制的 API 调用。

---

**8. 信息来源质量评估中，哪类域名会被评为高可靠？低可靠？**

- **高可靠**：`.gov`（政府）、`.edu`（教育机构）、`.org`（非营利组织）、reuters（路透社）、bloomberg（彭博）、nature（自然杂志）、arxiv（学术预印本）等权威来源
- **低可靠**：reddit、quora、medium.com、一般论坛、个人博客等用户生成内容平台

评估结果会在 Orient 阶段标注，影响报告中结论的可信度声明。

---

**9. 项目提供了哪三种使用方式？分别适用什么场景？**

| 方式 | 使用场景 |
|------|---------|
| **Python库调用** | 集成到其他Python项目中，程序化调用 |
| **命令行 CLI** | 一次性研究任务，快速运行，输出到文件 |
| **FastAPI REST服务** | 多用户并发使用，前后端分离，系统集成，异步任务管理 |

---

**10. `orchestrator.py` 中的 `TaskPlan` 数据结构包含哪些字段？**

```python
@dataclass
class TaskPlan:
    task: str                          # 原始任务描述
    subtasks: List[SubTask]            # 子任务列表
    report_structure: str              # 报告结构说明
    query_type: QueryTypeAnalysis      # 查询类型分析结果
    worker_count: int                  # 建议Worker数量
```

其中每个 `SubTask` 包含：`id`、`name`、`description`、`search_queries`、`priority`、`expected_output`、`scope_boundaries`、`research_objective`、`expected_sources`。

---

## 高级题

**11. 将 `ThreadPoolExecutor` 改为异步方案的改造思路**

**需要修改的文件**：

- `orchestrator.py`：将 `run()` 方法改为 `async def run()`，用 `asyncio.gather()` 替代 `ThreadPoolExecutor`
- `workers.py`：将 `execute()` 改为 `async def execute()`，内部搜索调用改为 `await`
- `tools.py`：将 `SearchClient.search()` 改为 `async def search()`，使用 `aiohttp` 替代 `requests`；`LLMClient` 使用 `openai` 的异步客户端 `AsyncOpenAI`
- `main.py`：顶层调用改为 `asyncio.run(agent.research(task))`
- `api.py`：FastAPI 本身已支持 async，路由函数改为 `async def` 即可

**改造核心**：
```python
# orchestrator.py 改造前
with ThreadPoolExecutor(max_workers=n) as executor:
    futures = [executor.submit(worker.execute, task) for task in subtasks]
    results = [f.result() for f in futures]

# 改造后
results = await asyncio.gather(*[worker.execute(task) for task in subtasks])
```

---

**12. 为什么要设置最少迭代次数？去掉会有什么问题？**

**原因**：第一次合成的初步报告质量往往**虚高**，因为：
1. LLM 在评分时会对"刚刚生成的报告"给出过于乐观的评分（自我评分偏差）
2. 第一轮可能恰好覆盖了容易找到的信息，但遗漏了需要深挖的内容

**去掉的问题**：如果质量阈值设为80分，而第一次生成的报告被评为82分，系统就会直接返回一个实际质量不足的报告，跳过了本应进行的深度研究。

**强制至少2次迭代**确保系统至少进行一次Gap分析和补充搜索，提高报告的实际深度。

---

**13. 当前去重方案的局限性及向量数据库改进方案**

**当前局限**：
- 基于文本字符串的精确匹配去重
- 无法识别语义相似但表述不同的内容（如"AI人工智能"和"Artificial Intelligence"）
- 可能保留大量语义冗余的搜索结果，浪费后续LLM处理的 token 消耗

**向量数据库改进方案**：
```python
# 引入 Chroma 向量数据库
import chromadb
from openai import OpenAI

def semantic_dedup(results: list, threshold: float = 0.85):
    client = chromadb.Client()
    collection = client.create_collection("search_results")

    # 将结果嵌入向量空间
    embeddings = [get_embedding(r['content']) for r in results]
    collection.add(embeddings=embeddings, ids=[str(i) for i in range(len(results))])

    # 找出语义相似（余弦相似度 > threshold）的结果，保留一个
    deduplicated = []
    seen_ids = set()
    for i, result in enumerate(results):
        if i in seen_ids:
            continue
        similar = collection.query(query_embeddings=[embeddings[i]], n_results=5)
        for similar_id in similar['ids'][0]:
            seen_ids.add(int(similar_id))
        deduplicated.append(result)
    return deduplicated
```

---

**14. Prompt 7大类对应流程中的哪个阶段？**

| Prompt类别 | 对应流程阶段 |
|-----------|------------|
| **任务分解** | Orchestrator 启动时：分析查询类型、生成子任务列表、确定Worker数量 |
| **搜索Worker任务** | Worker 执行时：指导 SearchWorker 进行 OODA 循环搜索 |
| **合成** | 第一次汇总时：将所有 Worker 结果聚合为初步报告 |
| **质量检查** | 每次迭代开始时：对当前报告从6个维度打分 |
| **Gap分析** | 质量不达标时：识别报告的缺失方面，生成补充研究方向 |
| **报告精炼** | 补充Worker完成后：将新发现整合进现有报告 |
| **边际收益递减检测** | 每次迭代结束时：判断继续研究是否值得，决定是否终止 |

---

**15. 如何为项目增加"用户偏好记忆"功能？**

**添加层面**：应在 **Orchestrator 层**（`orchestrator.py`）添加，因为它是研究流程的入口，负责任务分解和最终报告生成，最适合注入用户偏好。

**修改方案**：

**新建 `user_profile.py`**：
```python
@dataclass
class UserProfile:
    preferred_report_style: str = "analytical"  # academic/analytical/brief
    preferred_depth: str = "deep"               # quick/standard/deep
    preferred_sources: List[str] = None         # 偏好来源域名
    language: str = "zh-CN"
    history: List[str] = None                   # 历史查询记录
```

**修改 `orchestrator.py`**：
```python
def __init__(self, user_profile: UserProfile = None):
    self.user_profile = user_profile or UserProfile()

def run(self, task: str) -> str:
    # 在任务分解时注入用户偏好
    task_plan = self._decompose_task(task, user_profile=self.user_profile)
    # 在报告合成时注入风格偏好
    report = self._synthesize_results(task, results,
                                       style=self.user_profile.preferred_report_style)
```

**修改 `prompts.py`**：在任务分解和报告合成的 Prompt 中加入用户偏好占位符，如 `{user_style_instruction}`。

用户偏好可持久化存储到 JSON 文件或数据库，在每次创建 Agent 时加载。
