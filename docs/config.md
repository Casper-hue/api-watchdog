# API 代理监测器 - 配置文件

# 本文件包含所有可配置项，请根据实际需求修改

# ============================================

# 服务器配置

# ============================================

server:
host: “0.0.0.0”           # 监听地址，0.0.0.0表示所有网卡
port: 8000                # 监听端口
debug: false              # 开发模式（会输出详细日志）
workers: 4                # uvicorn工作进程数

# ============================================

# 上游LLM服务配置

# ============================================

upstream:

# OpenAI官方API

openai:
base_url: “https://api.openai.com”
timeout: 120            # 请求超时（秒）

# Anthropic官方API

anthropic:
base_url: “https://api.anthropic.com”
timeout: 120

# OpenRouter聚合服务

openrouter:
base_url: “https://openrouter.ai/api”
timeout: 120

# 自定义Provider（可扩展）

custom:
base_url: “”            # 留空则不启用
timeout: 60

# ============================================

# 定价和货币配置

# ============================================

pricing:

# 汇率（手动维护或从API获取）

exchange_rate_usd_to_cny: 7.3

# 等价物单价（人民币）

equivalents:
coffee: 15              # 一杯咖啡
jianbing: 8             # 一套煎饼果子
meal: 50                # 一顿正餐
hotpot: 120             # 一顿火锅

# 模型定价（美元/1K tokens）

# 格式：模型名 -> {input: 输入单价, output: 输出单价}

models:
# OpenAI
gpt-4o:
input: 0.0025
output: 0.010
gpt-4o-mini:
input: 0.00015
output: 0.0006
o1-preview:
input: 0.015
output: 0.06
o1-mini:
input: 0.003
output: 0.012

```
# Anthropic
claude-opus-4-20250514:
  input: 0.015
  output: 0.075
claude-sonnet-4-20250514:
  input: 0.003
  output: 0.015
claude-sonnet-3-5-20241022:
  input: 0.003
  output: 0.015
claude-haiku-3-5-20241022:
  input: 0.0008
  output: 0.004
  
# DeepSeek
deepseek-chat:
  input: 0.00014
  output: 0.00028
deepseek-coder:
  input: 0.00014
  output: 0.00028
```

# ============================================

# 行为分析配置

# ============================================

analyzer:

# 相似度检测

similarity:
algorithm: “cosine”              # 算法：cosine（余弦）/ jaccard（杰卡德）
threshold_warning: 0.75          # 警告阈值
threshold_critical: 0.85         # 严重阈值
window_size: 5                   # 对比最近N条请求

# 模式识别关键词（支持中英文）

pattern_keywords:
debug:                           # Debug模式（权重+2）
- “error”
- “bug”
- “fix”
- “修复”
- “报错”
- “异常”
- “问题”

```
repeat:                          # 重复模式（权重+3）
  - "same"
  - "still"
  - "again"
  - "一样"
  - "还是"
  - "又"
  - "依然"

optimize:                        # 优化模式（权重+1）
  - "refactor"
  - "optimize"
  - "improve"
  - "重构"
  - "优化"

new:                             # 新功能（权重0，降低警告）
  - "implement"
  - "create"
  - "add"
  - "new"
  - "实现"
  - "创建"
  - "添加"
  - "新增"
```

# ============================================

# 智能顾问配置

# ============================================

advisor:

# 功能开关

enable: true                       # 总开关
enable_rate_limit: true            # 是否启用强制限流
enable_webhook: false              # 是否发送Webhook通知

# 限流策略

rate_limit:
max_cost_per_hour_usd: 5.0       # 单项目每小时最大消耗（美元）
cooldown_minutes: 20             # 冷静期时长（分钟）
whitelist_projects: []           # 白名单项目ID（不触发限流）

# 文案等级阈值

message_levels:
level_1:                         # 精明投资
min_cost_usd: 0
max_cost_usd: 0.5
conditions:
- “new_feature”              # 必须是新功能开发

```
level_2:                         # 温馨提示
  similarity_min: 0.75
  pattern_score_min: 3
  repeat_count: 2

level_3:                         # 严重警告
  similarity_min: 0.85
  pattern_score_min: 5
  repeat_count: 3
  cost_threshold_usd: 2.0

level_4:                         # 强制冷静
  cost_per_hour_usd: 5.0
```

# Webhook通知配置

webhook:
url: “”                          # 接收通知的URL（如：https://example.com/api/notify）
method: “POST”                   # 请求方法
headers:                         # 自定义请求头
Content-Type: “application/json”
timeout: 10                      # 超时时间（秒）

```
# 发送的数据格式（JSON）
payload_template: |
  {
    "project_id": "{project_id}",
    "level": {level},
    "message": "{message}",
    "cost_usd": {cost_usd},
    "cost_cny": {cost_cny},
    "timestamp": "{timestamp}"
  }
```

# ============================================

# 数据存储配置

# ============================================

storage:

# 数据库类型：sqlite / postgresql

type: “sqlite”

# SQLite配置

sqlite:
path: “data/watchdog.db”

# PostgreSQL配置（生产环境推荐）

postgresql:
host: “localhost”
port: 5432
database: “watchdog”
username: “postgres”
password: “password”
pool_size: 10

# Redis配置（可选，用于缓存）

redis:
enable: false
host: “localhost”
port: 6379
db: 0
password: “”
ttl_seconds: 3600                # 缓存过期时间

# ============================================

# 日志配置

# ============================================

logging:
level: “INFO”                      # DEBUG / INFO / WARNING / ERROR
format: “%(asctime)s - %(name)s - %(levelname)s - %(message)s”

# 文件日志

file:
enable: true
path: “logs/watchdog.log”
max_bytes: 10485760              # 10MB
backup_count: 5                  # 保留5个备份

# 控制台日志

console:
enable: true
colorize: true

# ============================================

# 安全配置

# ============================================

security:

# API Key验证（可选）

require_api_key: false
api_keys:                          # 允许的API Key列表
- “sk-watchdog-dev-key-12345”

# CORS配置

cors:
enable: true
allowed_origins:
- “http://localhost:3000”
- “https://yourdomain.com”
allowed_methods:
- “GET”
- “POST”
allowed_headers:
- “*”

# 隐私保护

privacy:
store_request_content: false     # 是否存储完整请求内容（不建议）
anonymize_project_id: false      # 是否对项目ID做哈希处理

# ============================================

# 高级功能

# ============================================

advanced:

# 自动定价更新（从官方API获取最新价格）

auto_update_pricing:
enable: false
interval_hours: 24
source: “https://api.example.com/pricing”

# 统计数据导出

export:
enable: true
formats: [“json”, “csv”]
schedule: “0 0 * * *”            # Cron表达式：每天凌晨

# 性能监控

metrics:
enable: false
prometheus_port: 9090