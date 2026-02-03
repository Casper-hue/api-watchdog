"""
创建临时API测试数据
生成真实的数据库记录用于测试前端界面
"""

from app.models import SessionLocal, Request, init_db
from datetime import datetime, timedelta
import uuid
import random

def create_test_data():
    """创建测试数据"""
    print("=== 开始创建测试数据 ===")
    
    # 初始化数据库
    init_db()
    db = SessionLocal()
    
    # 定义测试项目
    projects = ["test-project", "demo-app", "api-monitor", "ai-assistant", "chatbot-service"]
    models = ["gpt-4o", "gpt-4o-mini", "claude-opus", "claude-sonnet", "gpt-3.5-turbo"]
    providers = ["openai", "anthropic", "openrouter"]
    
    # 模型定价（美元/千token）
    model_pricing = {
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "claude-opus": {"input": 0.015, "output": 0.075},
        "claude-sonnet": {"input": 0.003, "output": 0.015},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015}
    }
    
    # 生成过去7天的数据
    base_date = datetime.utcnow()
    total_requests = 0
    
    for day in range(7, -1, -1):
        date = base_date - timedelta(days=day)
        
        # 每天生成不同数量的请求
        daily_requests = random.randint(5, 20)
        
        for i in range(daily_requests):
            # 随机选择项目、模型和提供商
            project_id = random.choice(projects)
            model = random.choice(models)
            provider = random.choice(providers)
            
            # 生成随机token数量
            prompt_tokens = random.randint(100, 2000)
            completion_tokens = random.randint(50, 1500)
            
            # 计算成本
            if model in model_pricing:
                pricing = model_pricing[model]
                cost = (prompt_tokens * pricing["input"] / 1000) + (completion_tokens * pricing["output"] / 1000)
            else:
                cost = random.uniform(0.001, 0.1)
            
            # 生成时间戳（在当天内随机分布）
            hour_offset = random.randint(0, 23)
            minute_offset = random.randint(0, 59)
            timestamp = date.replace(hour=hour_offset, minute=minute_offset, second=0, microsecond=0)
            
            # 生成相似度分数和行为分析分数
            similarity_score = random.uniform(0.1, 0.9)
            pattern_score = random.randint(0, 5)
            advisor_level = 0
            
            # 根据相似度设置advisor级别
            if similarity_score > 0.8:
                advisor_level = 3
            elif similarity_score > 0.6:
                advisor_level = 2
            elif similarity_score > 0.4:
                advisor_level = 1
            
            # 创建请求记录
            request = Request(
                id=str(uuid.uuid4()),
                timestamp=timestamp,
                project_id=project_id,
                provider=provider,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_cost_usd=round(cost, 6),
                similarity_score=round(similarity_score, 2),
                pattern_score=pattern_score,
                advisor_level=advisor_level,
                prompt_text=f"测试请求 {i} - 项目 {project_id}",
                progress_indicator=random.choice(["stuck", "exploring", "refining", "resolved"]),
                token_efficiency=round(completion_tokens / prompt_tokens, 2) if prompt_tokens > 0 else 0
            )
            
            db.add(request)
            total_requests += 1
    
    # 提交到数据库
    db.commit()
    db.close()
    
    print(f"✅ 成功创建 {total_requests} 条测试记录")
    print("=== 测试数据统计 ===")
    
    # 验证数据
    db = SessionLocal()
    
    # 统计总记录数
    total_count = db.query(Request).count()
    print(f"总记录数: {total_count}")
    
    # 统计项目分布
    projects_count = db.query(Request.project_id).distinct().count()
    print(f"项目数量: {projects_count}")
    
    # 统计模型分布
    models_count = db.query(Request.model).distinct().count()
    print(f"模型数量: {models_count}")
    
    # 统计总成本
    total_cost = db.query(Request.total_cost_usd).all()
    total_cost_sum = sum([cost[0] for cost in total_cost])
    print(f"总成本: ${total_cost_sum:.4f}")
    
    # 显示最近5条记录
    recent_requests = db.query(Request).order_by(Request.timestamp.desc()).limit(5).all()
    print("\\n=== 最近5条记录 ===")
    for req in recent_requests:
        print(f"ID: {req.id[:8]}... | 项目: {req.project_id} | 模型: {req.model} | 成本: ${req.total_cost_usd:.4f} | 时间: {req.timestamp}")
    
    db.close()
    
    print("\\n=== 测试数据生成完成 ===")
    print("✅ 现在可以访问前端界面查看数据效果")
    print("📊 数据将显示在仪表板、统计页面和项目页面")

if __name__ == "__main__":
    create_test_data()