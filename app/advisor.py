from .config import settings
from .models import SessionLocal, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Optional
import random

# Predefined messages based on levels (from MESSAGES.md)
LEVEL_1_MESSAGES = [
    "不错哦，这钱花得有章法 ☕",
    "精打细算，这才是专业开发者应有的样子",
    "效率在线！这{coffee}杯咖啡花得值",
    "看得出来，你对{model}的理解很到位",
    "这个Prompt写得漂亮，一次就命中了",
    "省钱小能手认证 ✅"
]

LEVEL_2_MESSAGES = [
    "又是这个错误？要不换个思路试试？已经烧了{jianbing}个煎饼果子了 🥞",
    "检测到{repeat_count}次重复请求，相似度{similarity}%。考虑看看官方文档？",
    "这个方向可能不太对，已经花了¥{cost_cny}了",
    "友情提示：同一个问题问{repeat_count}遍，AI也会懵的 😅",
    "建议：先理清思路再发请求。当前消耗：{coffee}杯咖啡",
    "老板，这样下去午饭钱要没了哦（已花{jianbing}个煎饼）",
    "看起来遇到瓶颈了？换个模型试试？比如从{model}切到更便宜的"
]

LEVEL_3_MESSAGES = [
    "老板，你这是在用GPT-4炖土豆！这15分钟的循环够买一周早餐了 💸",
    "⚠️ 已连续{repeat_count}次相似请求，累计¥{cost_usd}（={hotpot}顿火锅）",
    "停停停！这个bug已经吞了{meal}顿饭钱，该换个策略了",
    "建议暂停。当前效率评级：D-，性价比堪忧",
    "这{time_spent}分钟花掉${cost_usd}，建议：放下手机，去散个步",
    "检测到情绪化编程倾向，深呼吸三次再继续？",
    "你的钱包在哭泣：已烧掉{coffee}杯咖啡，成果=0"
]

LEVEL_4_MESSAGES = [
    "🛑 检测到情绪化编程，强制冷静期20分钟",
    "🛑 当前消耗：¥{cost_cny}（约等于{hotpot}顿海底捞），已触发保护机制",
    "🛑 你刚刚烧掉了{meal}顿饭钱，休息一下吧",
    "🛑 这一小时花了${cost_usd}，效率却是负数。该睡觉了老板"
]



def should_trigger_cooldown(project_id: str) -> bool:
    """
    Check if the project should be rate limited based on recent spending
    """
    db = SessionLocal()
    try:
        # Get requests from the last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_requests = db.query(Request).filter(
            Request.project_id == project_id,
            Request.timestamp > one_hour_ago
        ).all()
        
        # Calculate total cost in the last hour
        total_cost = sum(req.total_cost_usd for req in recent_requests)
        
        # Check if it exceeds the threshold
        return total_cost > settings.advisor.max_cost_per_hour_usd
    finally:
        db.close()

def generate_message(level: int, cost_usd: float, similarity: float = 0.0, model: str = "gpt-4o", 
                    repeat_count: int = 1, time_spent: int = 1) -> str:
    """
    Generate appropriate advice message based on level and cost
    """
    if level == 0:
        return ""
    
    # Calculate cost in CNY
    cost_cny = cost_usd * settings.pricing.exchange_rate_usd_to_cny
    
    # Calculate equivalents using the shared function from routes
    from .routes import calculate_equivalents as routes_calculate_equivalents
    equivalents = routes_calculate_equivalents(cost_cny)
    
    # Select message based on level
    if level == 1:
        message = random.choice(LEVEL_1_MESSAGES)
    elif level == 2:
        message = random.choice(LEVEL_2_MESSAGES)
    elif level == 3:
        message = random.choice(LEVEL_3_MESSAGES)
    elif level >= 4:
        message = random.choice(LEVEL_4_MESSAGES)
    else:
        return ""
    
    # Format the message with actual values
    try:
        formatted_message = message.format(
            cost_usd=round(cost_usd, 2),
            cost_cny=round(cost_cny, 2),
            coffee=equivalents["coffee_cups"],
            jianbing=equivalents["jianbing_sets"],
            meal=equivalents["meal_equivalent"],
            hotpot=equivalents.get("hotpot", 0),  # Using .get() to safely handle missing key
            model=model,
            repeat_count=repeat_count,
            similarity=round(similarity * 100, 1),  # Convert to percentage
            time_spent=time_spent
        )
    except KeyError:
        # If formatting fails, return a basic message
        formatted_message = f"当前消耗：${cost_usd:.2f} (¥{cost_cny:.2f})"
    
    return formatted_message

def get_advisor_level(cost_usd: float, similarity: float, pattern_score: int) -> int:
    """
    Determine advisor level based on cost, similarity, and pattern score
    """
    level = 0
    
    # Check for high cost trigger (per hour basis would be checked separately)
    if cost_usd > 5.0:
        level = max(level, 4)
    elif cost_usd > 2.0:
        level = max(level, 3)
    elif cost_usd > 1.0:
        level = max(level, 2)
    elif cost_usd > 0.5:
        level = max(level, 1)
    
    # Check for high similarity and pattern score
    if similarity > settings.analyzer.similarity_threshold_critical and pattern_score >= 5:
        level = max(level, 3)
    elif similarity > settings.analyzer.similarity_threshold_warning and pattern_score >= 3:
        level = max(level, 2)
    
    return level