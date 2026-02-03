# 改进的行为判定逻辑 v2.0

## 问题诊断

原有的简单相似度判定存在以下问题：

1. 无法区分”无效重复”和”合理迭代”
1. 不考虑模型特性（Claude vs GPT的使用模式差异）
1. 缺少上下文理解（是在解决问题还是在探索方案）

-----

## 改进方案：多维度综合判定

### 维度1：语义相似度（保留但降权）

**改进点**：

- 不再只看最后一条消息，而是分析**对话的演进方向**
- 引入”话题漂移度”：如果每次请求的主题在变化，说明是探索而非卡死

```python
def calculate_topic_drift(messages: List[str]) -> float:
    """
    计算话题漂移度
    返回值：0-1，越高说明话题变化越大
    """
    embeddings = get_embeddings(messages)  # 用sentence-transformers
    
    drifts = []
    for i in range(1, len(embeddings)):
        similarity = cosine_similarity(embeddings[i-1], embeddings[i])
        drifts.append(1 - similarity)  # 转换为漂移度
    
    return np.mean(drifts)

# 判定逻辑
if topic_drift > 0.3:
    # 话题在变化，说明在探索不同方案，不是卡死
    confidence_penalty = 0.5
```

-----

### 维度2：情绪分析

**核心思想**：无效循环往往伴随负面情绪上升

**关键词权重升级**：

```python
EMOTION_KEYWORDS = {
    "frustration": {
        "keywords": ["还是不行", "又失败了", "为什么还", "到底怎么", "试了很多次"],
        "weight": 3
    },
    "exploration": {
        "keywords": ["换个", "试试", "或者", "另一个", "如果"],
        "weight": -2  # 负权重，降低警告
    },
    "refinement": {
        "keywords": ["更好", "优化", "精简", "改进", "调整"],
        "weight": -1
    },
    "stuck": {
        "keywords": ["same error", "一样的", "还是这个问题", "依然"],
        "weight": 4
    }
}

def detect_emotion(text: str) -> int:
    score = 0
    for category, config in EMOTION_KEYWORDS.items():
        for keyword in config["keywords"]:
            if keyword in text.lower():
                score += config["weight"]
    return score
```

-----

### 维度3：进展检测

**新增字段**：在数据库中记录每次请求的”进展状态”

```python
class Request(Base):
    # ... 原有字段
    progress_indicator = Column(String)  # "stuck", "exploring", "refining", "resolved"
    token_efficiency = Column(Float)     # output_tokens / input_tokens
    
def assess_progress(current_request, previous_requests) -> str:
    """
    分析是否有进展
    """
    # 检查1：代码是否在变化（针对编程任务）
    if has_code_changes(current_request, previous_requests[-1]):
        return "exploring"
    
    # 检查2：Token效率是否下降（重复问相同问题，回复会变短）
    current_efficiency = current_request.completion_tokens / current_request.prompt_tokens
    avg_efficiency = np.mean([r.token_efficiency for r in previous_requests])
    
    if current_efficiency < avg_efficiency * 0.5:
        return "stuck"  # 回复明显变短，可能是AI也没办法了
    
    # 检查3：时间间隔（快速重复 vs 思考后重试）
    time_gap = (current_request.timestamp - previous_requests[-1].timestamp).seconds
    if time_gap < 30:  # 30秒内重复
        return "stuck"
    elif time_gap > 300:  # 5分钟后重试
        return "refining"
    
    return "exploring"
```

-----

### 维度4：模型特异性调整

**不同模型的判定阈值不同**

```yaml
# config.yaml
analyzer:
  model_profiles:
    # Claude系列：通常一次性给出完整方案
    claude-opus-4:
      similarity_threshold: 0.90  # 更严格，因为很少需要重复
      max_retries: 2
      
    # GPT-4：可能需要多轮澄清
    gpt-4o:
      similarity_threshold: 0.75
      max_retries: 4
      
    # 小模型：容易卡住，需要宽容
    gpt-4o-mini:
      similarity_threshold: 0.70
      max_retries: 5
```

-----

### 维度5：任务类型识别

**自动识别任务类型，应用不同策略**

```python
TASK_PATTERNS = {
    "coding": {
        "indicators": ["def ", "function", "class ", "import", "代码"],
        "allow_iterations": 5,  # 编程任务允许更多迭代
    },
    "writing": {
        "indicators": ["写一篇", "帮我润色", "改写", "翻译"],
        "allow_iterations": 3,  # 写作任务迭代较少
    },
    "debugging": {
        "indicators": ["error", "bug", "报错", "exception"],
        "allow_iterations": 3,
        "trigger_threshold": 0.85,  # 调试时更容易触发警告
    },
    "research": {
        "indicators": ["搜索", "查找", "研究", "了解"],
        "allow_iterations": 10,  # 研究任务需要大量探索
    }
}

def detect_task_type(messages: List[dict]) -> str:
    # 分析对话历史，识别任务类型
    text = " ".join([m["content"] for m in messages])
    
    scores = {}
    for task_type, config in TASK_PATTERNS.items():
        score = sum(1 for indicator in config["indicators"] if indicator in text)
        scores[task_type] = score
    
    return max(scores, key=scores.get)
```

-----

