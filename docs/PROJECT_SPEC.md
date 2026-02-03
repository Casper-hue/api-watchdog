# API 代理监测器 - 技术规范文档

## 项目概述

一个轻量级的LLM API代理服务，通过流量拦截实现费用审计和行为分析，以幽默的方式帮助开发者避免低效的Debug循环。

-----

## 技术架构

### 系统组成

```
[Cursor/Client] 
    ↓ HTTP Request
[API Gateway] ← 请求拦截层
    ↓
[Behavior Analyzer] ← 行为判定引擎
    ↓
[Token Counter] ← 消耗计算
    ↓
[Feedback Generator] ← 文案生成
    ↓
[Upstream LLM API] ← 实际服务商
```

### 技术栈建议

**核心服务**

- 语言：Python 3.11+（异步支持良好）
- Web框架：FastAPI（原生支持流式响应）
- 数据库：SQLite（初期）→ PostgreSQL（生产）
- 缓存：Redis（可选，用于相似度对比）

**部署**

- 容器化：Docker + docker-compose
- 反向代理：Nginx（可选，处理SSL）

-----

## 核心模块设计

### 1. API Gateway（流量中转）

**职责**

- 接收客户端请求
- 转发到上游LLM服务
- 处理流式响应（SSE）

**关键实现点**

```
POST /v1/chat/completions
Headers:
  - Authorization: Bearer <user_api_key>
  - X-Upstream-Provider: openai|anthropic|openrouter
```

**流程**

1. 验证用户API Key（可选）
1. 记录请求时间戳
1. 复制请求体到上游
1. 拦截响应进行Token统计
1. 原样返回给客户端

**注意事项**

- 必须保持流式响应的实时性
- 错误时透传上游错误码
- 超时设置：120秒（长文本生成）

-----

### 2. Token Audit（消耗审计）

**数据模型**

```
Request {
  id: UUID
  timestamp: DateTime
  project_id: String (从请求头或路径提取)
  provider: String
  model: String
  prompt_tokens: Int
  completion_tokens: Int
  total_tokens: Int
  estimated_cost_usd: Float
}
```

**定价表**
硬编码常见模型价格（美元/1K tokens）：

- gpt-4o: input=$0.0025, output=$0.010
- claude-sonnet-3.5: input=$0.003, output=$0.015
- deepseek-chat: input=$0.00014, output=$0.00028

**货币转化**

- 1 USD = 7.3 CNY（汇率可配置）
- 咖啡单位：1杯 = ¥15
- 煎饼果子：1套 = ¥8

-----

### 3. Behavior Analyzer（行为判定）

**相似度检测算法**
使用余弦相似度对比连续请求：

1. 提取最后一条user消息
1. 使用TF-IDF或直接计算字符重叠
1. 阈值：>0.75视为高度相似

**模式识别规则**

|关键词组                  |判定     |权重|
|----------------------|-------|--|
|error, bug, fix, 修复   |Debug模式|+2|
|implement, create, new|开发模式   |0 |
|refactor, optimize    |优化模式   |+1|
|same, 一样, 还是          |重复模式   |+3|

**循环判定逻辑**

```python
if similarity > 0.75 and pattern_score >= 3:
    trigger_level = "WARNING"
elif similarity > 0.85 and pattern_score >= 5:
    trigger_level = "CRITICAL"
```

-----

### 4. Feedback Generator（情绪回馈）

**文案等级系统**

**Level 0: 正常使用**

- 消耗速率：<$0.5/小时
- 文案：不触发

**Level 1: 精明投资**

- 触发条件：新功能开发，Token效率高
- 示例：“不错哦，这钱花得有章法 ☕”

**Level 2: 温馨提示**

- 触发条件：相似度>0.75，连续2次
- 示例：“又是这个错误？要不换个思路试试？已经烧了3个煎饼果子了🥞”

**Level 3: 严重警告**

- 触发条件：相似度>0.85，连续3次，消耗>$2
- 示例：“老板，你这是在用GPT-4炖土豆！这15分钟的循环够买一周早餐了💸”

**Level 4: 强制冷静**

- 触发条件：单小时消耗>$5
- 行为：返回429状态码 + 冷静期建议
- 示例：“检测到情绪化编程，建议休息20分钟。当前消耗：¥36.5（约等于一顿海底捞）”

**交付方式**

- HTTP Response Header: `X-Advisor-Message`
- Webhook（可选）：POST到配置的URL
- 本地日志：保存在`/logs/advisor.log`

-----

## 数据存储设计

### SQLite Schema（初期）

```sql
CREATE TABLE requests (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT,
    provider TEXT,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost_usd REAL,
    similarity_score REAL,
    pattern_score INTEGER,
    advisor_level INTEGER
);

CREATE INDEX idx_project_time ON requests(project_id, timestamp);
CREATE INDEX idx_similarity ON requests(similarity_score);
```

