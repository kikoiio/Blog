# Transformer 与 MOE 完全教程

> [!note] 本教程说明
> 本教程基于课程 notebook 内容整理，涵盖从神经网络基础到 Transformer 架构，再到 MOE 混合专家模型的完整知识链。适合有一定编程基础、希望深入理解大语言模型底层原理的学习者。

---

# 第一部分：神经网络基础

## 1.1 神经网络的核心概念

### 是什么？

神经网络是一种由大量**神经元**按层组织的计算模型。每一层的神经元接收上一层的输出，经过**加权求和**、**加偏置**、**激活函数**三步运算后，将结果传递给下一层。整个网络从原始输入出发，经过多层变换，最终输出预测结果。

### 为什么？

传统的手工规则和线性模型难以捕捉数据中的**非线性关系**和**高阶特征组合**。例如在房价预测中，"面积大但学区一般 + 房龄新 + 小区绿化好"这种多条件的复杂组合很难用一条公式描述，但神经网络能自动从数据中学到这些规律。

### 怎么做？

神经网络的前向传播过程如下：

$$
z = W \cdot x + b
$$
$$
a = f(z)
$$

其中 $W$ 是权重矩阵，$b$ 是偏置向量，$f$ 是激活函数，$x$ 是输入，$a$ 是该层的输出。

> [!example] 真实场景：房价预测
> 输入特征 $X = [0.80, 0.60, 0.90]$（分别代表归一化后的面积、房龄、地铁距离），经过三层网络：
> - 第一层：$X \cdot W_1$（3x4矩阵）得到 $H_1 = [1.25, 0.87, 0.96, 1.43]$
> - 第二层：$H_1 \cdot W_2$（4x4矩阵）得到 $H_2 = [2.15, 1.78, 1.92, 0.84]$
> - 第三层：$H_2 \cdot W_3$（4x2矩阵）经 Softmax 得到 $\hat{y} = [0.85, 0.15]$
>
> 输出表示"85% 概率值得买，15% 概率不值得买"。

---

## 1.2 权重与偏置

### 是什么？

- **权重（Weight）**：连接两个神经元之间的参数，决定了上一层输出对当前神经元的**影响强度**
- **偏置（Bias）**：每个神经元的附加常数项，使得即使输入全为零，神经元也能产生非零输出

### 为什么？

权重让模型能够对不同特征赋予不同的重要性。偏置提供了额外的自由度，使得决策边界不必经过原点，提升模型的表达能力。

### 怎么做？

在 PyTorch 中，`nn.Linear(in_features, out_features)` 自动创建权重矩阵 $W$（形状 `out_features x in_features`）和偏置向量 $b$（形状 `out_features`），计算 $y = xW^T + b$。

---

## 1.3 激活函数

### 是什么？

激活函数是施加在线性变换输出上的**非线性函数**，常见的有 ReLU、Sigmoid、Tanh 等。

### 为什么？

如果没有激活函数，无论网络堆叠多少层线性变换，最终等价于一个矩阵乘法：

$$
W_2 \cdot (W_1 \cdot x) = (W_2 \cdot W_1) \cdot x = W' \cdot x
$$

多层线性变换可以被合并为单层，网络深度毫无意义。激活函数引入非线性后，每一层都能学到不同层次的特征表示。

### 怎么做？

在 Transformer 的 FFN 层中，标准做法是使用 ReLU 激活：

```python
class FFN(nn.Module):
    def __init__(self, d_model, d_ff):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.activation = nn.ReLU()

    def forward(self, x):
        return self.linear2(self.activation(self.linear1(x)))
```

> [!tip] ReLU 的优势
> `ReLU(x) = max(0, x)` 计算简单，梯度不会在正区间饱和，有效缓解梯度消失问题。现代大模型中常用 SwiGLU 等变体进一步提升性能。

---

## 1.4 损失函数与反向传播

### 是什么？

- **损失函数**：衡量模型预测值 $\hat{y}$ 与真实标签 $y$ 之间差距的函数。分类任务常用**交叉熵损失**：$L = -\sum_i y_i \log \hat{y}_i$
- **反向传播**：利用链式法则，从输出层逐层向输入层计算损失对每个参数的梯度

### 为什么？

模型初始参数是随机的，预测结果不可靠。通过损失函数量化预测误差，再用反向传播计算每个参数应该如何调整，才能最小化误差。

### 怎么做？

> [!example] 反向传播的完整数值推导
> 假设真实标签 $y = [1, 0]$（买房），预测 $\hat{y} = [0.85, 0.15]$。
>
> **第一步：输出层梯度**
> 对于 Softmax + 交叉熵组合：
> $$\delta_3 = \hat{y} - y = [0.85 - 1, \; 0.15 - 0] = [-0.15, \; 0.15]$$
>
> **第二步：权重梯度**
> $$\nabla_{W_3}L = H_2^T \cdot \delta_3$$
>
> **第三步：误差传回上一层**
> $$\delta_2 = \delta_3 \cdot W_3^T \odot f'(Z_2)$$
>
> **第四步：权重更新（SGD）**
> $$W_i \leftarrow W_i - \eta \cdot \nabla_{W_i}L$$
>
> 其中 $\eta$ 是学习率，如 0.01。

