# 文案库 - 毒舌会计师人设

本文件包含所有等级的反馈文案模板，支持变量插值。

-----

## 使用说明

### 变量列表

可在文案中使用的占位符：

- `{cost_usd}` - 美元金额（保留2位小数）
- `{cost_cny}` - 人民币金额（保留2位小数）
- `{coffee}` - 咖啡杯数（保留1位小数）
- `{jianbing}` - 煎饼果子数量（保留1位小数）
- `{meal}` - 正餐次数（保留1位小数）
- `{hotpot}` - 火锅次数（保留1位小数）
- `{model}` - 使用的模型名称
- `{repeat_count}` - 连续重复次数
- `{similarity}` - 相似度百分比（0-100）
- `{time_spent}` - 耗时（分钟）
- `{efficiency}` - 效率评级（A/B/C/D）

-----

## Level 0: 静默模式

**触发条件**：正常使用，无异常行为

**文案**：

```
（不返回任何消息）
```

-----

## Level 1: 精明投资

**触发条件**：

- 新功能开发模式
- Token效率高（单次<1000 tokens）
- 无重复请求

**文案列表**（随机选择）：

```yaml
messages:
  - "不错哦，这钱花得有章法 ☕"
  - "精打细算，这才是专业开发者应有的样子"
  - "效率在线！这{coffee}杯咖啡花得值"
  - "看得出来，你对{model}的理解很到位"
  - "这个Prompt写得漂亮，一次就命中了"
  - "省钱小能手认证 ✅"
```

-----

## Level 2: 温馨提示

**触发条件**：

- 相似度 > 75%
- 连续2次相似请求
- 或单次消耗 > $1

**文案列表**：

```yaml
messages:
  - "又是这个错误？要不换个思路试试？已经烧了{jianbing}个煎饼果子了🥞"
  - "检测到{repeat_count}次重复请求，相似度{similarity}%。考虑看看官方文档？"
  - "这个方向可能不太对，已经花了¥{cost_cny}了"
  - "友情提示：同一个问题问{repeat_count}遍，AI也会懵的😅"
  - "建议：先理清思路再发请求。当前消耗：{coffee}杯咖啡"
  - "老板，这样下去午饭钱要没了哦（已花{jianbing}个煎饼）"
  - "看起来遇到瓶颈了？换个模型试试？比如从{model}切到更便宜的"
```

**附加建议**（可选，追加在文案后）：

```yaml
tips:
  - "💡 试试把错误信息完整贴出来"
  - "💡 先Google一下这个error？"
  - "💡 检查一下是不是配置文件的问题"
  - "💡 休息5分钟，换个角度思考"
```

-----

## Level 3: 严重警告

**触发条件**：

- 相似度 > 85%
- 连续3次以上
- 单次对话消耗 > $2
- 或15分钟内消耗 > $3

**文案列表**：

```yaml
messages:
  - "老板，你这是在用GPT-4炖土豆！这15分钟的循环够买一周早餐了💸"
  - "⚠️ 已连续{repeat_count}次相似请求，累计¥{cost_cny}（={hotpot}顿火锅）"
  - "停停停！这个bug已经吞了{meal}顿饭钱，该换个策略了"
  - "建议暂停。当前效率评级：D-，性价比堪忧"
  - "这{time_spent}分钟花掉${cost_usd}，建议：放下手机，去散个步"
  - "检测到情绪化编程倾向，深呼吸三次再继续？"
  - "你的钱包在哭泣：已烧掉{coffee}杯咖啡，成果=0"
```

**严厉版本**（debug_score > 8时使用）：

```yaml
harsh_messages:
  - "说真的，这钱拿去打赏Stack Overflow可能更有效"
  - "已经{repeat_count}次了，AI不是万能的，该找人问问了"
  - "你在跟{model}吵架吗？它听不懂'为什么还不行'"
  - "这是今天第{repeat_count}次同样的错误，建议：关电脑，明天再说"
```

**数据展示**（追加在文案后）：

```yaml
stats_display: |
  📊 循环分析：
  - 重复次数：{repeat_count}
  - 相似度：{similarity}%
  - 已花费：${cost_usd} (¥{cost_cny})
  - 等价于：{jianbing}个煎饼果子 或 {coffee}杯咖啡
```

-----

## Level 4: 强制冷静

**触发条件**：

- 单小时消耗 > $5
- 或连续5次以上高相似度请求

**行为**：返回 HTTP 429 状态码

**文案列表**：

```yaml
messages:
  - "🛑 检测到情绪化编程，强制冷静期20分钟"
  - "🛑 当前消耗：¥{cost_cny}（约等于{hotpot}顿海底捞），已触发保护机制"
  - "🛑 你刚刚烧掉了{meal}顿饭钱，休息一下吧"
  - "🛑 这一小时花了${cost_usd}，效率却是负数。该睡觉了老板"
```

**响应体**（JSON格式）：

