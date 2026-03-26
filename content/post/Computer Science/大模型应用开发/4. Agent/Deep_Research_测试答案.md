---
tags:
  - LLM
  - multi-agent
  - deep-research
  - answers
  - tutorial
created: 2026-03-26
updated: 2026-03-26
aliases:
  - Deep Research 测试答案
  - 深度研究智能体答案
---

# Deep Research Agent 测试题答案

> [!info] 答案说明
> 本文档包含 [[Deep_Research_完整教程]] 中所有测试题的详细答案。建议先独立完成测试题，再查看答案。

---

## 基础题答案（每题10分，共50分）

### 1. Orchestrator-Workers 架构

**答案：**

**各自职责：**

**Orchestrator（协调者）职责：**
- 任务理解和分析
- 将复杂任务分解为多个子任务
- 判断查询类型（simple/depth_first/breadth_first）
- 动态决定需要多少个Worker
- 分发子任务给Workers
- 收集和整合所有Worker的结果
- 生成初步研究报告
- 进行质量检查和评分
- 识别信息缺口
- 决定是否需要补充研究
- 迭代优化直到质量达标

**Workers（工作者）职责：**
- 接收并执行分配的子任务
- 执行OODA循环（观察-定向-决策-行动）
- 进行网络搜索，收集信息
- 评估信息来源的质量
- 识别信息缺口并补充搜索
- 管理研究预算（搜索次数限制）
- 整理和提炼研究发现
- 返回结构化的研究结果

**为什么采用这种架构：**

1. **职责分离**：协调者专注于战略规划，工作者专注于战术执行，各司其职，提高效率
2. **并行处理**：多个Worker可以同时工作，大幅提升研究速度（如5个Worker并行，理论上可提速5倍）
3. **可扩展性**：可以轻松增加Worker数量来处理更复杂的任务，也可以添加新类型的Worker（如AnalysisWorker、VisualizationWorker）
4. **容错性**：单个Worker失败不会影响整体流程，Orchestrator可以重试或跳过
5. **资源优化**：可以根据任务复杂度动态调整Worker数量，避免资源浪费
6. **易于维护**：各组件独立，修改Worker不影响Orchestrator，反之亦然

**对比单一智能体：**
- 单一智能体需要串行处理所有子任务，效率低
- 单一智能体难以管理复杂的多步骤流程
- 单一智能体的上下文容易混乱，难以保持专注

---

### 2. 查询类型分类

**答案：**

#### Simple（简单查询）

**特征：**
- 单一、明确的问题
- 答案相对直接，不需要多角度分析
- 信息需求量小
- 不涉及复杂的推理或综合

**适用场景：**
- 定义查询
- 事实查询
- 简单问答

**Worker数量：** 1-2个

**实际例子：**
- "什么是GPT-4？"
- "Python的最新版本是多少？"
- "比特币的当前价格是多少？"
- "北京的人口数量"

#### Depth First（深度优先）

**特征：**
- 针对**单一主题**进行深入探索
- 需要从多个维度、多个层次分析
- 追求深度和洞察力
- 各个维度之间有关联

**适用场景：**
- 深度分析单一对象
- 需要多角度剖析
- 追求专业洞察

**Worker数量：** 3-10个

**实际例子：**
- "深度分析特斯拉的商业模式"
  - Worker 1: 收入模式分析
  - Worker 2: 成本结构分析
  - Worker 3: 竞争优势分析
  - Worker 4: 风险因素分析
  - Worker 5: 未来战略分析

- "全面研究ChatGPT的技术架构"
  - Worker 1: 模型架构
  - Worker 2: 训练方法
  - Worker 3: 推理优化
  - Worker 4: 安全机制
  - Worker 5: 应用场景

#### Breadth First（广度优先）

**特征：**
- 涉及**多个独立子话题**
- 需要横向覆盖不同领域
- 追求全面性和覆盖面
- 各个子话题相对独立

**适用场景：**
- 行业全景分析
- 多领域综述
- 市场调研

**Worker数量：** 3-10个

