# API接口文档

本文档定义了API Watchdog的所有HTTP接口。

-----

## 基础信息

**Base URL**: `http://localhost:8000`（开发环境）  
**协议**: HTTP/1.1  
**编码**: UTF-8  
**Content-Type**: `application/json`（除流式响应外）

-----

## 认证（可选）

如果启用了API Key验证（`security.require_api_key: true`），所有请求需包含：

```http
Authorization: Bearer sk-watchdog-your-key-here
```

-----

## 1. LLM代理接口

### 1.1 Chat Completions（兼容OpenAI格式）

**端点**: `POST /v1/chat/completions`

**用途**: 代理LLM请求，执行监控和分析

**请求头**:

```http
Content-Type: application/json
Authorization: Bearer <upstream_api_key>
X-Project-ID: my-project-name          # 可选，用于区分不同项目
X-Upstream-Provider: openai            # 可选，默认openai，支持：openai/anthropic/openrouter
```

**请求体**（OpenAI格式）:

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Write a Python function to reverse a string."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": true
}
```

**响应（流式）**:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
X-Advisor-Message: 不错哦，这钱花得有章法 ☕
X-Total-Cost-USD: 0.023
X-Total-Cost-CNY: 0.17
X-Advisor-Level: 1
X-Request-ID: req_abc123

data: {"id":"chatcmpl-123","object":"chat.completion.chunk",...}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk",...}

data: [DONE]
```

**响应（非流式）**:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "def reverse_string(s):\n    return s[::-1]"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

**自定义响应头说明**:

|Header            |类型    |说明              |
|------------------|------|----------------|
|X-Advisor-Message |string|智能顾问的文案（仅在触发时存在）|
|X-Advisor-Level   |int   |触发等级（0-4）       |
|X-Total-Cost-USD  |float |本次请求消耗（美元）      |
|X-Total-Cost-CNY  |float |本次请求消耗（人民币）     |
|X-Request-ID      |string|请求唯一标识符         |
|X-Similarity-Score|float |与上次请求的相似度（0-1）  |

**错误响应（429 限流）**:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1200
X-Advisor-Message: 检测到情绪化编程，建议休息20分钟
X-Total-Cost-USD: 5.23

{
  "error": {
    "message": "检测到情绪化编程，建议休息20分钟",
    "type": "rate_limit_exceeded",
    "code": "excessive_usage",
    "details": {
      "cost_usd": 5.23,
      "cost_cny": 38.18,
      "cooldown_seconds": 1200,
      "suggestions": [
        "去喝杯水",
        "看看官方文档"
      ]
    }
  }
}
```

**错误响应（502 上游错误）**:

```http
HTTP/1.1 502 Bad Gateway

{
  "error": {
    "message": "Upstream API request failed",
    "type": "upstream_error",
    "upstream_status": 500
  }
}
```

-----

### 1.2 Anthropic格式支持

**端点**: `POST /v1/messages`

**请求头**:

```http
Content-Type: application/json
x-api-key: <anthropic_api_key>
anthropic-version: 2023-06-01
X-Project-ID: my-project
```

**请求体**:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Explain quantum computing"
    }
  ]
}
```

**响应**:
与OpenAI格式类似，同样包含自定义Header。

-----

## 2. 统计查询接口

### 2.1 项目统计

**端点**: `GET /api/stats`

**用途**: 查询指定项目的消耗统计

**请求参数**:

```
GET /api/stats?project_id=my-app&hours=24&group_by=model

参数：
- project_id (required): 项目ID
- hours (optional): 统计时间范围（小时），默认24
- group_by (optional): 分组字段（model/provider/hour），默认不分组
```

**响应**:

```json
{
  "project_id": "my-app",
  "period": {
    "start": "2024-02-01T00:00:00Z",
    "end": "2024-02-02T00:00:00Z",
    "hours": 24
  },
  "summary": {
    "total_requests": 127,
    "total_cost_usd": 3.42,
    "total_cost_cny": 24.97,
    "avg_cost_per_request": 0.027,
    "total_tokens": 45230,
    "avg_tokens_per_request": 356
  },
  "equivalents": {
    "coffee_cups": 1.66,
    "jianbing_sets": 3.12,
    "meals": 0.5,
    "hotpot": 0.2
  },
  "behavior_analysis": {
    "debug_rate": 0.34,
    "repeat_rate": 0.12,
    "avg_similarity": 0.23,
    "efficiency_rating": "B"
  },
  "breakdown": {
    "by_model": [
      {
        "model": "gpt-4o",
        "requests": 89,
        "cost_usd": 2.81,
        "percentage": 82.2
      },
      {
        "model": "gpt-4o-mini",
        "requests": 38,
        "cost_usd": 0.61,
        "percentage": 17.8
      }
    ],
    "by_hour": [
      {
        "hour": "2024-02-01T14:00:00Z",
        "requests": 23,
        "cost_usd": 0.87
      }
    ]
  }
}
```

-----

### 2.2 全局统计

**端点**: `GET /api/stats/global`

**用途**: 查询所有项目的汇总数据

**请求参数**:

```
GET /api/stats/global?hours=168

参数：
- hours (optional): 统计时间范围，默认168（7天）
```

**响应**:

```json
{
  "period": {
    "start": "2024-01-26T00:00:00Z",
    "end": "2024-02-02T00:00:00Z",
    "hours": 168
  },
  "summary": {
    "total_projects": 5,
    "total_requests": 1523,
    "total_cost_usd": 42.18,
    "total_cost_cny": 307.91
  },
  "top_projects": [
    {
      "project_id": "project-a",
      "requests": 823,
      "cost_usd": 28.34,
      "percentage": 67.2
    }
  ],
  "trends": {
    "daily_avg_cost": 6.03,
    "peak_hour": "2024-02-01T15:00:00Z",
    "lowest_hour": "2024-02-01T03:00:00Z"
  }
}
```