```json
{
  "error": {
    "message": "检测到情绪化编程，建议休息{cooldown_minutes}分钟",
    "type": "rate_limit_exceeded",
    "details": {
      "cost_usd": 5.23,
      "cost_cny": 38.18,
      "equivalents": {
        "coffee": 2.5,
        "jianbing": 4.8,
        "hotpot": 0.3
      },
      "retry_after_seconds": 1200,
      "suggestions": [
        "去喝杯水",
        "看看官方文档",
        "找同事聊聊",
        "换个角度思考问题"
      ]
    }
  }
}
```

**HTTP Headers**：

```
HTTP/1.1 429 Too Many Requests
Retry-After: 1200
X-Advisor-Level: 4
X-Total-Cost-USD: 5.23
X-Cooldown-Reason: excessive_debug_loop
```

-----

## Level 5: 每日总结（可选功能）

**触发条件**：每日UTC 16:00（北京时间0点）

**文案模板**：

```yaml
daily_summary: |
  📅 今日账单已生成
  
  💰 总消耗：${cost_usd} (¥{cost_cny})
  📊 请求次数：{total_requests}
  🔥 最烧钱模型：{top_model} (${top_model_cost})
  
  等价物换算：
  - {coffee}杯咖啡 ☕
  - {jianbing}套煎饼果子 🥞
  - {meal}顿正餐 🍱
  
  {efficiency_comment}
```

**效率评语**（根据日消耗和产出比）：

```yaml
efficiency_comments:
  excellent: "效率爆表！这钱花得明明白白 🎉"
  good: "表现不错，继续保持这个节奏"
  average: "中规中矩，还有优化空间"
  poor: "今天有点烧钱，明天注意点哦"
  terrible: "老板，咱明天换个便宜点的模型吧😅"
```

-----

## 特殊场景文案

### 场景1：首次触发警告

```yaml
first_warning: |
  👋 首次警告！
  
  检测到你可能陷入了Debug循环。我是你的智能会计师，
  职责是帮你省钱💰
  
  当前情况：{current_issue}
  
  建议：{suggestion}
```

### 场景2：连续多天高消耗

```yaml
multi_day_warning: |
  📈 已连续{days}天日消耗>$5
  
  累计花费：${total_cost_usd}
  平均日消耗：${avg_daily_cost}
  
  这个月下来预计要花掉{monthly_projection}...
  考虑升级个人套餐或优化Prompt？
```

### 场景3：模型选择建议

```yaml
model_suggestion: |
  💡 省钱小贴士
  
  你正在用{current_model}，但这个任务用{suggested_model}就够了，
  能省{saving_percent}%的钱。
  
  对比：
  - {current_model}: ${current_cost}/次
  - {suggested_model}: ${suggested_cost}/次
```

### 场景4：成功解决问题后

```yaml
success_celebration: |
  🎉 恭喜搞定！
  
  这次循环：
  - 尝试次数：{attempts}
  - 总耗时：{duration}分钟
  - 总花费：¥{cost_cny}
  
  {efficiency_rating}
```

**效率评级**：

```yaml
efficiency_ratings:
  A: "效率A级！一次搞定真是太爽了"
  B: "效率B级，还不错，2-3次就解决了"
  C: "效率C级，稍微绕了点弯"
  D: "效率D级，下次试试先理清思路？"
  F: "效率F...要不咱复盘一下哪里出问题了"
```

-----

## 文案风格指南

### 人设定位

- **角色**：务实的会计师 + 损友
- **态度**：毒舌但不刻薄，幽默但点到为止
- **目标**：帮用户省钱，不是单纯吐槽

### 语言特点

✅ **要做的**：

- 用具象化的货币等价物（咖啡、煎饼、火锅）
- 适度使用emoji增强趣味性
- 数据精准，文案生动
- 给出可执行的建议

❌ **不要做的**：

- 过度说教或居高临下
- 使用专业黑话（除非必要）
- 纯粹嘲讽而没有建设性
- 文案过长（单条<100字）

### 分寸感把握

- Level 1-2：轻松友好，点到即止
- Level 3：明确警告，但保留幽默
- Level 4：严肃但不冰冷，给出明确指引

-----

## 国际化支持（可选）

### 英文版本

```yaml
en:
  level_2:
    - "Detected {repeat_count} similar requests. Maybe try a different approach? That's {jianbing} jianbing already 🥞"
    - "Looks like you're stuck. Current cost: {coffee} cups of coffee ☕"
  
  level_3:
    - "⚠️ This debug loop has consumed {meal} meals worth of money. Time to change strategy!"
    - "Seriously, this ${cost_usd} could buy you a nice dinner instead of GPT-4 therapy"
```

-----

## 自定义扩展

用户可以在配置文件中覆盖默认文案：

```yaml
# config.yaml
advisor:
  custom_messages:
    level_2:
      - "你的自定义文案1"
      - "你的自定义文案2"
    level_3:
      - "更严厉的自定义文案"
```

实现逻辑：优先使用custom_messages，fallback到默认文案库。