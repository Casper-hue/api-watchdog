# 快速启动指南 - For Cursor AI / Trae

这份文档是为AI编程助手设计的，包含明确的实现步骤和代码骨架。

-----

## 项目初始化

### 步骤1：创建项目结构

```
api-watchdog/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI入口
│   ├── proxy.py             # 代理核心逻辑
│   ├── analyzer.py          # 行为分析器
│   ├── advisor.py           # 文案生成器
│   ├── models.py            # 数据模型
│   └── config.py            # 配置加载
├── tests/
│   ├── test_proxy.py
│   └── test_analyzer.py
├── logs/                    # 运行日志
├── data/                    # SQLite数据库
├── config.yaml              # 配置文件
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 步骤2：安装依赖

创建 `requirements.txt`：

```
fastapi==0.108.0
uvicorn[standard]==0.25.0
httpx==0.26.0
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
pyyaml==6.0.1
scikit-learn==1.4.0  # 用于相似度计算
```

-----

## 核心代码实现

### 文件1：`app/config.py`

负责加载和验证配置文件。

**关键要求**

- 使用pydantic进行配置验证
- 支持环境变量覆盖
- 提供默认值

**预期字段**

- ServerConfig: host, port, debug
- UpstreamConfig: 各Provider的URL和超时
- PricingConfig: 汇率、单价、模型定价
- AnalyzerConfig: 相似度阈值、关键词列表
- AdvisorConfig: 限流开关、Webhook URL

-----

### 文件2：`app/models.py`

定义SQLAlchemy数据模型。

**Request模型**

```python
from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Request(Base):
    __tablename__ = "requests"
    
    id = Column(String, primary_key=True)
    timestamp = Column(DateTime)
    project_id = Column(String, index=True)
    provider = Column(String)
    model = Column(String)
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_cost_usd = Column(Float)
    similarity_score = Column(Float)
    pattern_score = Column(Integer)
    advisor_level = Column(Integer)
```

**数据库初始化**

- 在`main.py`启动时自动创建表
- 使用`data/watchdog.db`作为默认路径

-----

### 文件3：`app/proxy.py`

实现API代理的核心逻辑。

**关键函数**

**1. `proxy_request(request: ChatRequest, provider: str)`**

- 输入：用户的chat completion请求 + 目标Provider
- 输出：上游API的响应（保持流式）
- 逻辑：
1. 构造上游请求（复制headers和body）
1. 使用`httpx.AsyncClient.stream()`发起请求
1. 实时转发SSE数据块
1. 解析响应中的usage字段提取Token数

**2. `parse_tokens_from_stream(chunks: List[bytes])`**

- 从SSE流中提取最终的Token统计
- 处理OpenAI格式：`data: {"usage": {"prompt_tokens": 123}}`
- 处理Anthropic格式：`usage`字段在最后一个事件

**注意事项**

- 必须保持HTTP状态码和错误消息的透明传递
- 超时设置为120秒
- 处理网络异常时返回502 Bad Gateway

-----

### 文件4：`app/analyzer.py`

实现行为分析逻辑。

**关键函数**

**1. `calculate_similarity(text1: str, text2: str) -> float`**

- 使用余弦相似度或Jaccard相似度
- 推荐使用sklearn的TfidfVectorizer：
  
  ```python
  from sklearn.feature_extraction.text import TfidfVectorizer
  from sklearn.metrics.pairwise import cosine_similarity
  
  vectorizer = TfidfVectorizer()
  vectors = vectorizer.fit_transform([text1, text2])
  return cosine_similarity(vectors[0], vectors[1])[0][0]
  ```

**2. `extract_pattern_score(messages: List[dict]) -> int`**

- 输入：对话历史中的messages数组
- 输出：模式得分（0-10）
- 逻辑：
1. 提取最后一条user消息
1. 遍历配置中的关键词字典
1. 匹配到debug关键词+2分，repeat关键词+3分
1. 返回总分

**3. `get_recent_requests(project_id: str, limit: int = 5)`**

- 从数据库查询该项目最近的请求
- 返回id和原始消息文本（需要单独存储或从缓存读取）

**数据流**

```
[新请求] → 提取最后user消息 → 查询最近5条 → 计算相似度
         ↓
    提取关键词 → 计算pattern_score
         ↓
    合并判定 → 返回(similarity, pattern_score, level)
```

-----

### 文件5：`app/advisor.py`

生成人性化的反馈文案。

**关键函数**

**1. `generate_message(level: int, cost_usd: float, similarity: float) -> str`**

- 输入：触发等级、累计消耗、相似度
- 输出：文案字符串
- 逻辑：使用字典映射level到文案模板

**文案模板示例**

```python
MESSAGES = {
    0: "",  # 不触发
    1: "不错哦，这钱花得有章法 ☕",
    2: "又是这个错误？已经烧了{jianbing}个煎饼果子了🥞",
    3: "老板，你这是在用GPT-4炖土豆！这15分钟够买一周早餐了💸",
    4: "检测到情绪化编程。当前消耗：¥{cny}（约等于{equivalent}）"
}
```

**2. `calculate_equivalents(cost_cny: float) -> dict`**

- 输入：人民币金额
- 输出：{“coffee”: 1.2, “jianbing”: 2.3, “meal”: “一顿海底捞”}

**3. `should_trigger_cooldown(project_id: str) -> bool`**

- 检查该项目最近1小时的消耗
- 超过阈值返回True
- 建议使用Redis计数器（可选）或直接查数据库

-----

### 文件6：`app/main.py`

FastAPI应用入口。

**关键路由**

**1. POST `/v1/chat/completions`**

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat_proxy(request: Request):
    # 1. 解析请求体
    body = await request.json()
    project_id = request.headers.get("X-Project-ID", "default")
    
    # 2. 调用代理
    stream_response = proxy_request(body, provider="openai")
    
    # 3. 在后台分析（异步任务）
    asyncio.create_task(analyze_and_log(project_id, body, stream_response))
    
    # 4. 返回流式响应
    return StreamingResponse(
        stream_response,
        media_type="text/event-stream"
    )
```