**实际例子：**
- "2024年科技行业发展趋势"
  - Worker 1: AI领域趋势
  - Worker 2: 云计算趋势
  - Worker 3: 物联网趋势
  - Worker 4: 区块链趋势
  - Worker 5: 量子计算趋势

- "分析中国新能源汽车市场"
  - Worker 1: 市场规模
  - Worker 2: 主要厂商
  - Worker 3: 技术发展
  - Worker 4: 政策环境
  - Worker 5: 消费者偏好

---

### 3. OODA 循环

**答案：**

**OODA 四个步骤：**

1. **Observe（观察）**
   - 执行搜索查询
   - 收集原始搜索结果
   - 记录信息来源

2. **Orient（定向）**
   - 分析搜索结果
   - 提取关键信息和洞察
   - 评估信息来源质量
   - 识别信息缺口
   - 区分事实与推测

3. **Decide（决策）**
   - 判断信息是否充分
   - 评估是否需要补充搜索
   - 检查研究预算是否充足
   - 决定下一步行动

4. **Act（行动）**
   - 如果需要补充：生成新的搜索查询并执行
   - 如果信息充分：整理结果，准备输出

**具体搜索场景示例：**

**任务：** 搜索"特斯拉2024年第四季度财务状况"

**第1次 OODA 循环：**

**Observe（观察）：**
```
执行搜索："特斯拉2024 Q4财报"
获得结果：
- 10条新闻报道
- 来源：CNBC, Reuters, 财经网站
- 内容：营收、利润、交付量等基本数据
```

**Orient（定向）：**
```
关键发现：
- 营收：250亿美元（同比+15%）
- 净利润：30亿美元（同比-5%）
- 交付量：48万辆

信息缺口：
- 缺少详细的成本结构数据
- 缺少各业务线的收入拆分
- 缺少官方财报文件

来源质量：
- 中等（新闻报道，非官方文件）
- 需要更权威的来源
```

**Decide（决策）：**
```
决定：需要补充搜索
原因：
1. 缺少成本结构等关键数据
2. 来源质量不够高（需要官方财报）
3. 预算充足（还剩6次查询）
```

**Act（行动）：**
```
生成补充查询：
- "Tesla Q4 2024 earnings report SEC filing"
- "特斯拉2024 Q4成本结构"
执行搜索
```

**第2次 OODA 循环：**

**Observe（观察）：**
```
执行补充搜索
获得结果：
- Tesla官方投资者关系页面
- SEC 10-K文件
- 详细的财务数据表格
```

**Orient（定向）：**
```
关键发现：
- 找到官方财报文件
- 获得完整的成本结构数据
- 各业务线收入详细拆分

信息缺口：
- 基本完整，无重大缺口

来源质量：
- 高（官方文件，SEC备案）
```

**Decide（决策）：**
```
决定：信息已充分，可以结束
原因：
1. 关键信息已收集完整
2. 来源权威可靠
3. 满足研究目标
```

**Act（行动）：**
```
整理所有搜索结果
生成结构化的研究报告
返回给Orchestrator
```

---

### 4. 工具层职责

**答案：**

#### LLMClient 封装的功能：

1. **API调用封装**
   - 封装OpenAI兼容的API调用
   - 处理请求格式化
   - 处理响应解析

2. **错误处理**
   - API调用失败重试
   - 超时处理
   - 错误信息格式化

3. **模型选择**
   - 支持多个模型（qwen-plus, qwen-max, qwen-turbo）
   - 根据任务复杂度选择合适的模型

4. **参数管理**
   - 统一管理temperature、max_tokens等参数
   - 提供默认值

5. **响应处理**
   - 提取文本内容
   - 处理流式响应（如果支持）

#### SearchClient 封装的功能：

1. **搜索API调用**
   - 封装Bocha搜索API
   - 处理搜索请求

2. **批量搜索**
   - 支持单次搜索
   - 支持批量并行搜索（multi_search）

3. **结果格式化**
   - 将API返回的原始数据转换为统一的SearchResult对象
   - 提取标题、URL、摘要等字段

