```text
         /|    |\                                                 
        / |    | \
       /  |____|  \           [ ⚡️ NEURAL_LINK: ESTABLISHED ]
      |            |          ------------------------------
      | (X)    (X) |          >> STATUS: KILL_PROCESS_ON_SIGHT
      |    |  |    |          >> TARGET: REPEATED_API_CALLS
       \    xx    /           >> ACTION: NULL_POINTER_STRIKE
       | \__/\__/ |
       |-_-_-0_-_-|           "Your budget is my priority."
      /            \
```

# API Watchdog 🔍💸

> 一个会吐槽的智能API代理 - 帮你在Debug循环中守住钱包

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.108+-green.svg)](https://fastapi.tiangolo.com/)
![Vibe](https://img.shields.io/badge/Vibe-Toxic-ff69b4.svg?style=flat-square) > ![Coffee](https://img.shields.io/badge/Coffee-Required-brown.svg?style=flat-square)

[English Version](README_EN.md)

-----

## 这是什么？

一个**会说人话的LLM API代理服务**。它不仅帮你转发请求，还会：

- 📊 实时统计你烧了多少钱（换算成咖啡/煎饼果子）
- 🔄 检测你是否陷入了"无效的Debug死循环"
- 💬 用毒舌会计师的口吻温馨（或不那么温馨地）提醒你
- 🛑 必要时强制让你冷静20分钟

-----

## 为什么需要它？

你是否遇到过这种场景：

```
你：帮我修复这个错误
AI：试试这样改
你：还是不行，怎么办？
AI：那换个方法
你：依然报错...
AI：...
你：（15分钟后）为什么账单增加了$5？
```

**这个工具就是为了拯救你的钱包而生的。**

-----

## 核心功能

### 1️⃣ 智能代理

- 支持 OpenAI / Anthropic / OpenRouter
- 完全兼容原始API格式
- 流式响应无感知

### 2️⃣ 消耗审计

- 实时Token统计
- 精确成本计算（精确到分）
- 多维度货币转化（USD → CNY → 咖啡 → 煎饼果子）

### 3️⃣ 行为识别

- **相似度检测**：识别重复请求（余弦相似度算法）
- **模式识别**：区分Debug模式 vs 开发模式
- **循环判定**：连续3次相似请求 = 红色预警

### 4️⃣ 毒舌会计师

根据你的"烧钱速度"，AI会计师会：

|等级     |触发条件 |文案风格                 |
|-------|-----|---------------------|
|Level 0|正常使用 |沉默                   |
|Level 1|效率高  |"不错哦，这钱花得有章法 ☕"      |
|Level 2|轻度重复 |"又是这个错误？已经烧了3个煎饼果子了🥞"|
|Level 3|严重循环 |"老板，你这是在用GPT-4炖土豆！"  |
|Level 4|情绪化编程|**强制冷静期** 🛑 返回429    |

-----

## 界面截图

![仪表板概览](./screenshots/dashboard.png)<!-- 截图占位区域 -->
*仪表板概览页面 - 显示使用统计和成本分析*

![项目管理](./screenshots/projects.png)<!-- 截图占位区域 -->
*项目管理页面 - 项目特定的监控和详细分析*

![统计页面](./screenshots/statistics.png)<!-- 截图占位区域 -->
*统计页面 - 趋势分析和图表展示*

![设置页面](./screenshots/settings.png)<!-- 截图占位区域 -->
*设置页面 - 配置和偏好设置*

-----

## 快速开始

### 📝 重要说明：测试数据

**当前项目包含演示用的测试数据**，用于展示界面功能。实际使用时请删除测试数据：

```bash
# 删除测试数据文件
rm data/watchdog.db

# 重新启动服务（会自动创建空数据库）
docker-compose restart
# 或
uvicorn app.main:app --reload
```

### 方式1：Docker（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Casper-hue/api-watchdog.git
cd api-watchdog

# 2. 配置
cp config.yaml.example config.yaml
# 编辑config.yaml，填入你的配置

# 3. 启动
docker-compose up -d

# 4. 测试
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-openai-key" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'
```

### 方式2：Python直接运行

```bash
# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置
cp config.yaml.example config.yaml
# 根据需要编辑config.yaml

# 4. 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. 启动前端（在新终端中）
cd api-watchdog
npm install
npm run dev
```

### 方式3：开发环境设置

```bash
# 后端开发
cd app
python -m uvicorn main:app --reload

# 前端开发
cd api-watchdog
npm run dev
```

-----

## 配置你的AI工具

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

### OpenAI SDK配置

```python
import openai

openai.api_base = "http://localhost:8000/v1"
openai.api_key = "sk-your-upstream-key"

response = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    headers={"X-Project-ID": "my-python-app"}
)

# 检查顾问消息
advisor_msg = response.response_headers.get('X-Advisor-Message')
if advisor_msg:
    print(f"💬 {advisor_msg}")
```

-----

## 实际效果展示

### 场景1：正常开发

```http
POST /v1/chat/completions
{"model": "gpt-4o", "messages": [...]}

Response:
HTTP/1.1 200 OK
X-Total-Cost-USD: 0.023
X-Total-Cost-CNY: 0.17
X-Advisor-Message: 不错哦，这钱花得有章法 ☕
```

### 场景2：检测到循环

```http
# 第1次请求
User: "Fix this error in my code"

# 第2次请求（相似度82%）
User: "Still not working, fix it"

Response:
HTTP/1.1 200 OK
X-Advisor-Message: 又是这个错误？已经烧了3个煎饼果子了🥞
X-Advisor-Level: 2
X-Similarity-Score: 0.82
```

### 场景3：触发强制冷静

```http
# 连续5次高相似度请求，消耗$5.23

Response:
HTTP/1.1 429 Too Many Requests
Retry-After: 1200

{
  "error": {
    "message": "检测到情绪化编程，建议休息20分钟",
    "details": {
      "cost_usd": 5.23,
      "cost_cny": 38.18,
      "equivalents": {"coffee": 2.5, "hotpot": 0.3},
      "suggestions": ["去喝杯水", "看看官方文档"]
    }
  }
}
```

-----

## 项目结构

```
API-Watchdog/
├── app/                    # 后端FastAPI应用
│   ├── main.py            # 主应用入口
│   ├── proxy.py           # API代理逻辑
│   ├── analyzer.py        # 行为分析逻辑
│   ├── advisor.py         # 幽默反馈生成
│   ├── models.py          # 数据库模型
│   ├── routes.py          # API路由
│   ├── config.py          # 配置处理
│   └── i18n.py            # 国际化支持
├── api-watchdog/          # 前端Next.js应用
│   ├── app/               # Next.js页面路由
│   ├── components/        # React组件
│   ├── lib/               # 工具函数
│   └── public/            # 静态资源
├── data/                  # 数据库文件
├── tests/                 # 测试文件
├── config.yaml            # 主配置文件
├── requirements.txt       # Python依赖
└── README.md              # 本文档
```

-----

## 配置说明

`config.yaml`中的关键配置选项：

```yaml
server:
  host: "0.0.0.0"
  port: 8000

upstream:
  openai:
    base_url: "https://api.openai.com"
  anthropic:
    base_url: "https://api.anthropic.com"

pricing:
  exchange_rate_usd_to_cny: 7.3
  equivalents:
    coffee: 15
    jianbing: 8

analyzer:
  similarity_threshold_warning: 0.65
  similarity_threshold_critical: 0.75
```

-----

## API使用

### 基础代理使用

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -H "X-Project-ID: my-project" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### 仪表板API

```bash
# 获取仪表板摘要
curl http://localhost:8000/api/dashboard/summary

# 获取项目统计
curl http://localhost:8000/api/projects/my-project/stats

# 获取最近活动
curl http://localhost:8000/api/activities/recent
```

-----

## 开发

### 环境要求
- Python 3.11+
- Node.js 18+
- SQLite（已包含）

### 运行测试

```bash
# 后端测试
cd app
python -m pytest

# 前端测试
cd api-watchdog
npm test
```

### 生产环境构建

```bash
# 前端构建
cd api-watchdog
npm run build

# 后端已准备好生产环境
# 使用uvicorn的--workers参数用于生产
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

-----

## 部署

### Docker部署

```bash
docker-compose -f docker-compose.production.yml up -d
```

### 云部署

查看[部署指南](./docs/DEPLOYMENT_GUIDE.md)获取详细部署说明：
- AWS ECS
- Google Cloud Run
- Vercel（前端）

-----

## 贡献

欢迎贡献！请查看我们的贡献指南了解详情。

### 代码风格
- 后端：遵循PEP 8标准
- 前端：使用严格模式的TypeScript
- 提交信息：使用约定式提交格式

### 测试
- 为新功能编写单元测试
- 提交PR前确保所有测试通过
- 包含API端点的集成测试

-----

## 路线图

- [x] v1.0 - MVP功能
  - [x] 基础代理
  - [x] Token统计
  - [x] 相似度检测
  - [x] 文案系统
- [ ] v1.1 - 多Provider支持
  - [ ] Anthropic完整支持
  - [ ] OpenRouter集成
  - [ ] Gemini支持
- [ ] v1.2 - 可视化
  - [ ] Web Dashboard
  - [ ] 实时图表
  - [ ] 历史趋势分析
- [ ] v2.0 - 智能化
  - [ ] AI驱动的模型推荐
  - [ ] 成本预测
  - [ ] 自动优化Prompt

-----

## 致谢

灵感来源于每一个在Debug循环中烧钱的开发者（包括我自己）。

特别感谢：

- [FastAPI](https://fastapi.tiangolo.com/) - 优雅的Web框架
- [OpenAI](https://openai.com/) - 让我们有钱可烧

-----

## 许可证

[MIT License](./LICENSE)

-----
```
    |\__/,|   (`\
  _.|o o  |_   ) )     "Buy us a coffee?"
 -(((---(((--------
 ```