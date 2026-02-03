# 部署指南

本文档提供从开发到生产环境的完整部署方案。

-----

## 快速开始（开发环境）

### 前置要求

- Python 3.11+
- pip
- Git

### 步骤1：克隆项目

```bash
git clone <your-repo-url>
cd api-watchdog
```

### 步骤2：创建虚拟环境

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

### 步骤3：安装依赖

```bash
pip install -r requirements.txt
```

### 步骤4：配置

```bash
cp config.yaml.example config.yaml
# 编辑config.yaml，至少修改：
# - upstream.openai.base_url（如使用其他endpoint）
# - pricing.models（确认价格准确）
```

### 步骤5：初始化数据库

```bash
python -c "from app.models import init_db; init_db()"
```

### 步骤6：启动服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

服务将运行在 `http://localhost:8000`

### 步骤7：测试

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-test" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

-----

## Docker部署（推荐）

### 方案A：使用docker-compose（最简单）

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  watchdog:
    build: .
    container_name: api-watchdog
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data          # 持久化数据库
      - ./logs:/app/logs          # 持久化日志
      - ./config.yaml:/app/config.yaml:ro  # 只读配置
    environment:
      - PYTHONUNBUFFERED=1
      - LOG_LEVEL=INFO
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 可选：添加Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: watchdog-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - watchdog
    restart: unless-stopped
```

**Dockerfile**:

```dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app/ ./app/
COPY config.yaml .

# 创建必要的目录
RUN mkdir -p /app/data /app/logs

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**启动服务**:

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f watchdog

# 停止服务
docker-compose down
```

-----

### 方案B：纯Docker（适合简单场景）

**构建镜像**:

```bash
docker build -t api-watchdog:latest .
```

**运行容器**:

```bash
docker run -d \
  --name api-watchdog \
  -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  --restart unless-stopped \
  api-watchdog:latest
```

-----

## 生产环境部署

### 架构方案

```
Internet
    ↓
[Cloudflare/CDN]
    ↓
[Nginx (SSL Termination)]
    ↓
[API Watchdog (多实例)]
    ↓
[PostgreSQL] + [Redis]
```

-----

### 步骤1：准备生产配置

**config.production.yaml**:

```yaml
server:
  host: "0.0.0.0"
  port: 8000
  debug: false              # 关闭调试模式
  workers: 4                # 根据CPU核心数调整

storage:
  type: "postgresql"
  postgresql:
    host: "db.internal"
    port: 5432
    database: "watchdog_prod"
    username: "watchdog_user"
    password: "${DB_PASSWORD}"  # 从环境变量读取
    pool_size: 20
  
  redis:
    enable: true
    host: "redis.internal"
    port: 6379
    password: "${REDIS_PASSWORD}"
    db: 0

logging:
  level: "WARNING"          # 生产环境减少日志量
  file:
    enable: true
    path: "/app/logs/watchdog.log"

security:
  require_api_key: true
  api_keys:
    - "${API_KEY_1}"
    - "${API_KEY_2}"
  
  cors:
    enable: true
    allowed_origins:
      - "https://yourdomain.com"
```

-----

### 步骤2：数据库设置

**PostgreSQL初始化**:

```sql
-- 创建数据库
CREATE DATABASE watchdog_prod;

-- 创建用户
CREATE USER watchdog_user WITH PASSWORD 'your-strong-password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE watchdog_prod TO watchdog_user;

-- 连接数据库
\c watchdog_prod