4. **结果去重**
   - 基于URL去重
   - 避免重复结果

5. **错误处理**
   - 搜索失败重试
   - 网络错误处理

#### 为什么要封装成独立的类：

1. **关注点分离**
   - 业务逻辑（Orchestrator、Worker）不需要关心API调用细节
   - 工具层专注于外部服务交互

2. **可维护性**
   - API变更时只需修改工具层
   - 不影响上层业务逻辑

3. **可测试性**
   - 可以轻松mock LLMClient和SearchClient进行单元测试
   - 不需要真实的API调用

4. **可复用性**
   - 多个组件可以共享同一个客户端实例
   - 避免重复代码

5. **配置集中管理**
   - API密钥、超时时间等配置集中在工具层
   - 便于统一管理

6. **易于替换**
   - 如果要换用其他LLM或搜索服务，只需修改工具层
   - 上层代码无需改动

---

### 5. 质量控制参数

**答案：**

**参数值：**
- `min_iterations` = 2（最小迭代次数）
- `quality_threshold` = 80（质量阈值，满分100）

**为什么要设置最小迭代次数：**

1. **避免过早终止**
   - 即使第一次就达到80分，也可能存在改进空间
   - 第一次的评分可能不够准确

2. **确保深度**
   - 至少2次迭代可以确保报告经过了补充和精炼
   - 第一次是初步报告，第二次是优化后的版本

3. **质量保证**
   - 多次迭代可以发现初次遗漏的信息
   - 补充研究可以提升报告的全面性

4. **防止评分偏差**
   - LLM的评分可能存在波动
   - 多次迭代可以平滑这种波动

5. **符合研究规律**
   - 真实的研究工作很少一次就完美
   - 通常需要多轮的信息收集和分析

**实际效果：**
```
场景1：第一次就达到82分
- 如果没有min_iterations：立即终止
- 有min_iterations=2：继续第2次迭代
- 第2次迭代后：可能提升到88分，质量更好

场景2：第一次只有75分
- 继续迭代，补充信息
- 第2次达到83分，满足条件，终止
```

---

## 中级题答案（每题15分，共75分）

### 6. 边际收益递减检测

**答案：**

**触发条件：** 连续3次迭代，每次质量提升都小于5分

**判断逻辑：** 检查最近3次迭代的质量提升，如果都小于5分，则触发终止

**具体数值例子：**

**例子1：触发终止**
```
迭代历史：
第1次: 70分 (基准)
第2次: 76分 (+6分) ✅ 提升明显
第3次: 79分 (+3分) ⚠️ 提升变小
第4次: 81分 (+2分) ⚠️ 提升很小
第5次: 82分 (+1分) ⚠️ 提升很小

分析：连续3次(第3-5次)提升都<5分
结果：🛑 触发边际收益递减，提前终止
```

**例子2：不触发终止**
```
迭代历史：
第1次: 70分
第2次: 76分 (+6分) ✅
第3次: 79分 (+3分) ⚠️
第4次: 85分 (+6分) ✅ 突然提升明显
第5次: 88分 (+3分) ⚠️

分析：第4次有明显提升，打破连续
结果：✅ 不触发，继续迭代
```

---

### 7. 研究预算管理

**答案：**

**预算配置：**

| 复杂度 | 最大查询数 | 最大循环数 | 适用场景 |
|--------|-----------|-----------|---------|
| Simple | 3次 | 1次 | 简单直接的查询 |
| Medium | 5次 | 2次 | 中等复杂度任务 |
| Complex | 8次 | 3次 | 复杂深入的研究 |

**为什么这样设计：**

1. **资源控制** - 防止无限制搜索导致成本失控
2. **效率优化** - 根据任务复杂度分配合理资源
3. **质量保证** - 确保有足够的搜索次数收集信息
4. **OODA循环限制** - 防止Worker陷入无限循环
5. **实践经验** - 基于实际测试得出的经验值

---

### 8. 信息来源质量评估

**答案：**

**高可靠来源：**
- 政府和教育机构：.gov, .edu, .org
- 权威媒体：reuters, bloomberg, wsj, nytimes
- 学术机构：nature, science, arxiv, statista, mckinsey, gartner

