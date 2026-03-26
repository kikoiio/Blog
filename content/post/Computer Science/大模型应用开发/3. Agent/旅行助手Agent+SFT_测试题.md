# 旅行助手 Agent+SFT 测试题

---

## 一、概念理解（每题 5 分，共 30 分）

### 1. Agent vs 普通 LLM
请简述 Agent（智能体）和普通 LLM 对话的核心区别是什么？Agent 的工作循环包含哪几个步骤？

---

### 2. SFT 的作用
Qwen3-0.6B 基座模型已经有通用语言能力，为什么还需要 SFT？SFT 具体让模型学会了什么？

---

### 3. LoRA 原理
请解释 LoRA 的核心思想。假设原始权重矩阵 W 的维度是 1024×1024，LoRA 秩 r=32，请计算：
- (a) 全量微调需要更新多少个参数？
- (b) LoRA 需要训练多少个参数？
- (c) 参数量节省了多少倍？

---

### 4. RAG vs SFT
请解释 RAG 和 SFT 分别解决什么问题？它们在本项目中是如何互补的？

---

### 5. Function Calling
LLM 本身不能执行代码或调用 API，Function Calling 机制是如何让 LLM "调用工具"的？请描述完整流程。

---

### 6. RRF 混合检索
请解释 Reciprocal Rank Fusion（RRF）的工作原理。给定以下检索结果，计算文档 A 的 RRF 分数（k=60）：
- 向量检索中排名第 2
- 关键词检索中排名第 5

---

## 二、项目理解（每题 5 分，共 25 分）

### 7. 数据流水线
请按顺序列出本项目从"零"到"可训练数据"经历的步骤，并说明每个步骤对应的脚本文件名。

---

### 8. 五大工作流
本项目定义了 5 个工作流。请回答：
- (a) 哪个工作流最复杂？为什么？
- (b) 工作流 5（拒绝）的训练数据为什么重要？

---

### 9. "只训练最后一轮" 策略
训练时设置了 `only_last_assistant=True`，结合 `conversation_splitter.py` 的拆分逻辑，解释这两个设计如何配合工作？为什么这比训练所有 assistant 轮次更好？

---

### 10. 工具定义格式
查看 `all_tools.json`，回答：
- (a) `search_travel_guide` 的 `search_mode` 参数有哪些可选值？
- (b) `query_route` 的唯一必填参数是什么？
- (c) 为什么 `get_weather_info` 需要 `num_days` 参数而不是 `end_date`？

---

### 11. 数据分布设计
`generate_dataset.py` 生成 1010 条数据，其中旅行规划 450 条、酒店 240 条、路线 120 条、闲聊 100 条、拒绝 100 条。
- (a) 为什么旅行规划占比最高？
- (b) 为什么部分数据故意设计为"信息不足需要追问"？

---

## 三、代码分析（每题 5 分，共 20 分）

### 12. LoRA 配置分析
以下是项目的 LoRA 配置，请回答问题：
```python
LoraConfig(
    r=32,
    lora_alpha=64,
    lora_dropout=0.05,
    target_modules=["q_proj","k_proj","v_proj","o_proj",
                     "gate_proj","up_proj","down_proj"]
)
```
- (a) `lora_alpha / r = 2` 这个比值意味着什么？
- (b) 为什么 `target_modules` 同时包含注意力层和 FFN 层？
- (c) 如果把 `r` 从 32 改成 4，会有什么影响？

---

### 13. 训练超参数
```bash
--learning_rate 2e-4
--per_device_train_batch_size 1
--gradient_accumulation_steps 8
--warmup_ratio 0.03
--lr_scheduler_type cosine
--gradient_checkpointing
```
- (a) 有效 batch size 是多少？
- (b) `gradient_checkpointing` 的作用是什么？它的代价是什么？
- (c) 为什么 LoRA 的学习率（2e-4）比全量微调常用的学习率（2e-5）大？

---

### 14. Agent 循环代码
请补全以下 Agent 循环中缺失的部分（用伪代码或 Python）：
```python
while True:
    response = llm.chat(messages, tools=tools)

    if response.tool_calls:
        for tool_call in response.tool_calls:
            # ______(1)______
            # ______(2)______
        # ______(3)______
    else:
        print(response.content)
        break
```

---

### 15. 数据去重
`convert_dataset_final_fixed.py` 中实现了工具调用去重。请解释：
- (a) 为什么需要去重？
- (b) 去重的 key 是如何构造的？
- (c) 如果不去重，会对训练数据和模型行为产生什么影响？

---

## 四、优化方案（每题 5 分，共 15 分）

### 16. RAG 优化
当前 RAG 系统将每个城市的攻略作为一整篇文档存储。请提出至少两个优化方向，并解释理由。

---

### 17. 推理部署优化
如果要将这个旅行助手部署为线上服务，需要考虑哪些优化？请从以下角度各提一个方案：
- (a) 延迟优化
- (b) 吞吐量优化
- (c) 容错/降级

---

### 18. 评估体系设计
当前项目缺少自动化评估。请设计一个 Function Calling 准确率评估方案，包括：
- (a) 评估指标（至少 3 个）
- (b) 测试集应该包含哪些类型的样本？
- (c) 如何判断一次 Function Calling 是"正确"的？

---

## 五、综合设计题（10 分）

### 19. 扩展新工具
假设需要给旅行助手添加一个新工具 `book_ticket`（订票功能），请完整描述：
- (a) `all_tools.json` 中应该怎么定义这个工具？（写出 JSON schema）
- (b) 需要在哪些文件中做修改？
- (c) 需要生成什么样的训练数据？
- (d) 是否需要定义新的工作流？如何设计？

---

**总分：100 分**

> [!tip] 作答建议
> - 概念题注重理解，用自己的话解释
> - 代码题可以参考项目文件验证
> - 优化题没有标准答案，重在思路合理