反向传播的核心规则可以总结为两条：
1. **误差向量 $\delta$ 从后往前传递**：$\delta_l = \delta_{l+1} \cdot W_{l+1}^T \odot f'(Z_l)$
2. **权重梯度 = 前一层输出的转置 x 当前层误差**：$\nabla_{W_l} = a_{l-1}^T \cdot \delta_l$

---

# 第二部分：从文本到向量 —— 词嵌入与位置编码

## 2.1 词嵌入（Word Embedding）

### 是什么？

词嵌入是将离散的词语（或 token）映射为连续的、固定维度的实数向量的技术。在 Transformer 中，通过 `nn.Embedding` 查表实现。

### 为什么？

计算机无法直接处理文字，需要将文字转化为数字。最朴素的方法是 **One-hot 编码**，但它有严重缺陷：

| 特性 | One-hot 编码 | 密集词嵌入 |
|------|------------|---------|
| **维度** | 词表大小（10,000 ~ 1,000,000） | 50 ~ 4096 |
| **稀疏性** | 极度稀疏，只有一个 1 | 完全稠密 |
| **语义关系** | 所有词两两正交，无法度量相似度 | 余弦距离可衡量语义相似度 |
| **泛化能力** | 只有"是否相同"信息 | 支持类比推理，如 king - man + woman ≈ queen |

> [!example] One-hot 的问题
> 假设词表只有 4 个词：
> ```
> 国王 = [0, 1, 0, 0]
> 女王 = [1, 0, 0, 0]
> 男人 = [0, 0, 1, 0]
> 女人 = [0, 0, 0, 1]
> ```
> 在 One-hot 下，"国王"和"女王"的余弦相似度为 0，与"国王"和"男人"完全一样 —— 模型无法感知"国王与女王都是皇室"这一语义关系。
>
> 而密集词嵌入通过训练可以学到：`国王 = [0.8, 0.3, 0.9, ...]`，`女王 = [0.8, 0.3, 0.1, ...]`，它们在"皇室"维度上相近，在"性别"维度上不同。

### 怎么做？

```python
class Embedding(nn.Module):
    def __init__(self, vocab_size, d_model):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.d_model = d_model

    def forward(self, x):
        # 乘以 sqrt(d_model) 是原论文的做法，防止嵌入值过小
        return self.embedding(x) * math.sqrt(self.d_model)
```

**关键细节**：嵌入向量乘以 $\sqrt{d_{model}}$ 是为了在与位置编码相加时，让词嵌入的数值量级不被位置编码淹没。

---

## 2.2 位置编码（Positional Encoding）

### 是什么？

位置编码是一组与序列位置相关的向量，直接**加到**词嵌入上，让模型能够区分不同位置的 token。原始 Transformer 使用正弦/余弦函数生成位置编码。

### 为什么？

Transformer 的注意力机制对输入做的是**集合运算**，本身不感知顺序。"我打你"和"你打我"中，同一个"我"字的嵌入向量完全相同，但语义完全不同。位置编码赋予了每个位置唯一的"身份证"，使模型能区分语序。

### 怎么做？

正弦/余弦位置编码的公式：

$$
PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i / d_{model}}}\right)
$$
$$
PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i / d_{model}}}\right)
$$

其中 $pos$ 是 token 在序列中的位置，$i$ 是维度索引。

```python
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)  # 偶数维度用 sin
        pe[:, 1::2] = torch.cos(position * div_term)  # 奇数维度用 cos
        pe = pe.unsqueeze(0)  # 增加 batch 维度
        self.register_buffer('pe', pe)  # 注册为 buffer，不参与梯度更新

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]
```

> [!tip] 为什么用 sin/cos？
> 1. **不同频率覆盖不同距离**：低频维度变化缓慢，编码远距离位置关系；高频维度变化快，编码近距离位置关系
> 2. **相对位置可通过线性变换表示**：$PE_{pos+k}$ 可以表示为 $PE_{pos}$ 的线性函数，使模型能学到相对位置信息
> 3. **可外推到训练未见过的序列长度**

---

# 第三部分：注意力机制 —— Transformer 的核心

## 3.1 缩放点积注意力（Scaled Dot-Product Attention）

### 是什么？

注意力机制让每个 token 能够"关注"序列中所有其他 token，并根据相关程度加权聚合信息。缩放点积注意力是 Transformer 中使用的具体注意力计算方式。

公式：

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V
$$

三个核心矩阵：
- **Q（Query，查询）**：当前 token "想要找什么信息"
- **K（Key，键）**：每个 token "提供什么索引信息"
- **V（Value，值）**：每个 token "实际携带的内容"