**低可靠来源：**
- 社交平台：reddit, quora, forum, yahoo answers
- 个人内容：blog, medium.com, 个人网站
- 推测性语言：包含"可能"、"也许"、"据说"等词汇

**对报告质量的影响：**

1. **准确性影响** - 高质量来源信息准确可靠
2. **可信度影响** - 引用高质量来源的报告更有说服力
3. **决策影响** - Worker优先采用高质量来源的信息
4. **报告评分影响** - "来源质量"是评分维度之一（10分）
5. **补充搜索决策** - 缺少高质量来源会触发补充搜索

---

### 9. 使用方式对比

**答案：**

**方式1：Python库调用**
- 优点：集成简单、灵活性高、可自定义
- 缺点：需要Python环境
- 适用：集成到Python应用、批量处理

**方式2：命令行（CLI）**
- 优点：使用简单、无需编程、快速测试
- 缺点：功能有限、难以集成
- 适用：快速执行单个任务、测试调试

**方式3：API服务**
- 优点：语言无关、支持远程访问、多用户并发
- 缺点：需要部署维护、系统复杂度高
- 适用：Web应用集成、微服务架构、跨语言调用

---

### 10. 数据结构设计

**答案：**

**TaskPlan 关键字段：**

1. **task_understanding** - 存储对原始任务的理解和分析
2. **subtasks** - 存储拆解后的所有子任务列表
3. **report_structure** - 定义最终报告的结构框架
4. **query_type** - 存储查询类型判断结果
5. **research_plan** - 存储整体研究策略
6. **worker_count** - 存储Worker数量的决策信息

**作用：**
- 指导Worker执行
- 确保报告结构清晰
- 记录决策过程
- 支持迭代优化

---
## 高级题答案（每题25分，共125分）

### 11. 异步化改造方案

**答案：**

**需要修改的文件和部分：**

**1. orchestrator.py**
- 修改 `_dispatch_workers()` 方法
- 将 `ThreadPoolExecutor` 改为 `asyncio.gather()`
- 修改 `run()` 方法为 `async def run()`

**2. workers.py**
- 修改 `execute()` 方法为 `async def execute()`
- 修改 `_execute_ooda_cycle()` 为异步方法
- 搜索调用改为异步

**3. tools.py**
- 修改 `LLMClient.chat()` 为 `async def chat()`
- 修改 `SearchClient.search()` 为 `async def search()`
- 使用 `aiohttp` 替代 `requests`

**4. main.py**
- 修改 `research()` 方法为 `async def research()`
- 添加事件循环管理

**详细改造思路：**

```python
# orchestrator.py - 改造前
def _dispatch_workers(self, subtasks):
    with ThreadPoolExecutor(max_workers=len(subtasks)) as executor:
        futures = [executor.submit(worker.execute, task)
                   for task in subtasks]
        results = [f.result() for f in as_completed(futures)]
    return results

# orchestrator.py - 改造后
async def _dispatch_workers(self, subtasks):
    tasks = [worker.execute_async(task) for task in subtasks]
    results = await asyncio.gather(*tasks)
    return results

# workers.py - 改造前
def execute(self, subtask):
    results = self.search_client.search(query)
    analysis = self.llm.chat(prompt)
    return result

# workers.py - 改造后
async def execute(self, subtask):
    results = await self.search_client.search_async(query)
    analysis = await self.llm.chat_async(prompt)
    return result

# tools.py - 改造前
def search(self, query):
    response = requests.post(url, json=data)
    return response.json()

# tools.py - 改造后
async def search_async(self, query):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data) as response:
            return await response.json()
```

**预期收益：**
1. 降低线程切换开销 30-40%
2. 提升并发性能 20-30%
3. 更好的资源利用率
4. 支持更大规模的并发

---

### 12. 最小迭代次数的意义

**答案：**

**为什么要设置最小迭代次数（min_iterations=2）：**

**从研究质量角度：**