-- 授予schema权限
GRANT ALL ON SCHEMA public TO watchdog_user;
```

**使用SQLAlchemy迁移**:

```bash
# 在容器内执行
python -c "from app.models import init_db; init_db()"
```

-----

### 步骤3：Nginx配置

**nginx.conf**:

```nginx
upstream watchdog_backend {
    least_conn;
    server watchdog:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api-watchdog.yourdomain.com;
    
    # 强制HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api-watchdog.yourdomain.com;
    
    # SSL证书
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 日志
    access_log /var/log/nginx/watchdog_access.log;
    error_log /var/log/nginx/watchdog_error.log;
    
    # 请求体大小限制
    client_max_body_size 10M;
    
    # 超时设置
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    
    location / {
        proxy_pass http://watchdog_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE支持
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://watchdog_backend;
        access_log off;
    }
}
```

-----

### 步骤4：使用环境变量

**创建.env文件**:

```bash
# .env
DB_PASSWORD=your-db-password-here
REDIS_PASSWORD=your-redis-password-here
API_KEY_1=sk-watchdog-prod-key-1
API_KEY_2=sk-watchdog-prod-key-2
```

**docker-compose.production.yml**:

```yaml
version: '3.8'

services:
  watchdog:
    build: .
    container_name: watchdog-prod
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config.production.yaml:/app/config.yaml:ro
    environment:
      - PYTHONUNBUFFERED=1
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - API_KEY_1=${API_KEY_1}
      - API_KEY_2=${API_KEY_2}
    env_file:
      - .env
    restart: always
    depends_on:
      - postgres
      - redis
    networks:
      - watchdog-net

  postgres:
    image: postgres:16-alpine
    container_name: watchdog-db
    environment:
      POSTGRES_DB: watchdog_prod
      POSTGRES_USER: watchdog_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always
    networks:
      - watchdog-net

  redis:
    image: redis:7-alpine
    container_name: watchdog-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - watchdog-net

  nginx:
    image: nginx:alpine
    container_name: watchdog-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - watchdog
    restart: always
    networks:
      - watchdog-net

volumes:
  postgres-data:
  redis-data:
  nginx-logs:

networks:
  watchdog-net:
    driver: bridge
```

**启动生产环境**:

```bash
docker-compose -f docker-compose.production.yml up -d
```

-----

## 云平台部署

### AWS部署（使用ECS）

**架构**:

```
Route 53 → CloudFront → ALB → ECS Fargate → RDS + ElastiCache
```

**步骤概要**:

1. 创建ECR仓库推送镜像
1. 配置ECS Task Definition
1. 创建RDS PostgreSQL实例
1. 创建ElastiCache Redis集群
1. 配置ALB和目标组
1. 设置Auto Scaling

**Terraform示例**:

```hcl
resource "aws_ecs_task_definition" "watchdog" {
  family                   = "api-watchdog"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  
  container_definitions = jsonencode([{
    name  = "watchdog"
    image = "${aws_ecr_repository.watchdog.repository_url}:latest"
    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "DB_HOST"
        value = aws_db_instance.watchdog.endpoint
      }
    ]
    secrets = [
      {
        name      = "DB_PASSWORD"
        valueFrom = aws_secretsmanager_secret.db_password.arn
      }
    ]
  }])
}
```

-----

### Google Cloud部署（使用Cloud Run）

**步骤**:

1. 构建并推送到Artifact Registry

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/watchdog
```

1. 部署到Cloud Run

```bash
gcloud run deploy watchdog \
  --image gcr.io/PROJECT_ID/watchdog \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DB_HOST=10.0.0.3" \
  --set-secrets "DB_PASSWORD=db-password:latest"
```

1. 配置Cloud SQL连接

```bash
gcloud run services update watchdog \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME
```

-----

## 监控和维护

### 日志管理

**查看实时日志**:

```bash
# Docker
docker-compose logs -f --tail=100 watchdog

# Kubernetes
kubectl logs -f deployment/watchdog -n production
```

**日志轮转配置**（logrotate）:

```bash
# /etc/logrotate.d/watchdog
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

-----

### 性能监控

**Prometheus配置**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'watchdog'
    static_configs:
      - targets: ['watchdog:9090']
```

**暴露Metrics**（在app/main.py中添加）:

```python
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('request_latency_seconds', 'Request latency')

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

-----

### 数据库备份

**自动备份脚本**:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="watchdog_prod"

# 备份PostgreSQL
docker exec watchdog-db pg_dump -U watchdog_user $DB_NAME | \
  gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 保留最近7天的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

**Crontab配置**:

```bash
# 每天凌晨3点备份
0 3 * * * /path/to/backup.sh >> /var/log/watchdog_backup.log 2>&1
```

-----

### 健康检查

**脚本监控**:

```bash
#!/bin/bash
# healthcheck.sh

ENDPOINT="http://localhost:8000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $RESPONSE -eq 200 ]; then
  echo "Service is healthy"
  exit 0
else
  echo "Service is down (HTTP $RESPONSE)"
  # 发送告警
  curl -X POST https://hooks.slack.com/your-webhook \
    -d '{"text":"API Watchdog is down!"}'
  exit 1
fi
```

-----

## 扩展和优化

### 水平扩展

**负载均衡器配置**:

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  watchdog:
    build: .
    deploy:
      replicas: 3  # 启动3个实例
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

**启动多实例**:

```bash
docker-compose -f docker-compose.scale.yml up -d --scale watchdog=3
```

-----

### 缓存优化

**Redis缓存层**:

```python
# app/cache.py
import redis
from functools import wraps

redis_client = redis.Redis(host='redis', port=6379)

def cache_recent_requests(ttl=3600):
    def decorator(func):
        @wraps(func)
        async def wrapper(project_id, *args, **kwargs):
            cache_key = f"recent:{project_id}"
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            result = await func(project_id, *args, **kwargs)
            redis_client.setex(cache_key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator
```

-----

## 故障排查

### 常见问题

**问题1：服务无法启动**

```bash
# 检查端口占用
lsof -i :8000

# 检查配置文件
python -c "import yaml; yaml.safe_load(open('config.yaml'))"

# 查看详细错误
docker-compose logs watchdog
```

**问题2：数据库连接失败**

```bash
# 测试连接
docker exec watchdog-db psql -U watchdog_user -d watchdog_prod -c "SELECT 1"

# 检查网络
docker network inspect watchdog-net
```

**问题3：内存占用过高**

```bash
# 查看资源使用
docker stats watchdog

# 调整workers数量（config.yaml）
server:
  workers: 2  # 减少worker数
```

-----

## 安全加固

### SSL证书（使用Let’s Encrypt）

```bash
# 安装certbot
apt-get install certbot

# 获取证书
certbot certonly --standalone -d api-watchdog.yourdomain.com

# 自动续期
echo "0 0 1 * * certbot renew --quiet" | crontab -
```

### 防火墙配置

```bash
# UFW规则
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 限流保护

**Nginx限流**:

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    
    server {
        location / {
            limit_req zone=api_limit burst=20 nodelay;
        }
    }
}
```

-----

## 成本优化建议

1. **使用Spot实例**（AWS/GCP）：节省70%成本
1. **自动扩缩容**：非高峰期缩减实例
1. **数据压缩**：启用Gzip减少带宽
1. **CDN缓存**：静态资源使用CDN
1. **数据库优化**：定期清理过期数据

-----

## 检查清单

部署前确认：

- [ ] 配置文件已更新（生产环境配置）
- [ ] 环境变量已设置（数据库密码等）
- [ ] SSL证书已配置
- [ ] 数据库已初始化
- [ ] 日志目录已创建
- [ ] 备份脚本已配置
- [ ] 监控告警已设置
- [ ] 健康检查正常工作
- [ ] 防火墙规则已配置
- [ ] 域名DNS已解析

部署后验证：

- [ ] 健康检查接口返回200
- [ ] 可以正常代理请求
- [ ] 文案系统正常触发
- [ ] 统计接口返回数据
- [ ] 日志正常写入
- [ ] 数据库连接正常
- [ ] Redis缓存正常（如启用）
- [ ] SSL证书有效

-----

祝部署顺利！如遇问题请查看日志或提交Issue。