### 为什么？

> [!example] 注意力机制解决的真实问题：指代消解
> 句子："院子里有一棵苹果树，**它**结了很多果实。"
>
> "它"在 embedding 层只是一个代词向量，语义模糊。通过注意力机制：
> - "它"作为 Query，与所有 token 的 Key 计算相似度
> - 发现"苹果树"的 Key 与"它"的 Query 相似度最高（权重 0.65）
> - 于是"它"的输出向量会大量融入"苹果树"的 Value 信息
>
> 这样"它"就从一个模糊的代词变成了语义丰富的"苹果树的指代"。

**为什么要缩放（除以 $\sqrt{d_k}$）？** 当 $d_k$ 较大时，$QK^T$ 的数值也会很大，导致 softmax 输出趋近于 one-hot，梯度几乎为零。除以 $\sqrt{d_k}$ 将数值拉回合理范围。

### 怎么做？

注意力矩阵的计算过程：

```
Q @ K^T → score 矩阵 (T x T)
   ↓  除以 sqrt(d_k)
   ↓  （可选）mask 屏蔽
   ↓  softmax 归一化
attention_weights (T x T)
   ↓  乘以 V
output (T x d_k)
```

> [!note] 注意力矩阵的解读
> 对于一个 8 个 token 的句子，注意力矩阵是 8x8 的：
> - **第 i 行第 j 列**：位置 i 的 token（Query）对位置 j 的 token（Key）的注意力权重
> - **每行之和为 1**（softmax 归一化）
> - **矩阵不对称**：A[i,j] 不等于 A[j,i]，"它"关注"苹果树"不等于"苹果树"关注"它"

---

## 3.2 多头注意力（Multi-Head Attention）

### 是什么？

多头注意力将 Q、K、V 分别投影到多个子空间（"头"），每个头独立计算注意力，最后将所有头的输出拼接并通过线性层融合。

### 为什么？

单一的注意力只能捕捉一种模式的语义关系。多个头可以**同时关注不同类型的信息**：
- 某个头可能专注于语法关系（主语-谓语）
- 某个头可能专注于指代关系（代词-实体）
- 某个头可能专注于修饰关系（形容词-名词）

### 怎么做？

```python
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads  # 每个头的维度

        # 四个线性投影层
        self.Wq = nn.Linear(d_model, d_model)
        self.Wk = nn.Linear(d_model, d_model)
        self.Wv = nn.Linear(d_model, d_model)
        self.Wo = nn.Linear(d_model, d_model)  # 输出投影

    def forward(self, Q, K, V, mask=None):
        batch_size = Q.size(0)

        # 步骤1：线性投影 + 分头
        # (B, T, d_model) → (B, T, num_heads, d_k) → (B, num_heads, T, d_k)
        Q = self.Wq(Q).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.Wk(K).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.Wv(V).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)

        # 步骤2：缩放点积注意力
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        attn_weights = torch.softmax(scores, dim=-1)
        output = torch.matmul(attn_weights, V)

        # 步骤3：合并多头
        # (B, num_heads, T, d_k) → (B, T, num_heads, d_k) → (B, T, d_model)
        output = output.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)

        # 步骤4：输出投影
        output = self.Wo(output)
        return output
```

> [!tip] 张量变形的关键步骤
> 以 `d_model=512, num_heads=8` 为例：
> 1. 输入 `(B, T, 512)` 经线性层仍为 `(B, T, 512)`
> 2. `view` 拆分为 `(B, T, 8, 64)` —— 8 个头，每头 64 维
> 3. `transpose(1,2)` 变为 `(B, 8, T, 64)` —— 方便并行计算
> 4. 注意力计算后仍为 `(B, 8, T, 64)`
> 5. `transpose + view` 合并回 `(B, T, 512)`
> 6. 最终通过 $W_o$ 投影输出

---

## 3.3 Causal Mask（因果掩码）

### 是什么？

在 Decoder（生成模型）中，通过下三角矩阵掩码，阻止每个位置的 token 关注它之后的 token。

### 为什么？

语言模型在生成时是**自回归**的：生成第 $t$ 个 token 时，只能看到前 $t-1$ 个 token。训练时如果让模型看到未来的 token，就会造成**信息泄露**，模型可以直接抄答案，无法学到真正的预测能力。

### 怎么做？

```python
# 生成下三角掩码
mask = torch.tril(torch.ones(T, T, dtype=bool))

# 对注意力分数中 mask=0 的位置填充极大负值
score = score.masked_fill(mask == 0, -10000)

# softmax 后，这些位置的权重趋近于 0
score = softmax(score)
```

---

# 第四部分：Transformer 的辅助组件

## 4.1 Layer Normalization

### 是什么？

Layer Normalization 对**同一个 token 的所有特征维度**计算均值和方差，进行标准化，然后通过可学习的缩放参数 $\gamma$ 和偏移参数 $\beta$ 恢复表达能力。