1. **避免浅层研究**
   - 第一次迭代往往只是初步探索
   - 可能遗漏重要信息或角度
   - 需要第二次迭代来深化和完善

2. **发现隐藏问题**
   - 第一次可能没有发现的信息缺口
   - 第二次迭代可以补充和验证
   - 交叉验证提高准确性

3. **质量评分的可靠性**
   - LLM评分可能存在波动
   - 单次评分不够可靠
   - 多次迭代可以平滑评分偏差

**从系统设计角度：**

1. **防止过早优化**
   - 第一次达标可能是偶然
   - 系统应该给予改进机会
   - 避免"看起来好但实际不够好"的情况

2. **符合研究流程**
   - 真实研究很少一次完成
   - 通常需要"初稿-修订"的过程
   - 系统设计应该模拟真实流程

3. **边际收益递减的前提**
   - 需要足够的数据点来判断趋势
   - 至少2次迭代才能有1次提升数据
   - 3次迭代才能判断连续趋势

**如果去掉这个限制会有什么问题：**

**问题1：质量不稳定**
```
场景：第一次就达到82分
- 无限制：立即终止，输出报告
- 问题：可能遗漏了重要信息
- 实际：第二次迭代可能发现缺口，提升到90分
```

**问题2：评分偏差**
```
场景：LLM评分波动
- 第一次评分：82分（偏高）
- 实际质量：75分
- 无限制：错误地认为达标
- 有限制：第二次评分可能修正为78分，继续优化
```

**问题3：用户体验不一致**
```
- 简单任务：1次迭代就结束
- 复杂任务：需要5次迭代
- 问题：用户无法预期系统行为
- 有限制：至少2次，行为更可预测
```

**问题4：无法判断收益递减**
```
- 需要至少3次迭代才能判断趋势
- 如果第1次就终止，无法积累数据
- 无法启用智能终止机制
```

**最佳实践：**
- min_iterations=2 是经验值
- 可以根据任务类型调整（简单任务1次，复杂任务3次）
- 配合 max_iterations 和边际收益递减检测使用

---

### 13. 向量数据库去重改进

**答案：**

**当前方案的局限性：**

1. **只能识别完全相同的文本**
   - 基于URL或文本完全匹配
   - 无法识别语义相似的内容

2. **无法处理改写内容**
   - 同一信息的不同表述会被保留
   - 导致冗余信息

3. **无法识别部分重复**
   - 两篇文章可能有80%相同内容
   - 当前方案无法识别

**向量数据库改进方案：**

**设计思路：**
1. 将搜索结果转换为向量
2. 计算向量之间的相似度
3. 相似度超过阈值的视为重复
4. 只保留最高质量的版本

**具体实现：**

```python
# 1. 安装依赖
# pip install chromadb sentence-transformers

# 2. 初始化向量数据库
from chromadb import Client
from sentence_transformers import SentenceTransformer

class SemanticDeduplicator:
    def __init__(self, similarity_threshold=0.85):
        self.client = Client()
        self.collection = self.client.create_collection(
            name="search_results",
            metadata={"hnsw:space": "cosine"}
        )
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.similarity_threshold = similarity_threshold

    def deduplicate(self, results: list) -> list:
        """语义去重"""
        unique_results = []

        for result in results:
            # 生成文本向量
            text = f"{result.title} {result.content}"

            # 查询相似内容
            similar = self.collection.query(
                query_texts=[text],
                n_results=1
            )

            # 判断是否重复
            if not similar['ids'] or similar['distances'][0][0] > (1 - self.similarity_threshold):
                # 不重复，添加到结果和数据库
                unique_results.append(result)
                self.collection.add(
                    documents=[text],
                    ids=[result.id],
                    metadatas=[{
                        "url": result.url,
                        "quality": result.quality_score
                    }]
                )
            else:
                # 重复，比较质量
                existing_quality = similar['metadatas'][0][0]['quality']
                if result.quality_score > existing_quality:
                    # 新结果质量更高，替换
                    self.collection.delete(ids=[similar['ids'][0][0]])
                    unique_results.append(result)
                    self.collection.add(
                        documents=[text],
                        ids=[result.id],
                        metadatas=[{
                            "url": result.url,
                            "quality": result.quality_score
                        }]
                    )

        return unique_results

# 3. 在 workers.py 中使用
class SearchWorker:
    def __init__(self):
        self.deduplicator = SemanticDeduplicator(
            similarity_threshold=0.85  # 85%相似度视为重复
        )

    def execute(self, subtask):
        # 执行搜索
        raw_results = self.search_client.multi_search(queries)

        # 语义去重
        unique_results = self.deduplicator.deduplicate(raw_results)

        # 继续处理
        return self._process_results(unique_results)
```