-----

### 2.3 请求详情

**端点**: `GET /api/requests/{request_id}`

**用途**: 查询单个请求的详细信息

**响应**:

```json
{
  "id": "req_abc123",
  "timestamp": "2024-02-01T14:23:45Z",
  "project_id": "my-app",
  "provider": "openai",
  "model": "gpt-4o",
  "tokens": {
    "prompt": 120,
    "completion": 230,
    "total": 350
  },
  "cost": {
    "usd": 0.035,
    "cny": 0.26
  },
  "analysis": {
    "similarity_score": 0.82,
    "pattern_score": 5,
    "advisor_level": 2,
    "advisor_message": "又是这个错误？已经烧了3个煎饼果子了🥞"
  },
  "metadata": {
    "duration_ms": 2340,
    "upstream_status": 200
  }
}
```

-----

## 3. 管理接口

### 3.1 健康检查

**端点**: `GET /health`

**响应**:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "database": "connected",
  "upstream": {
    "openai": "reachable",
    "anthropic": "reachable"
  }
}
```

-----

### 3.2 配置查看

**端点**: `GET /api/config`

**用途**: 查看当前配置（敏感信息已脱敏）

**响应**:

```json
{
  "analyzer": {
    "similarity_threshold_warning": 0.75,
    "similarity_threshold_critical": 0.85
  },
  "advisor": {
    "enable": true,
    "enable_rate_limit": true,
    "max_cost_per_hour_usd": 5.0
  },
  "pricing": {
    "exchange_rate": 7.3,
    "models_count": 12
  }
}
```

-----

### 3.3 清除项目数据

**端点**: `DELETE /api/projects/{project_id}`

**用途**: 删除指定项目的所有历史数据

**响应**:

```json
{
  "success": true,
  "deleted_requests": 234,
  "message": "Project 'my-app' data cleared"
}
```

-----

## 4. Webhook通知

当启用Webhook功能时，系统会向配置的URL发送事件通知。

**触发时机**:

- Level 2-4 的文案触发时
- 每日账单生成时

**请求格式**:

```http
POST {webhook_url}
Content-Type: application/json

{
  "event": "advisor_triggered",
  "level": 3,
  "project_id": "my-app",
  "timestamp": "2024-02-01T14:30:00Z",
  "data": {
    "message": "老板，你这是在用GPT-4炖土豆！",
    "cost_usd": 2.34,
    "cost_cny": 17.08,
    "repeat_count": 4,
    "similarity": 0.87
  }
}
```

**预期响应**:

```http
HTTP/1.1 200 OK
```

-----

## 5. 错误码

|状态码|含义   |触发场景     |
|---|-----|---------|
|200|成功   |正常请求     |
|400|请求错误 |参数格式错误   |
|401|未授权  |API Key无效|
|429|限流   |触发强制冷静机制 |
|500|服务器错误|内部异常     |
|502|网关错误 |上游API失败  |
|503|服务不可用|数据库连接失败  |

-----

## 6. 速率限制

**全局限制**:

- 每IP每分钟最多100次请求
- 超出返回429状态码

**项目级限制**:

- 由advisor.rate_limit配置决定
- 基于消耗金额而非请求数

-----

## 7. 使用示例

### Python示例（使用OpenAI SDK）

```python
import openai

# 配置代理
openai.api_base = "http://localhost:8000/v1"
openai.api_key = "sk-your-upstream-key"

# 添加自定义header
response = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello!"}
    ],
    headers={
        "X-Project-ID": "my-python-app"
    }
)

# 检查顾问消息
if hasattr(response, 'response_headers'):
    advisor_msg = response.response_headers.get('X-Advisor-Message')
    if advisor_msg:
        print(f"💬 Advisor: {advisor_msg}")
```

### Curl示例

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -H "X-Project-ID: curl-test" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Test message"}
    ]
  }' -i
```

### JavaScript示例

```javascript
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-your-key',
    'X-Project-ID': 'my-js-app'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{role: 'user', content: 'Hello'}]
  })
});

const advisorMsg = response.headers.get('X-Advisor-Message');
if (advisorMsg) {
  console.log('Advisor:', advisorMsg);
}
```

-----

## 8. 最佳实践

1. **始终设置X-Project-ID**：便于区分不同项目的消耗
1. **处理429错误**：实现指数退避重试
1. **监听Webhook**：及时收到警告通知
1. **定期查询统计**：了解消耗趋势
1. **测试环境使用便宜模型**：避免不必要的成本

-----

## 9. 客户端配置

### Cursor配置

```json
// settings.json
{
  "cursor.api.baseUrl": "http://localhost:8000/v1",
  "cursor.api.headers": {
    "X-Project-ID": "my-cursor-project"
  }
}
```

### 环境变量配置

```bash
export OPENAI_API_BASE="http://localhost:8000/v1"
export OPENAI_API_KEY="sk-your-upstream-key"
```

-----

## 10. 版本兼容性

|版本  |支持的Provider                  |特性                 |
|----|-----------------------------|-------------------|
|v1.0|OpenAI                       |基础代理+监控            |
|v1.1|OpenAI, Anthropic            |多Provider支持        |
|v1.2|OpenAI, Anthropic, OpenRouter|Dashboard + Webhook|

-----

## 附录：响应时间

典型响应时间（不含上游LLM处理时间）：

- 代理转发：<50ms
- 统计查询：<100ms
- 相似度计算：<200ms

监控不会显著增加请求延迟。