## 最终的综合判定算法

```python
def analyze_behavior(current_request, project_history):
    """
    多维度综合分析
    返回：(should_warn: bool, confidence: float, reason: str)
    """
    recent = project_history[-5:]  # 最近5条
    
    # === 维度1：基础相似度 ===
    similarity = calculate_similarity(
        current_request.last_message, 
        recent[-1].last_message
    )
    
    # === 维度2：话题漂移 ===
    topic_drift = calculate_topic_drift([r.last_message for r in recent])
    
    # === 维度3：情绪得分 ===
    emotion_score = detect_emotion(current_request.last_message)
    
    # === 维度4：进展状态 ===
    progress = assess_progress(current_request, recent)
    
    # === 维度5：任务类型 ===
    task_type = detect_task_type(current_request.messages)
    task_config = TASK_PATTERNS[task_type]
    
    # === 维度6：模型特性 ===
    model_config = get_model_profile(current_request.model)
    
    # === 综合评分 ===
    score = 0
    reasons = []
    
    # 相似度判定（降权）
    if similarity > model_config["similarity_threshold"]:
        score += 20
        reasons.append(f"高相似度({similarity:.0%})")
    
    # 话题漂移
    if topic_drift < 0.2:  # 话题没怎么变
        score += 15
        reasons.append("话题未漂移")
    else:
        score -= 10  # 话题在变化，说明在探索
    
    # 情绪分析
    if emotion_score > 5:
        score += 25
        reasons.append("检测到挫败情绪")
    elif emotion_score < 0:  # 探索性关键词
        score -= 10
    
    # 进展检测
    if progress == "stuck":
        score += 30
        reasons.append("未见进展")
    elif progress == "exploring":
        score -= 15
    
    # 连续次数（保留）
    repeat_count = count_similar_requests(recent, similarity_threshold=0.75)
    if repeat_count > task_config["allow_iterations"]:
        score += 20 * (repeat_count - task_config["allow_iterations"])
        reasons.append(f"超过{task_type}任务建议迭代次数")
    
    # === 最终判定 ===
    confidence = min(score / 100, 1.0)  # 归一化到0-1
    
    if score >= 70:
        level = 3  # 严重警告
    elif score >= 40:
        level = 2  # 温馨提示
    else:
        level = 0  # 不触发
    
    return {
        "level": level,
        "confidence": confidence,
        "reasons": reasons,
        "details": {
            "similarity": similarity,
            "topic_drift": topic_drift,
            "emotion_score": emotion_score,
            "progress": progress,
            "task_type": task_type
        }
    }
```

-----

## 误判处理机制

### 1. 用户反馈循环

在UI中添加”这次提醒准确吗？“按钮

```python
@app.post("/api/feedback")
async def submit_feedback(request_id: str, is_accurate: bool):
    """
    用户可以标记误判
    """
    # 记录反馈
    db.add(Feedback(
        request_id=request_id,
        is_accurate=is_accurate,
        timestamp=datetime.now()
    ))
    
    # 如果误判率>20%，自动调整该项目的阈值
    project_id = get_request(request_id).project_id
    false_positive_rate = calculate_false_positive_rate(project_id)
    
    if false_positive_rate > 0.2:
        auto_adjust_thresholds(project_id, direction="relaxed")
```

### 2. 白名单关键词

用户可以添加”永远不提醒的关键词”

```yaml
# config.yaml
analyzer:
  whitelist_patterns:
    - "优化"
    - "重构"
    - "换个思路"
    - "调整"
```

### 3. 学习模式

记录用户的使用模式，动态调整

```python
# 分析用户的平均行为
user_profile = {
    "avg_iterations_per_task": 4.2,
    "preferred_models": ["claude-opus"],
    "typical_similarity": 0.65,
    "task_distribution": {"coding": 0.7, "writing": 0.3}
}

# 个性化阈值
personalized_threshold = user_profile["typical_similarity"] + 0.1
```

-----

## 配置UI界面

在设置页面添加”智能判定调试器”

```
【高级设置 - 行为判定调试】

┌─────────────────────────────────────┐
│ 判定维度权重调整                      │
├─────────────────────────────────────┤
│ ● 相似度检测        [====20%====]   │
│ ● 情绪分析          [====25%====]   │
│ ● 进展检测          [====30%====]   │
│ ● 话题漂移          [====15%====]   │
│ ● 任务类型适配      [====10%====]   │
│                                      │
│ 💡 建议：保持默认配置，除非频繁误判    │
└─────────────────────────────────────┘

【测试工具】
输入对话历史，查看判定结果：
[ 测试文本框 ]
[🔍 模拟判定]

结果：
✓ Level: 2 (温馨提示)
✓ 置信度: 65%
✓ 原因: 高相似度(78%), 话题未漂移
```

-----

## 总结

改进后的判定系统：

✅ **多维度综合**：不再单一依赖相似度
✅ **任务感知**：编程/写作/调试应用不同策略
✅ **模型适配**：Claude和GPT用不同阈值
✅ **情绪理解**：区分挫败和探索
✅ **可调试**：用户可以查看判定原因并反馈
✅ **自学习**：根据反馈自动优化

这样可以大幅降低误判率，同时保持对真正无效循环的识别能力。