$$
\text{LayerNorm}(x) = \gamma \cdot \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta
$$

### 为什么？

深层网络中，每一层输出的数值分布会不断漂移（Internal Covariate Shift）。如果某层的输出数值过大或过小，后续层的梯度会爆炸或消失。LayerNorm 将每层的输出拉回标准分布附近，让训练更加稳定。

### 怎么做？

```python
class LayerNorm(nn.Module):
    def __init__(self, d_model, eps=1e-12):
        super().__init__()
        self.gamma = nn.Parameter(torch.ones(d_model))   # 可学习的缩放
        self.beta = nn.Parameter(torch.zeros(d_model))    # 可学习的偏移
        self.eps = eps

    def forward(self, x):
        mean = x.mean(-1, keepdim=True)                  # 在最后一维求均值
        var = x.var(-1, unbiased=False, keepdim=True)     # 在最后一维求方差
        out = (x - mean) / torch.sqrt(var + self.eps)     # 标准化
        return self.gamma * out + self.beta               # 缩放 + 偏移
```

> [!warning] Pre-LN vs Post-LN
> - **Post-LN**（原始论文）：$y = \text{LN}(x + F(x))$，输出始终归一化，但深层时梯度不稳定，需要 warm-up
> - **Pre-LN**（现代做法）：$y = x + F(\text{LN}(x))$，梯度沿残差直接流动，训练更稳定
>
> GPT-2/3、BERT、T5、LLaMA 等现代大模型普遍采用 **Pre-LN**。

---

## 4.2 残差连接（Residual Connection）

### 是什么？

残差连接将某一层的输入**直接加到**该层的输出上：$y = x + F(x)$，其中 $F(x)$ 是该层的变换。

### 为什么？

来自 ResNet 论文（He et al., 2015，目前 AI 领域引用量最高的论文之一）的发现：随着网络层数加深，训练误差反而上升。这并非过拟合，而是**优化困难** —— 梯度在反向传播时逐层衰减至近乎为零。

残差连接让梯度可以"跳过"中间层直接流向浅层，保证了深层网络的可训练性。如果某一层学到的变换 $F(x)$ 没有用，网络可以让 $F(x) \approx 0$，等效于跳过这一层。

### 怎么做？

在 Transformer 的每个子层（注意力层和 FFN 层）都使用残差连接：

```python
# 注意力子层 + 残差 + LN
attn_output = self.self_attn(x, x, x)
x = self.norm1(x + self.dropout(attn_output))

# FFN 子层 + 残差 + LN
ffn_output = self.ffn(x)
x = self.norm2(x + self.dropout(ffn_output))
```

---

## 4.3 前馈神经网络（FFN）

### 是什么？

FFN 是 Transformer 中每个编码器/解码器层里的**逐位置**全连接网络。它对每个 token 的向量独立做两次线性变换，中间夹一个激活函数。

$$
\text{FFN}(x) = W_2 \cdot \text{ReLU}(W_1 \cdot x + b_1) + b_2
$$

### 为什么？

注意力层的作用是**混合不同 token 之间的信息**，但它本质上仍是线性的（加权求和）。FFN 提供了**逐 token 的非线性变换**能力，让模型能够对每个 token 的表示做更深层次的特征提取。

通常 FFN 的中间维度 $d_{ff}$ 是 $d_{model}$ 的 4 倍（如 $d_{model}=512, d_{ff}=2048$），这个"先升维再降维"的结构相当于一个信息瓶颈，迫使网络学到紧凑的特征表示。

### 怎么做？

```python
class FFN(nn.Module):
    def __init__(self, d_model, d_ff):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)    # 升维
        self.linear2 = nn.Linear(d_ff, d_model)     # 降维
        self.activation = nn.ReLU()

    def forward(self, x):
        return self.linear2(self.activation(self.linear1(x)))
```

---

# 第五部分：完整的 Transformer 架构

## 5.1 RNN/LSTM 的局限与 Transformer 的优势

在 Transformer 出现之前，序列建模主要靠 RNN 和 LSTM。它们的三大缺陷催生了 Transformer：

| 问题 | RNN/LSTM | Transformer |
|------|----------|-------------|
| **计算效率** | 串行逐步处理，无法并行 | 注意力矩阵可完全并行计算 |
| **长距离依赖** | 信息在长序列中逐步衰减 | 任意两个 token 直接交互，距离为 O(1) |
| **特征深度** | 单层结构，语义特征提取浅 | 多层堆叠，逐层提取更深层语义 |

> [!note] Transformer 的本质
> **Transformer 就是一个函数，输入一个序列，预测下一个 token 是什么。** 它来自 2017 年的论文 "Attention Is All You Need"（arxiv: 1706.03762），提出用纯注意力机制替代循环结构。

---

## 5.2 Transformer Encoder 层的完整流程

一个 Encoder 层的数据流：