**关键参数：**
- `similarity_threshold=0.85`：相似度阈值
  - 0.9：非常严格，只去除几乎相同的内容
  - 0.85：平衡，推荐值
  - 0.8：宽松，可能误删不同内容

**预期效果：**
1. 减少冗余信息 20-30%
2. 提升报告质量
3. 降低LLM处理成本
4. 保留最高质量的信息源

---

### 14. Prompt 分类与流程

**答案：**

**主要Prompt类别及作用：**

**1. 任务分解类（Orchestrator）**
- `TASK_DECOMPOSITION_PROMPT`
  - 作用：将用户任务拆解为子任务
  - 输入：原始任务
  - 输出：子任务列表、查询类型、Worker数量建议

**2. 查询分类类（Orchestrator）**
- `QUERY_TYPE_CLASSIFICATION_PROMPT`
  - 作用：判断查询类型
  - 输入：任务描述
  - 输出：simple/depth_first/breadth_first

**3. 搜索执行类（Worker）**
- `SEARCH_WORKER_TASK_PROMPT`
  - 作用：指导Worker执行搜索
  - 输入：子任务、搜索查询
  - 输出：搜索策略

**4. OODA循环类（Worker）**
- `OBSERVE_PROMPT`：分析搜索结果
- `ORIENT_PROMPT`：识别信息缺口
- `DECIDE_PROMPT`：决定下一步行动
- `ACT_PROMPT`：生成补充查询

**5. 结果合成类（Orchestrator）**
- `SYNTHESIS_PROMPT`
  - 作用：将Worker结果合成报告
  - 输入：所有Worker的研究结果
  - 输出：初步研究报告

**6. 质量控制类（Orchestrator）**
- `QUALITY_CHECK_PROMPT`
  - 作用：评估报告质量
  - 输入：报告、原始任务
  - 输出：质量评分、改进建议

- `GAP_ANALYSIS_PROMPT`
  - 作用：识别信息缺口
  - 输入：报告、质量反馈
  - 输出：缺口列表、补充建议

**7. 报告优化类（Orchestrator）**
- `REPORT_REFINEMENT_PROMPT`
  - 作用：精炼和优化报告
  - 输入：当前报告、补充结果
  - 输出：优化后的报告

**数据流转关系：**

```
用户任务
    ↓
[1] TASK_DECOMPOSITION_PROMPT
    ↓
子任务列表 + 查询类型
    ↓
[2] SEARCH_WORKER_TASK_PROMPT (并行)
    ↓
[3] OODA循环 Prompts
    - OBSERVE_PROMPT
    - ORIENT_PROMPT
    - DECIDE_PROMPT
    - ACT_PROMPT
    ↓
Worker结果集合
    ↓
[4] SYNTHESIS_PROMPT
    ↓
初步报告
    ↓
[5] QUALITY_CHECK_PROMPT
    ↓
质量评分 + 反馈
    ↓
如果未达标 ↓
[6] GAP_ANALYSIS_PROMPT
    ↓
信息缺口列表
    ↓
补充Worker执行
    ↓
[7] REPORT_REFINEMENT_PROMPT
    ↓
优化后报告
    ↓
循环回到 [5] 直到达标
```

---

### 15. 功能扩展设计

**答案：**

**设计方案：用户偏好记忆功能**

**1. 在哪个层面添加：**
- 在 `config.py` 添加偏好配置结构
- 在 `main.py` 添加偏好管理类
- 在 `orchestrator.py` 应用偏好设置
- 在 `prompts.py` 添加偏好相关的Prompt