### 会话管理

使用Redis（可选）缓存最近5条请求用于相似度对比：

```
Key: session:{project_id}:recent
Value: [request_id_1, request_id_2, ...]
TTL: 1 hour
```

-----

## 配置文件设计

**config.yaml**

```yaml
server:
  host: "0.0.0.0"
  port: 8000
  debug: false

upstream:
  openai: "https://api.openai.com"
  anthropic: "https://api.anthropic.com"
  openrouter: "https://openrouter.ai/api"
  timeout: 120

pricing:
  exchange_rate_usd_to_cny: 7.3
  coffee_price_cny: 15
  jianbing_price_cny: 8
  
  models:
    gpt-4o:
      input: 0.0025
      output: 0.010
    claude-sonnet-3.5-20241022:
      input: 0.003
      output: 0.015

analyzer:
  similarity_threshold_warning: 0.75
  similarity_threshold_critical: 0.85
  pattern_keywords:
    debug: ["error", "bug", "fix", "修复", "报错"]
    repeat: ["same", "still", "一样", "还是"]

advisor:
  enable_rate_limit: true
  max_cost_per_hour_usd: 5.0
  cooldown_minutes: 20
  webhook_url: ""  # 可选
```

-----

## API接口规范

### 1. 代理接口（兼容OpenAI格式）

**请求**

```http
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer sk-proj-xxx
X-Project-ID: my-awesome-app

{
  "model": "gpt-4o",
  "messages": [...],
  "stream": true
}
```

**响应（成功）**

```http
HTTP/1.1 200 OK
X-Advisor-Message: 又是这个错误？要不换个思路试试？
X-Total-Cost-USD: 0.042
X-Total-Cost-CNY: 0.31

data: {"choices": [...]}
```

**响应（触发限流）**

```http
HTTP/1.1 429 Too Many Requests
X-Advisor-Message: 检测到情绪化编程，建议休息20分钟
Retry-After: 1200

{
  "error": {
    "message": "当前消耗：¥36.5，已触发保护机制",
    "type": "rate_limit_exceeded"
  }
}
```

-----

### 2. 统计查询接口

**按项目查询消耗**

```http
GET /api/stats?project_id=my-app&hours=24

Response:
{
  "project_id": "my-app",
  "period": "24h",
  "total_requests": 127,
  "total_cost_usd": 3.42,
  "total_cost_cny": 24.97,
  "equivalents": {
    "coffee_cups": 1.66,
    "jianbing_sets": 3.12
  },
  "debug_rate": 0.34,
  "top_models": [
    {"model": "gpt-4o", "requests": 89, "cost": 2.81}
  ]
}
```

-----

## 实现优先级

### MVP（Minimum Viable Product）

1. ✅ 基础代理转发（支持OpenAI格式）
1. ✅ Token统计和成本计算
1. ✅ 简单相似度检测（字符串对比）
1. ✅ 三级文案系统（Level 0-2）
1. ✅ SQLite本地存储

### V1.0

1. ⭐ 完整的模式识别（关键词权重）
1. ⭐ 强制冷静机制（429限流）
1. ⭐ Webhook通知
1. ⭐ 支持多Provider（Anthropic/OpenRouter）

### V1.1（可选）

1. 📊 Web Dashboard（查看历史趋势）
1. 🔐 用户认证系统
1. 📈 PostgreSQL迁移
1. 🎨 自定义文案模板

-----

## 开发检查清单

**环境准备**

- [ ] Python 3.11+ 安装
- [ ] 创建虚拟环境
- [ ] 安装依赖：`pip install fastapi uvicorn httpx sqlalchemy`

**核心功能**

- [ ] 实现 `/v1/chat/completions` 代理
- [ ] 实现流式响应处理
- [ ] Token计数逻辑
- [ ] 数据库模型定义
- [ ] 相似度计算函数
- [ ] 文案生成器

**测试**

- [ ] 单元测试：Token计算准确性
- [ ] 集成测试：代理转发完整性
- [ ] 压力测试：100并发请求

**部署**

- [ ] 编写Dockerfile
- [ ] 编写docker-compose.yml
- [ ] 环境变量配置
- [ ] 日志系统

-----

## 风险提示

**隐私问题**

- 请求内容包含用户代码，需明确数据保留策略
- 建议：只存储元数据（Token数、时间戳），不存储实际Prompt

**成本估算误差**

- LLM定价频繁变动，需定期更新
- 建议：提供配置界面或从官方API获取

**误杀问题**

- 合理的重试可能被判定为循环
- 建议：提供白名单或”我知道我在做什么”的绕过开关

-----

## 未来扩展方向

1. **团队版**：支持多用户、预算分配
1. **AI建议**：基于历史数据，推荐最省钱的模型
1. **IDE插件**：直接在Cursor中显示实时消耗
1. **社区功能**：匿名分享Debug循环案例