```
输入 x (B, T, d_model)
    │
    ├──→ Multi-Head Self-Attention ──→ Dropout ──→ (+x) ──→ LayerNorm ──→ x'
    │
    ├──→ FFN ──→ Dropout ──→ (+x') ──→ LayerNorm ──→ 输出
```

完整实现：

```python
class EncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads)
        self.ffn = FFN(d_model, d_ff)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        attn_output = self.self_attn(x, x, x)       # 自注意力
        x = self.norm1(x + self.dropout(attn_output)) # 残差 + LN
        ffn_output = self.ffn(x)                      # FFN
        x = self.norm2(x + self.dropout(ffn_output))  # 残差 + LN
        return x
```

---

## 5.3 完整 Transformer 模型

将所有组件串联起来：

```python
class Transformer(nn.Module):
    def __init__(self, vocab_size, d_model, num_heads, num_layers, d_ff):
        super().__init__()
        self.embedding = Embedding(vocab_size, d_model)
        self.pos_encoding = PositionalEncoding(d_model)
        self.layers = nn.ModuleList(
            [EncoderLayer(d_model, num_heads, d_ff) for _ in range(num_layers)]
        )
        self.linear = nn.Linear(d_model, vocab_size)  # 映射到词表大小

    def forward(self, x):
        x = self.embedding(x)       # Token ID → 词嵌入
        x = self.pos_encoding(x)    # 加上位置编码
        for layer in self.layers:    # 逐层编码
            x = layer(x)
        logits = self.linear(x)      # 映射到词表概率分布
        return logits
```

> [!example] 端到端运行示例
> 输入文本："我爱学习大语言模型"，经 BPE 分词后得到 9 个 token ID。
> 模型参数：`d_model=64, num_heads=4, num_layers=2, d_ff=128`
>
> 数据流：
> 1. 输入 Token IDs: `[15, 17, 14, 11, 13, 19, 18, 16, 12]`
> 2. Embedding 输出形状: `(1, 9, 64)`
> 3. 位置编码后形状: `(1, 9, 64)`
> 4. 经过 2 层 Encoder 后形状: `(1, 9, 64)`
> 5. 线性层输出（logits）形状: `(1, 9, 20)` —— 9 个位置，每个位置对 20 个词的概率
> 6. 最后一个 token 的 top3 概率: `[0.125, 0.107, 0.089]`

---

## 5.4 三种架构变体

### 5.4.1 Decoder-Only（GPT, Qwen, LLaMA）

**特点**：
- 使用**因果掩码**（下三角 mask），每个 token 只能看到它前面的 token
- 自回归生成：逐个 token 预测，已生成的 token 作为下一步输入
- 适用于**文本生成**任务

**代表模型**：GPT 系列、Qwen、LLaMA、DeepSeek

---

### 5.4.2 Encoder-Only（BERT）

**特点**：
- 使用**双向注意力**，每个 token 可以看到句子中所有其他 token，无需 mask
- 特殊的 `[CLS]` token 用于聚合整个句子的语义信息
- 一次性处理整个序列（非自回归）
- 适用于**文本理解**任务：分类、情感分析、命名实体识别

**与 Decoder-Only 的核心区别**：

| 特性 | Encoder-Only (BERT) | Decoder-Only (GPT) |
|------|-------------------|-------------------|
| 注意力方向 | 双向，看到全部 context | 单向，只看左边 |
| 用途 | 理解、分类 | 生成 |
| 处理方式 | 一次处理整个序列 | 逐个生成 token |

---

### 5.4.3 Encoder-Decoder（T5）

**特点**：
- **编码器**：双向自注意力，理解源序列
- **解码器**：包含两种注意力 ——
  - Masked 自注意力：防止看到未来 token
  - **交叉注意力**：Query 来自解码器，Key/Value 来自编码器输出，学习源语言与目标语言的对齐关系
- 适用于**序列到序列**任务：机器翻译、文本摘要

> [!tip] 交叉注意力的关键
> 交叉注意力中，解码器用自己的当前状态作为 Query 去"询问"编码器："源序列中哪些部分与我当前要生成的内容最相关？" 编码器的输出同时充当 Key 和 Value 提供信息。

---

## 5.5 Transformer 架构好在哪里

1. **并行效率高**：注意力矩阵的计算可以完全并行，充分利用 GPU
2. **深入理解词间关系**：注意力机制让任意两个 token 直接交互
3. **架构通用性强**：同一架构可用于 NLP、CV、语音等多种模态，高度标准化

---

# 第六部分：BPE 分词器

## 6.1 BPE（Byte Pair Encoding）分词

### 是什么？

BPE 是一种基于统计的**子词分词算法**。它从字符级别开始，反复合并语料中出现频率最高的相邻 token 对，逐步构建词表。

### 为什么？

- **词级分词**：词表巨大（几十万），且无法处理未登录词（OOV）
- **字符级分词**：序列过长，语义信息稀薄
- **BPE**：折中方案，高频词保持完整，低频词拆成有意义的子词片段。例如 "unbelievable" 可能拆成 "un" + "believ" + "able"，每个子词都携带语义