**2. 需要修改的文件：**

**config.py - 添加偏好配置**
```python
USER_PREFERENCES = {
    "report_length": "medium",  # short/medium/long
    "detail_level": "balanced",  # concise/balanced/detailed
    "citation_format": "APA",    # APA/MLA/Chicago
    "language_style": "professional",  # casual/professional/academic
    "include_charts": True,
    "max_sources_per_section": 5
}
```

**main.py - 添加偏好管理**
```python
class UserPreferenceManager:
    """用户偏好管理器"""

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.prefs_file = f"./.user_prefs/{user_id}.json"
        self.preferences = self._load_preferences()

    def _load_preferences(self) -> dict:
        """加载用户偏好"""
        if os.path.exists(self.prefs_file):
            with open(self.prefs_file) as f:
                return json.load(f)
        return USER_PREFERENCES.copy()

    def update_preference(self, key: str, value):
        """更新偏好"""
        self.preferences[key] = value
        self._save_preferences()

    def _save_preferences(self):
        """保存偏好"""
        os.makedirs(os.path.dirname(self.prefs_file), exist_ok=True)
        with open(self.prefs_file, 'w') as f:
            json.dump(self.preferences, f, indent=2)

    def get_preference(self, key: str, default=None):
        """获取偏好"""
        return self.preferences.get(key, default)

class DeepResearchAgent:
    def __init__(self, user_id: str = "default", **kwargs):
        self.pref_manager = UserPreferenceManager(user_id)
        # ... 其他初始化

    def research(self, task: str, **kwargs):
        # 应用用户偏好
        preferences = self.pref_manager.preferences

        orchestrator = Orchestrator(
            preferences=preferences,  # 传递偏好
            **kwargs
        )
        # ...
```

**orchestrator.py - 应用偏好**
```python
class Orchestrator:
    def __init__(self, preferences: dict = None, **kwargs):
        self.preferences = preferences or {}
        # ...

    def _synthesize_results(self, task, results):
        # 根据偏好调整报告生成
        report_length = self.preferences.get("report_length", "medium")
        detail_level = self.preferences.get("detail_level", "balanced")
        citation_format = self.preferences.get("citation_format", "APA")

        prompt = SYNTHESIS_PROMPT.format(
            task=task,
            results=results,
            length_preference=report_length,
            detail_preference=detail_level,
            citation_format=citation_format
        )
        # ...
```

**prompts.py - 添加偏好相关Prompt**
```python
SYNTHESIS_PROMPT_WITH_PREFERENCES = """
生成研究报告，遵循以下用户偏好：

报告长度：{length_preference}
- short: 1000-2000字
- medium: 2000-4000字
- long: 4000-8000字

详细程度：{detail_preference}
- concise: 只包含关键信息
- balanced: 平衡深度和可读性
- detailed: 深入详细的分析

引用格式：{citation_format}

任务：{task}
研究结果：{results}

请生成符合用户偏好的报告。
"""
```

**3. 使用示例：**

```python
# 创建Agent，指定用户ID
agent = DeepResearchAgent(user_id="user_123")

# 第一次使用，设置偏好
agent.pref_manager.update_preference("report_length", "long")
agent.pref_manager.update_preference("detail_level", "detailed")
agent.pref_manager.update_preference("citation_format", "MLA")

# 执行研究，自动应用偏好
report = agent.research("AI发展趋势")

# 后续使用，自动加载之前的偏好
agent2 = DeepResearchAgent(user_id="user_123")
report2 = agent2.research("区块链应用")  # 使用相同偏好
```

**4. 扩展功能：**
- 学习用户反馈，自动调整偏好
- 支持多个偏好配置文件（工作/学习/个人）
- 偏好版本控制和回滚
- 团队共享偏好配置

---

**答案文件完成！**

> [!success] 所有测试题答案已完成
> - 基础题（5题）：50分
> - 中级题（5题）：75分
> - 高级题（5题）：125分
> - 总计：250分