**2. GET `/api/stats`**

```python
@app.get("/api/stats")
async def get_stats(project_id: str, hours: int = 24):
    # 从数据库聚合查询
    # 返回JSON格式的统计数据
    pass
```

**启动命令**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

-----

## 实现顺序建议

### Phase 1: 基础代理（2小时）

1. 实现`proxy.py`的基础转发
1. 硬编码一个OpenAI请求测试通路
1. 验证流式响应正常工作

### Phase 2: Token统计（1小时）

1. 解析SSE流中的usage字段
1. 计算美元成本
1. 保存到SQLite数据库

### Phase 3: 相似度检测（2小时）

1. 实现`calculate_similarity`函数
1. 存储最近5条请求的文本
1. 在新请求时计算相似度

### Phase 4: 文案系统（1小时）

1. 实现`advisor.py`的文案生成
1. 在Response Header返回消息
1. 测试不同level的触发

### Phase 5: 限流机制（1小时）

1. 实现消耗统计
1. 返回429状态码
1. 添加Retry-After header

-----

## 测试用例

### 单元测试示例

```python
# tests/test_analyzer.py
def test_similarity_exact_match():
    text1 = "How to fix this error?"
    text2 = "How to fix this error?"
    assert calculate_similarity(text1, text2) > 0.99

def test_similarity_different():
    text1 = "Implement user authentication"
    text2 = "Fix database connection error"
    assert calculate_similarity(text1, text2) < 0.3

def test_pattern_score_debug():
    messages = [{"role": "user", "content": "Fix this bug please"}]
    score = extract_pattern_score(messages)
    assert score >= 2  # 包含debug关键词
```

### 集成测试

```python
# tests/test_proxy.py
import httpx

async def test_proxy_forwarding():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/v1/chat/completions",
            json={"model": "gpt-4o", "messages": [...]},
            headers={"Authorization": "Bearer test-key"}
        )
        assert response.status_code == 200
        assert "X-Total-Cost-USD" in response.headers
```

-----

## Docker部署

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY config.yaml .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  watchdog:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config.yaml:/app/config.yaml
    environment:
      - DATABASE_URL=sqlite:///data/watchdog.db
```

-----

## 调试技巧

**查看实时日志**

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**测试相似度算法**

```bash
python -c "
from app.analyzer import calculate_similarity
print(calculate_similarity('hello world', 'hello there'))
"
```

**手动触发文案**

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Project-ID: test" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Fix this error"},
      {"role": "user", "content": "Fix this error"}  # 重复
    ]
  }'
```

-----

## 常见问题

**Q: 如何支持Anthropic的不同响应格式？**
A: 在`proxy.py`中添加provider参数，根据provider选择不同的Token解析逻辑。

**Q: 流式响应时如何拦截Token数据？**
A: 缓存所有SSE块，最后一个块包含usage，解析后再转发。

**Q: 数据库迁移到PostgreSQL怎么做？**
A: SQLAlchemy天然支持，只需修改连接字符串：

```python
# SQLite
engine = create_engine("sqlite:///data/watchdog.db")

# PostgreSQL
engine = create_engine("postgresql://user:pass@localhost/watchdog")
```

**Q: 如何处理多模态请求（带图片）？**
A: Token计算需要考虑图片Token，参考各Provider的定价文档。

-----

## 性能优化建议

1. **使用Redis缓存最近请求**
- Key: `project:{id}:recent`
- 避免频繁查询数据库
1. **异步处理分析逻辑**
- 使用`asyncio.create_task()`
- 不阻塞主响应流
1. **批量写入数据库**
- 使用SQLAlchemy的bulk_insert
- 每10秒或100条刷新一次
1. **限制相似度计算范围**
- 只对比最近5条请求
- 超过1小时的忽略

-----

## 成功标准

当以下场景全部通过时，MVP即为完成：

✅ **场景1：正常使用**

- 发送一个普通请求
- 收到正确响应
- Header中无Advisor消息

✅ **场景2：检测重复**

- 连续发送两个相似请求（相似度>0.75）
- 第二次请求返回Level 2文案
- Header包含`X-Advisor-Message`

✅ **场景3：触发限流**

- 快速发送20个请求，总消耗>$5
- 后续请求返回429状态码
- 响应体包含冷静期建议

✅ **场景4：统计查询**

- 访问`/api/stats?project_id=test&hours=1`
- 返回正确的总消耗和等价物

-----

## 最终交付检查清单

- [ ] 代码运行无错误
- [ ] 通过所有单元测试
- [ ] Docker镜像构建成功
- [ ] README.md包含使用说明
- [ ] config.yaml有完整注释
- [ ] 日志输出清晰可读
- [ ] 错误处理覆盖边界情况
- [ ] 性能测试：100并发不崩溃

-----

祝开发顺利！如有疑问可随时查阅`PROJECT_SPEC.md`获取更多技术细节。