### 怎么做？

BPE 训练流程：

```python
class SimpleBPE:
    def train_bpe(self, corpus, target_size):
        words = corpus.split()
        vocab = ['<pad>', '<unk>', '▁']  # 特殊标记
        base_chars = sorted(list(set(''.join(words))))
        vocab.extend(base_chars)

        # 初始化：每个词拆成字符序列
        word_splits = [['▁'] + list(word) for word in words]

        while len(vocab) < target_size:
            # 第一步：统计所有相邻 token 对的频率
            pairs = defaultdict(int)
            for word_tokens in word_splits:
                for i in range(len(word_tokens) - 1):
                    pairs[(word_tokens[i], word_tokens[i+1])] += 1

            if not pairs:
                break

            # 第二步：找出频率最高的 token 对
            best_pair = max(pairs, key=pairs.get)

            # 第三步：合并该 token 对，加入词表
            merged_token = ''.join(best_pair)
            vocab.append(merged_token)

            # 第四步：更新所有词的 token 表示
            word_splits = [self.merge_pair(tokens, best_pair)
                          for tokens in word_splits]

        return vocab
```

> [!example] BPE 训练实例
> 语料："hello world hello there world of code code hello"
>
> 初始词表：`['<pad>', '<unk>', '▁', 'c', 'd', 'e', 'f', 'h', 'l', 'o', 'r', 't', 'w']`
>
> 迭代合并过程（频率最高的对）：
> 1. `('h', 'e')` → `'he'`
> 2. `('▁', 'he')` → `'▁he'`
> 3. `('▁he', 'l')` → `'▁hel'`
> 4. `('▁hel', 'l')` → `'▁hell'`
> 5. `('▁hell', 'o')` → `'▁hello'`（高频词 "hello" 被完整保留）
>
> 编码 "hello world"：`['▁hello', '<unk>', 'w', 'o', 'r', 'l', 'd']`
> "hello" 因为高频被整体编码，"world" 因频率较低仍被拆成字符。

---

# 第七部分：MOE 混合专家模型

## 7.1 基础 MOE（Mixture of Experts）

### 是什么？

MOE 将 Transformer 中的 FFN 层替换为多个**专家网络**（Expert），再加上一个**门控网络**（Gate）来决定每个输入应该由哪些专家处理以及各专家的权重。

### 为什么？

传统的 Dense 模型中，每个 token 都要经过所有参数。模型越大，计算量越大。MOE 的思路是：**增加模型总参数量（存储更多知识），但每次推理只激活一部分参数（控制计算量）**。这样可以在有限算力下获得更大模型的效果。

### 怎么做？

```python
class BasicExpert(nn.Module):
    def __init__(self, feature_in, feature_out):
        super().__init__()
        self.linear = nn.Linear(feature_in, feature_out)

    def forward(self, x):
        return self.linear(x)

class BasicMOE(nn.Module):
    def __init__(self, feature_in, feature_out, expert_number):
        super().__init__()
        self.experts = nn.ModuleList(
            [BasicExpert(feature_in, feature_out) for _ in range(expert_number)]
        )
        self.gate = nn.Linear(feature_in, expert_number)  # 门控网络

    def forward(self, x):
        # x: (batch, feature_in)
        expert_weight = self.gate(x)  # (batch, expert_number)

        # 所有专家对输入进行处理
        expert_out_list = [expert(x).unsqueeze(1) for expert in self.experts]
        expert_output = torch.cat(expert_out_list, dim=1)  # (batch, expert_number, feature_out)

        expert_weight = expert_weight.unsqueeze(1)  # (batch, 1, expert_number)

        # 加权求和
        output = expert_weight @ expert_output  # (batch, 1, feature_out)
        return output.squeeze()
```

> [!warning] 基础 MOE 的问题
> 基础 MOE 虽然有多个专家，但**每个 token 仍然要过所有专家**，计算量并未减少。它只是用门控权重做了加权平均。这是稀疏 MOE 要解决的问题。

---

## 7.2 稀疏 MOE（Sparse MOE）

### 是什么？

稀疏 MOE 只让每个 token 经过 **Top-K 个专家**（通常 K=1 或 2），而不是所有专家。门控网络先计算所有专家的概率，然后只选择概率最高的 K 个。

### 为什么？

假设有 64 个专家，每次只激活 2 个：
- **总参数量**：64 倍的 FFN 参数（存储海量知识）
- **单次计算量**：只有 2 倍 FFN 的计算量
- **效果**：接近 64 倍参数的 Dense 模型，但计算开销仅为其数十分之一

这就是 Mixtral、DeepSeek 等模型能在有限 GPU 上实现超大参数量的关键技术。

### 怎么做？

稀疏 MOE 的核心是 **Router（路由器）**：

