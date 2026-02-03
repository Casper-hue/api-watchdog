"""
创建真实用户模拟数据
100%模拟真实用户使用情况，完全按照系统实际收集的数据类型
"""

from app.models import SessionLocal, Request, init_db
from datetime import datetime, timedelta
import uuid
import random

def create_realistic_test_data():
    """创建真实用户模拟数据"""
    print("=== 开始创建真实用户模拟数据 ===")
    
    # 初始化数据库
    init_db()
    db = SessionLocal()
    
    # 真实用户项目配置
    projects = [
        "webapp-production",    # 生产环境Web应用
        "mobile-app-beta",      # 移动应用测试版
        "internal-tools",       # 内部工具
        "data-analysis",        # 数据分析项目
        "customer-support"      # 客户支持系统
    ]
    
    # 真实模型使用分布（基于实际API定价）
    models_pricing = {
        "gpt-4o": {"input": 0.0025, "output": 0.01, "usage_weight": 0.15},      # 高质量任务
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006, "usage_weight": 0.35}, # 日常任务
        "claude-3-opus": {"input": 0.015, "output": 0.075, "usage_weight": 0.05},  # 复杂分析
        "claude-3-sonnet": {"input": 0.003, "output": 0.015, "usage_weight": 0.25}, # 中等任务
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015, "usage_weight": 0.20}  # 简单任务
    }
    
    # 项目使用模式配置
    project_patterns = {
        "webapp-production": {
            "models": ["gpt-4o", "gpt-4o-mini", "claude-3-sonnet"],
            "daily_requests": (50, 150),  # 生产环境请求量较大
            "prompt_length": (500, 2000), # 较长的提示
            "token_ratio": 0.3,           # 输出/输入token比例
            "similarity_threshold": 0.7   # 中等相似度检测
        },
        "mobile-app-beta": {
            "models": ["gpt-4o-mini", "gpt-3.5-turbo"],
            "daily_requests": (20, 80),
            "prompt_length": (100, 800),
            "token_ratio": 0.5,
            "similarity_threshold": 0.8
        },
        "internal-tools": {
            "models": ["claude-3-sonnet", "gpt-4o"],
            "daily_requests": (10, 40),
            "prompt_length": (300, 1500),
            "token_ratio": 0.4,
            "similarity_threshold": 0.6
        },
        "data-analysis": {
            "models": ["claude-3-opus", "gpt-4o"],
            "daily_requests": (5, 25),
            "prompt_length": (1000, 5000),
            "token_ratio": 0.2,
            "similarity_threshold": 0.75
        },
        "customer-support": {
            "models": ["gpt-4o-mini", "gpt-3.5-turbo"],
            "daily_requests": (30, 100),
            "prompt_length": (200, 1000),
            "token_ratio": 0.6,
            "similarity_threshold": 0.85
        }
    }
    
    # 生成过去30天的数据（更真实的时间跨度）
    base_date = datetime.utcnow()
    total_requests = 0
    
    for day in range(30, -1, -1):
        date = base_date - timedelta(days=day)
        
        for project_id, pattern in project_patterns.items():
            # 每天请求量有波动（周末较少）
            weekday = date.weekday()  # 0=Monday, 6=Sunday
            weekend_factor = 0.6 if weekday >= 5 else 1.0  # 周末减少40%
            
            daily_min, daily_max = pattern["daily_requests"]
            daily_requests = int(random.randint(daily_min, daily_max) * weekend_factor)
            
            for i in range(daily_requests):
                # 随机选择模型（基于使用权重）
                model_choices = []
                model_weights = []
                for model in pattern["models"]:
                    model_choices.append(model)
                    model_weights.append(models_pricing[model]["usage_weight"])
                
                model = random.choices(model_choices, weights=model_weights)[0]
                pricing = models_pricing[model]
                
                # 生成真实的token数量
                prompt_min, prompt_max = pattern["prompt_length"]
                prompt_tokens = random.randint(prompt_min, prompt_max)
                completion_tokens = int(prompt_tokens * pattern["token_ratio"] * random.uniform(0.8, 1.2))
                
                # 计算真实成本
                cost = (prompt_tokens * pricing["input"] / 1000) + (completion_tokens * pricing["output"] / 1000)
                
                # 生成时间戳（在当天内随机分布，工作时间更集中）
                if weekday < 5:  # 工作日
                    hour = random.choices(
                        [9,10,11,12,13,14,15,16,17,18,19,20],
                        weights=[2,4,6,3,4,6,8,7,5,3,2,1]
                    )[0]
                else:  # 周末
                    hour = random.choices(
                        [10,11,12,13,14,15,16,17,18,19,20,21],
                        weights=[1,2,3,2,3,4,3,2,2,1,1,1]
                    )[0]
                
                minute = random.randint(0, 59)
                timestamp = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # 生成相似度分数（基于项目模式）
                similarity_score = random.uniform(0.1, pattern["similarity_threshold"])
                
                # 生成模式识别分数（基于使用情况）
                pattern_score = random.randint(0, 5)
                
                # 生成顾问级别（基于相似度和模式分数）
                advisor_level = 0
                if similarity_score > 0.8:
                    advisor_level = 3
                elif similarity_score > 0.6:
                    advisor_level = 2
                elif similarity_score > 0.4:
                    advisor_level = 1
                
                # 生成进度指示器
                progress_options = ["exploring", "refining", "resolved", "stuck"]
                progress_weights = [0.4, 0.3, 0.2, 0.1]  # 探索和优化更常见
                progress_indicator = random.choices(progress_options, weights=progress_weights)[0]
                
                # 计算token效率
                token_efficiency = completion_tokens / prompt_tokens if prompt_tokens > 0 else 0
                
                # 创建请求记录（100%真实数据格式）
                request = Request(
                    id=str(uuid.uuid4()),
                    timestamp=timestamp,
                    project_id=project_id,
                    provider="openai" if "gpt" in model else "anthropic",
                    model=model,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_cost_usd=round(cost, 6),
                    similarity_score=round(similarity_score, 3),
                    pattern_score=pattern_score,
                    advisor_level=advisor_level,
                    prompt_text=f"用户请求 - 项目: {project_id}, 时间: {timestamp.strftime('%Y-%m-%d %H:%M')}",
                    progress_indicator=progress_indicator,
                    token_efficiency=round(token_efficiency, 3)
                )
                
                db.add(request)
                total_requests += 1
    
    # 提交到数据库
    db.commit()
    db.close()
    
    print(f"✅ 成功创建 {total_requests} 条真实用户模拟记录")
    print("=== 数据统计 ===")
    
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
    
    # 统计时间范围
    oldest_record = db.query(Request).order_by(Request.timestamp.asc()).first()
    newest_record = db.query(Request).order_by(Request.timestamp.desc()).first()
    print(f"数据时间范围: {oldest_record.timestamp.date()} 到 {newest_record.timestamp.date()}")
    
    # 统计总成本
    total_cost = db.query(Request.total_cost_usd).all()
    total_cost_sum = sum([cost[0] for cost in total_cost])
    print(f"总成本: ${total_cost_sum:.4f}")
    
    # 显示各项目统计
    print("\\n=== 各项目统计 ===")
    for project in projects:
        project_requests = db.query(Request).filter(Request.project_id == project).count()
        project_cost = sum([req[0] for req in db.query(Request.total_cost_usd).filter(Request.project_id == project).all()])
        print(f"{project}: {project_requests} 条记录, 成本: ${project_cost:.4f}")
    
    # 显示模型使用统计
    print("\\n=== 模型使用统计 ===")
    for model in models_pricing.keys():
        model_requests = db.query(Request).filter(Request.model == model).count()
        model_cost = sum([req[0] for req in db.query(Request.total_cost_usd).filter(Request.model == model).all()])
        if model_requests > 0:
            avg_cost = model_cost / model_requests
            print(f"{model}: {model_requests} 次使用, 总成本: ${model_cost:.4f}, 平均成本: ${avg_cost:.4f}")
    
    db.close()
    
    print("\\n=== 真实用户模拟数据生成完成 ===")
    print("✅ 数据完全模拟真实用户使用情况")
    print("📊 现在可以测试系统的统计和分析功能")
    print("🔍 检查dashboard、statistics、projects页面的显示效果")

if __name__ == "__main__":
    create_realistic_test_data()