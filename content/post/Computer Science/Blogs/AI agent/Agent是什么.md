# 一、workflow、agent
## workflow
**Workflows** are systems where LLMs and tools are orchestrated through predefined code paths.  
**工作流**是指通过预定义的代码路径来协调 LLM 和工具的系统。
## agent

**Agents** are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks.  
**agents**是指 LLM 动态地指导自身流程和工具使用，从而保持对完成任务方式的控制的系统。

**Agents** are systems that independently accomplish tasks on your behalf.
**agent**是能够独立代表您完成任务的系统

# 二、agent基本循环
observe → think → act → observe

# 三、什么时候不该用agent
任务可预测、流程稳定、普通脚本能解决时，agent 反而增加不确定性。
### 1. 下一步是否能提前确定？

如果能，那用 workflow 或脚本。

例如：

> 读取文件 → 转格式 → 保存

这不需要 agent。

如果不能，例如：

> 根据用户当前情况判断该学什么

### 2. 环境是否会变化？

如果环境很稳定，不需要 agent。

如果环境经常变化，比如网页结构、用户意图、市场热点、视频评论区反馈，那 agent 更有价值。

例如：

> 根据评论区反馈调整下一期视频选题

### 3. 是否需要长期目标和动态调整？

如果只是执行一次任务，不一定要 agent。

如果是持续追踪、不断调整策略，比如：

> 帮我持续运营账号，提高播放量

# 四、实现agents的核心原则
When implementing agents, we try to follow three core principles:  
在实现智能体时，我们尽量遵循三个核心原则：

1. Maintain **simplicity** in your agent's design.  
    保持agent设计的**简洁性** 。
2. Prioritize **transparency** by explicitly showing the agent’s planning steps.  
    通过明确展示agent的规划步骤来提高**透明度** 。
3. Carefully craft your agent-computer interface (ACI) through thorough tool **documentation and testing**.  
    通过详尽的工具**文档和测试** ，精心设计您的agent-计算机接口 (ACI)。

# 五、拓展阅读
https://www.anthropic.com/engineering/building-effective-agents
https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/