```python
class MOERouter(nn.Module):
    def __init__(self, hidden_dim, expert_number, top_k):
        super().__init__()
        self.gate = nn.Linear(hidden_dim, expert_number)
        self.top_k = top_k

    def forward(self, hidden_states):
        # 计算路由 logits
        router_logits = self.gate(hidden_states)  # (b*s, expert_number)

        # Softmax 得到概率
        routing_probs = F.softmax(router_logits, dim=-1)

        # 只选 Top-K 个专家
        router_weights, selected_experts = torch.topk(
            routing_probs, self.top_k, dim=-1
        )  # (b*s, top_k)

        # 权重重新归一化（只在被选中的专家间归一化）
        router_weights = router_weights / router_weights.sum(dim=-1, keepdim=True)

        # 生成专家掩码，用于后续的稀疏计算
        expert_mask = F.one_hot(selected_experts, num_classes=expert_number)
        expert_mask = expert_mask.permute(2, 1, 0)  # (expert_number, top_k, b*s)

        return router_logits, router_weights, selected_experts, expert_mask
```

稀疏 MOE 的前向传播：

```python
class SparseMOE(nn.Module):
    def forward(self, x):
        batch_size, seq_len, hidden_dim = x.size()
        hidden_states = x.view(-1, hidden_dim)  # 展平为 token 维度

        # 路由决策
        _, router_weights, _, expert_mask = self.router(hidden_states)

        final_hidden_states = torch.zeros_like(hidden_states)

        # 按专家遍历（而非按 token 遍历，更高效）
        for expert_idx in range(self.expert_number):
            expert_layer = self.experts[expert_idx]
            idx, top_x = torch.where(expert_mask[expert_idx])
            # idx: 该 token 将此专家作为 top1 还是 top2
            # top_x: token 在 batch*seq_len 中的位置

            current_state = hidden_states[top_x]
            current_output = expert_layer(current_state) * router_weights[top_x, idx].unsqueeze(-1)

            # 累加到最终输出（使用 index_add_ 避免竞争条件）
            final_hidden_states.index_add_(0, top_x, current_output)

        return final_hidden_states.reshape(batch_size, seq_len, hidden_dim)
```

> [!tip] `index_add_` vs `+=`
> 当多个专家可能处理同一个 token 时，`final_hidden_states[top_x] += ...` 在重复索引时可能出现竞争条件。`index_add_` 是原子操作，能正确处理重复索引的累加。

---

## 7.3 共享专家 MOE（DeepSeek 版本）

### 是什么？

在稀疏 MOE 的基础上，额外增加若干**共享专家**（Shared Experts）。共享专家**对所有 token 都生效**，不经过路由选择，其输出直接与稀疏 MOE 的输出相加。

### 为什么？

稀疏 MOE 中，不同 token 经过不同专家，可能导致某些**通用知识**（如语法规则、常识）没有被充分共享。共享专家确保所有 token 都能获得一份"通用基础知识"，路由专家则负责"专业领域知识"。

这是 **DeepSeek** 系列模型的核心创新之一。

### 怎么做？

```python
class ShareExpertMOE(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.moe_model = SparseMOE(config)  # 稀疏路由专家
        self.shared_experts = nn.ModuleList(
            [BasicExpert(config.hidden_dim, config.hidden_dim)
             for _ in range(config.shared_experts_number)]
        )  # 共享专家

    def forward(self, x):
        # 稀疏 MOE 部分
        sparse_moe_out, router_logits = self.moe_model(x)

        # 共享专家部分：所有 token 都经过
        shared_out = torch.stack(
            [expert(x) for expert in self.shared_experts], dim=0
        ).sum(dim=0)

        # 两部分相加
        return sparse_moe_out + shared_out, router_logits
```

> [!note] 三种 MOE 架构对比
>
> | 架构 | 每个 token 经过的专家 | 特点 |
> |------|-------------------|------|
> | 基础 MOE | **全部**专家（加权平均） | 计算量未减少 |
> | 稀疏 MOE | **Top-K** 个路由专家 | 大幅减少计算量 |
> | 共享专家 MOE | **Top-K** 个路由专家 + **全部**共享专家 | 兼顾通用知识与专业知识 |

---

# 第八部分：小测验

> [!note] 测验说明
> 以下包含 12 道题目（选择题 + 简答题），检验你对本教程内容的理解。答案请参见 [[教程_Transformer与MOE_答案]]。

---

**第 1 题（选择题）** 在一个没有激活函数的三层神经网络中，$y = W_3(W_2(W_1 \cdot x))$，以下哪个说法正确？

A. 该网络能学到非线性特征
B. 该网络等价于单层线性变换 $y = W' \cdot x$
C. 该网络无法进行梯度下降
D. 该网络的参数量比单层更少

---

**第 2 题（选择题）** Softmax + 交叉熵损失函数的组合，输出层梯度的计算公式是？

A. $\delta = y - \hat{y}$
B. $\delta = \hat{y} - y$
C. $\delta = \hat{y} \cdot y$
D. $\delta = \log(\hat{y}) - y$

---

**第 3 题（选择题）** One-hot 编码相比密集词嵌入的主要缺陷是什么？

A. 计算速度太慢
B. 无法表达词与词之间的语义关系
C. 只能用于中文
D. 需要更多的训练数据

---

**第 4 题（简答题）** 位置编码为什么要与词嵌入相加而不是拼接（concatenate）？请从维度效率和信息融合的角度分析。

---

**第 5 题（选择题）** 在缩放点积注意力中，为什么要除以 $\sqrt{d_k}$？

A. 为了让注意力权重之和为 1
B. 为了加速计算
C. 为了防止点积数值过大导致 softmax 梯度消失
D. 为了减少模型参数量

---

**第 6 题（简答题）** 请解释多头注意力中 `view` 和 `transpose` 操作的具体作用。假设 `d_model=512, num_heads=8`，写出每一步的张量形状变化。

---

**第 7 题（选择题）** 以下哪个模型使用双向注意力？

A. GPT-3
B. LLaMA
C. BERT
D. Qwen

---

**第 8 题（简答题）** Decoder-Only 模型中为什么需要因果掩码（causal mask）？如果去掉会发生什么？

---

**第 9 题（选择题）** Pre-LN 相比 Post-LN 的主要优势是什么？

A. 模型参数更少
B. 梯度沿残差直接流动，深层网络训练更稳定
C. 不需要 LayerNorm
D. 推理速度更快

---

**第 10 题（简答题）** BPE 分词器的训练过程是怎样的？请用"hello world hello"这个语料，描述前 2 步合并操作。

---

**第 11 题（选择题）** 稀疏 MOE 相比基础 MOE 的核心改进是什么？

A. 使用更多的专家
B. 每个 token 只经过 Top-K 个专家，减少计算量
C. 去掉了门控网络
D. 使用更大的隐藏维度

---

**第 12 题（简答题）** DeepSeek 的共享专家 MOE 中，共享专家的作用是什么？为什么不能只靠路由专家？

---

# 第九部分：思维导图结构

以下是本教程的知识结构，适合在 Obsidian 中使用 Markmap 或类似插件生成思维导图：

```
- Transformer 与 MOE
    - 神经网络基础
        - 权重与偏置
            - 权重：特征重要性
            - 偏置：决策边界偏移
        - 激活函数
            - ReLU
            - SwiGLU（现代变体）
            - 作用：引入非线性
        - 损失函数
            - 交叉熵损失
        - 反向传播
            - 链式法则
            - 梯度下降更新权重
    - 从文本到向量
        - BPE 分词器
            - 统计频率
            - 合并高频 token 对
            - 子词级别的折中方案
        - 词嵌入
            - One-hot 编码（稀疏、无语义）
            - 密集嵌入（低维、语义丰富）
            - nn.Embedding 查表
        - 位置编码
            - 正弦/余弦函数
            - 不同频率编码不同距离
            - 可外推到未见长度
    - 注意力机制
        - 缩放点积注意力
            - Q、K、V 三个矩阵
            - 缩放防止梯度消失
            - Softmax 归一化
        - 多头注意力
            - 分头并行计算
            - 不同头关注不同语义模式
            - Wo 输出投影融合
        - 因果掩码
            - 下三角矩阵
            - 防止信息泄露
    - Transformer 辅助组件
        - Layer Normalization
            - 标准化特征分布
            - 可学习的 gamma 和 beta
            - Pre-LN vs Post-LN
        - 残差连接
            - y = x + F(x)
            - 解决梯度消失
            - 来自 ResNet
        - FFN 前馈网络
            - 升维 → 激活 → 降维
            - 逐 token 的非线性变换
    - 三种架构变体
        - Decoder-Only
            - GPT、Qwen、LLaMA
            - 因果掩码、自回归生成
        - Encoder-Only
            - BERT
            - 双向注意力、文本理解
        - Encoder-Decoder
            - T5
            - 交叉注意力、序列到序列
    - Transformer 的优势
        - 并行计算效率高
        - 任意距离 token 直接交互
        - 跨模态通用架构
    - MOE 混合专家模型
        - 基础 MOE
            - 所有专家加权平均
            - 门控网络选权重
        - 稀疏 MOE
            - Top-K 路由
            - 大参数量、低计算量
            - Router 路由器
        - 共享专家 MOE（DeepSeek）
            - 共享专家：通用知识
            - 路由专家：专业知识
            - 两者输出相加
```

---

> [!note] 延伸阅读
> - 原始 Transformer 论文：[Attention Is All You Need](https://arxiv.org/pdf/1706.03762)
> - ResNet 论文（残差连接）：[Deep Residual Learning](https://arxiv.org/pdf/1512.03385)
> - 注意力变体：GQA（Grouped Query Attention）、MLA（Multi-head Latent Attention）可进一步提升推理效率
