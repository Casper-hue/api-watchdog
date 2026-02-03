import difflib
import re
import time
from typing import List, Dict, Tuple, Optional
from .models import Request, SessionLocal
from sqlalchemy.orm import Session
from .config import settings
from datetime import datetime, timedelta

# 缓存系统
class EfficiencyCache:
    """效率分析缓存系统"""
    
    def __init__(self):
        self._cache = {}
        self._default_ttl = 300  # 5分钟缓存时间
    
    def _generate_key(self, project_id: str, time_range: str) -> str:
        """生成缓存键"""
        return f"efficiency:{project_id}:{time_range}"
    
    def get(self, project_id: str, time_range: str) -> Optional[Dict]:
        """获取缓存数据"""
        key = self._generate_key(project_id, time_range)
        if key in self._cache:
            cached_data, timestamp = self._cache[key]
            # 检查是否过期
            if time.time() - timestamp < self._default_ttl:
                return cached_data
            else:
                # 过期数据，删除
                del self._cache[key]
        return None
    
    def set(self, project_id: str, time_range: str, data: Dict):
        """设置缓存数据"""
        key = self._generate_key(project_id, time_range)
        self._cache[key] = (data, time.time())
    
    def invalidate(self, project_id: str = None, time_range: str = None):
        """失效缓存"""
        if project_id is None:
            # 失效所有缓存
            self._cache.clear()
        else:
            if time_range is None:
                # 失效该项目的所有缓存
                keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"efficiency:{project_id}:")]
                for key in keys_to_remove:
                    del self._cache[key]
            else:
                # 失效特定缓存
                key = self._generate_key(project_id, time_range)
                if key in self._cache:
                    del self._cache[key]
    
    def get_stats(self) -> Dict:
        """获取缓存统计信息"""
        return {
            "total_cached": len(self._cache),
            "cache_keys": list(self._cache.keys())
        }

# 全局缓存实例
efficiency_cache = EfficiencyCache()


# Emotion keywords for analysis
EMOTION_KEYWORDS = {
    "frustration": {
        "keywords": ["还是不行", "又失败了", "为什么还", "到底怎么", "试了很多次", "same error", "same problem", "still not", "doesn't work"],
        "weight": 3
    },
    "exploration": {
        "keywords": ["换个", "试试", "或者", "another", "different", "alternative", "if we try"],
        "weight": -2  # Negative weight, reduce warning
    },
    "refinement": {
        "keywords": ["better", "optimize", "simplify", "improve", "adjust", "tweak", "enhance", "优化", "改进", "调整"],
        "weight": -1
    },
    "stuck": {
        "keywords": ["same error", "一样的", "还是这个问题", "依然", "still the same", "nothing changed", "unchanged"],
        "weight": 4
    }
}

# Task patterns for task type detection
TASK_PATTERNS = {
    "coding": {
        "indicators": ["def ", "function", "class ", "import", "代码", "function", "method", "variable", "debug", "error"],
        "allow_iterations": 5,  # Coding tasks allow more iterations
    },
    "writing": {
        "indicators": ["write", "help me write", "润色", "改写", "translate", "writing", "draft"],
        "allow_iterations": 3,  # Writing tasks iteration less
    },
    "debugging": {
        "indicators": ["error", "bug", "fix", "debug", "problem", "报错", "修复", "错误"],
        "allow_iterations": 3,
        "trigger_threshold": 0.85,  # Debugging triggers warnings more easily
    },
    "research": {
        "indicators": ["search", "find", "research", "study", "investigate", "研究", "查找", "了解"],
        "allow_iterations": 10,  # Research tasks need lots of exploration
    }
}


def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculate enhanced similarity between two texts using multiple methods
    """
    if not text1 or not text2:
        return 0.0
    
    # Method 1: SequenceMatcher (character-level similarity)
    char_similarity = difflib.SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    # Method 2: Word overlap (semantic similarity)
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    
    if words1 and words2:
        word_overlap = len(words1 & words2) / len(words1 | words2)
    else:
        word_overlap = 0.0
    
    # Method 3: Keyword matching (for debugging/error scenarios)
    debug_keywords = ["error", "bug", "fix", "修复", "报错", "exception", "traceback"]
    keyword_match = 0.0
    
    if any(keyword in text1.lower() and keyword in text2.lower() for keyword in debug_keywords):
        keyword_match = 0.3  # Boost similarity for debugging scenarios
    
    # Method 4: Length similarity (similar length texts are more likely to be similar)
    len1, len2 = len(text1), len(text2)
    if max(len1, len2) > 0:
        length_similarity = 1 - abs(len1 - len2) / max(len1, len2)
    else:
        length_similarity = 0.0
    
    # Combined similarity with weighted average
    combined_similarity = (
        char_similarity * 0.3 + 
        word_overlap * 0.4 + 
        keyword_match * 0.2 + 
        length_similarity * 0.1
    )
    
    # Boost similarity for highly repetitive patterns
    if "same" in text1.lower() and "same" in text2.lower():
        combined_similarity = min(1.0, combined_similarity + 0.2)
    
    if "still" in text1.lower() and "still" in text2.lower():
        combined_similarity = min(1.0, combined_similarity + 0.15)
    
    return float(combined_similarity)


def calculate_topic_drift(messages: List[str]) -> float:
    """
    Calculate topic drift between messages
    Returns: 0-1, higher means more topic changes
    """
    if len(messages) < 2:
        return 0.0
    
    similarities = []
    for i in range(1, len(messages)):
        similarity = calculate_similarity(messages[i-1], messages[i])
        similarities.append(similarity)
    
    # Topic drift is the inverse of average similarity
    avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0
    topic_drift = 1 - avg_similarity
    
    return min(topic_drift, 1.0)  # Cap at 1.0


def detect_emotion(text: str) -> int:
    """
    Detect emotion in text and return a score
    """
    score = 0
    text_lower = text.lower()
    
    for category, config in EMOTION_KEYWORDS.items():
        for keyword in config["keywords"]:
            if keyword.lower() in text_lower:
                score += config["weight"]
    return score


def detect_task_type(messages: List[Dict[str, str]]) -> str:
    """
    Detect task type based on messages content
    """
    text = " ".join([m["content"] for m in messages if "content" in m])
    text_lower = text.lower()
    
    scores = {}
    for task_type, config in TASK_PATTERNS.items():
        score = sum(1 for indicator in config["indicators"] if indicator.lower() in text_lower)
        scores[task_type] = score
    
    # Return the task type with highest score, default to 'coding'
    detected_task = max(scores, key=scores.get) if scores else 'coding'
    
    # If no indicators match, default to 'exploration'
    if scores.get(detected_task, 0) == 0:
        detected_task = 'exploration'
    
    return detected_task


def assess_progress(current_request: Request, previous_requests: List[Request]) -> str:
    """
    Assess if there's progress in the conversation
    """
    if not previous_requests:
        return "exploring"
    
    # Check 1: Token efficiency (output/input ratio)
    if hasattr(current_request, 'prompt_tokens') and current_request.prompt_tokens > 0:
        current_efficiency = current_request.completion_tokens / current_request.prompt_tokens if current_request.completion_tokens else 0
        efficiencies = [
            (r.completion_tokens / r.prompt_tokens) if r.prompt_tokens > 0 else 0 
            for r in previous_requests
        ]
        avg_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 0
        
        if avg_efficiency > 0 and current_efficiency < avg_efficiency * 0.5:
            return "stuck"  # Reply getting significantly shorter
    
    # Check 2: Time interval between requests
    if hasattr(current_request, 'timestamp') and previous_requests:
        time_gap = (current_request.timestamp - previous_requests[0].timestamp).total_seconds()
        if time_gap < 30:  # 30 seconds
            return "stuck"
        elif time_gap > 300:  # 5 minutes
            return "refining"
    
    return "exploring"


def count_similar_requests(recent_requests: List[Request], similarity_threshold: float = 0.75) -> int:
    """
    Count consecutive similar requests
    """
    if len(recent_requests) < 2:
        return 0
    
    similar_count = 0
    for i in range(1, len(recent_requests)):
        # Compare current with previous
        current_content = getattr(recent_requests[i], 'prompt_text', '')
        prev_content = getattr(recent_requests[i-1], 'prompt_text', '')
        
        if current_content and prev_content:
            similarity = calculate_similarity(current_content, prev_content)
            if similarity >= similarity_threshold:
                similar_count += 1
            else:
                break  # Stop counting when dissimilar
        else:
            break
    
    return similar_count


def get_recent_requests(project_id: str, limit: int = 5) -> List[Request]:
    """
    Get recent requests for a project with enhanced isolation
    """
    db = SessionLocal()
    try:
        # Enhanced project isolation: only consider requests from the same project
        recent_requests = db.query(Request).filter(
            Request.project_id == project_id
        ).order_by(Request.timestamp.desc()).limit(limit).all()
        
        # Log isolation info for debugging
        if recent_requests:
            print(f"[Project Isolation] Found {len(recent_requests)} recent requests for project: {project_id}")
            
            # Verify all requests belong to the same project
            project_ids = set(req.project_id for req in recent_requests)
            if len(project_ids) > 1:
                print(f"[WARNING] Multiple project IDs detected: {project_ids}")
            else:
                print(f"[Project Isolation] All requests belong to project: {list(project_ids)[0]}")
        
        return recent_requests
    finally:
        db.close()


def analyze_behavior(project_id: str, messages: List[Dict[str, str]], model: str = "gpt-4o") -> Dict:
    """
    Multi-dimensional analysis of behavior
    Returns comprehensive analysis results
    """
    # Get recent requests for this project
    recent_requests = get_recent_requests(project_id, limit=5)
    
    # Extract the last user message from current request
    current_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            current_user_msg = msg.get("content", "")
            break
    
    # Get recent messages for topic drift analysis
    recent_messages = [getattr(req, 'prompt_text', '') for req in recent_requests if hasattr(req, 'prompt_text')]
    recent_messages.append(current_user_msg)
    
    # === Dimension 1: Enhanced similarity analysis ===
    max_similarity = 0.0
    similar_requests_count = 0
    
    if recent_requests:
        for req in recent_requests:
            if hasattr(req, 'prompt_text') and req.prompt_text:
                similarity = calculate_similarity(current_user_msg, req.prompt_text)
                max_similarity = max(max_similarity, similarity)
                
                # Count requests with moderate similarity (lower threshold for better sensitivity)
                if similarity > 0.6:  # Lower threshold for counting
                    similar_requests_count += 1
    
    # === Dimension 2: Topic drift ===
    topic_drift = calculate_topic_drift(recent_messages)
    
    # === Dimension 3: Enhanced emotion score ===
    emotion_score = detect_emotion(current_user_msg)
    
    # === Dimension 4: Progress status ===
    progress = assess_progress(
        type('', (), {'prompt_tokens': 100, 'completion_tokens': 200, 'timestamp': datetime.now()})(), 
        recent_requests
    )  # Mock object for current request assessment
    
    # === Dimension 5: Task type ===
    task_type = detect_task_type(messages)
    task_config = TASK_PATTERNS.get(task_type, TASK_PATTERNS['coding'])
    
    # === Dimension 6: Model profile with adjusted thresholds ===
    model_config = settings.analyzer.model_profiles.get(model, 
        settings.analyzer.model_profiles.get("gpt-4o", 
            {"similarity_threshold": 0.65, "max_retries": 3}))  # Lower threshold for better sensitivity
    model_threshold = model_config["similarity_threshold"]
    
    # === Enhanced similarity counting with progressive thresholds ===
    repeat_count = count_similar_requests(recent_requests, similarity_threshold=0.6)  # Lower threshold
    
    # Use model-specific retry limits if available, otherwise fall back to task-specific limits
    max_allowed_repeats = model_config.get("max_retries", task_config["allow_iterations"])
    
    # === Enhanced comprehensive scoring ===
    score = 0
    reasons = []
    
    # Enhanced similarity check (higher weight for better sensitivity)
    if max_similarity > model_threshold:
        score += 30  # Increased weight
        reasons.append(f"High similarity({max_similarity:.0%})")
    
    # Progressive similarity scoring based on count
    if similar_requests_count >= 2:
        score += 15 * (similar_requests_count - 1)
        reasons.append(f"Multiple similar requests ({similar_requests_count})")
    
    # Topic drift check (more sensitive)
    if topic_drift < 0.3:  # More sensitive threshold
        score += 20  # Increased weight
        reasons.append("Low topic drift")
    else:
        score -= 15  # Stronger reduction for exploration
    
    # Enhanced emotion analysis
    if emotion_score > 3:  # Lower threshold
        score += 30  # Increased weight
        reasons.append("Detected frustration")
    elif emotion_score < 0:  # Exploration keywords
        score -= 15
    
    # Progress check (more sensitive)
    if progress == "stuck":
        score += 35  # Increased weight
        reasons.append("No progress detected")
    elif progress == "exploring":
        score -= 20  # Stronger reduction
    
    # Enhanced iteration count check
    if repeat_count > max_allowed_repeats:
        score += 25 * (repeat_count - max_allowed_repeats)  # Increased weight
        reasons.append(f"Exceeded {model} model iteration limit ({max_allowed_repeats})")
    
    # Additional penalty for debugging scenarios
    if any(keyword in current_user_msg.lower() for keyword in ["error", "bug", "fix", "修复", "报错"]):
        if repeat_count >= 2:
            score += 20  # Extra penalty for repeated debugging
            reasons.append("Repeated debugging attempts")
    
    # === Final determination ===
    confidence = min(score / 100, 1.0)  # Normalize to 0-1
    
    if score >= 70:
        level = 3  # Severe warning
    elif score >= 40:
        level = 2  # Gentle reminder
    elif score >= 20:
        level = 1  # Mild notice
    else:
        level = 0  # No trigger
    
    return {
        "level": level,
        "confidence": confidence,
        "reasons": reasons,
        "details": {
            "similarity": max_similarity,
            "topic_drift": topic_drift,
            "emotion_score": emotion_score,
            "progress": progress,
            "task_type": task_type,
            "repeat_count": repeat_count
        }
    }


def analyze_efficiency(project_id: str, time_range: str = "7d", use_cache: bool = True, language: str = "en") -> Dict:
    """
    分析项目的API使用效率
    """
    # 检查缓存
    if use_cache:
        cached_result = efficiency_cache.get(project_id, time_range)
        if cached_result:
            # 添加缓存标记
            cached_result["_cached"] = True
            cached_result["_cache_timestamp"] = time.time()
            return cached_result
    
    db = SessionLocal()
    try:
        # 计算时间范围
        if time_range == "7d":
            cutoff_time = datetime.utcnow() - timedelta(days=7)
        elif time_range == "30d":
            cutoff_time = datetime.utcnow() - timedelta(days=30)
        else:
            cutoff_time = datetime.utcnow() - timedelta(days=7)
        
        # 获取指定时间范围内的请求数据
        requests = db.query(Request).filter(
            Request.project_id == project_id,
            Request.timestamp >= cutoff_time
        ).all()
        
        if not requests:
            return {
                "score": 0,
                "grade": "N/A",
                "analysis": "No data available for analysis",
                "suggestions": [],
                "positive_points": []
            }
        
        # 计算基础指标
        total_requests = len(requests)
        total_cost = sum(req.total_cost_usd or 0 for req in requests)
        avg_cost_per_request = total_cost / total_requests if total_requests > 0 else 0
        
        # 分析模型使用分布
        model_usage = {}
        for req in requests:
            model = req.model or "unknown"
            if model not in model_usage:
                model_usage[model] = {"count": 0, "cost": 0}
            model_usage[model]["count"] += 1
            model_usage[model]["cost"] += req.total_cost_usd or 0
        
        # 计算效率分数 (0-100)
        base_score = 100
        
        # 1. 成本效率 (权重: 40%)
        cost_efficiency = max(0, 100 - (avg_cost_per_request * 1000))  # 每请求成本越低越好
        cost_score = cost_efficiency * 0.4
        
        # 2. 模型选择效率 (权重: 30%)
        # 检查是否有过度使用昂贵模型
        expensive_models = ["gpt-4", "gpt-4-turbo", "gpt-4o"]
        expensive_usage = sum(model_usage.get(model, {"count": 0})["count"] for model in expensive_models)
        model_efficiency = max(0, 100 - (expensive_usage / total_requests * 100))
        model_score = model_efficiency * 0.3
        
        # 3. 请求模式效率 (权重: 30%)
        # 分析是否有重复/相似请求模式
        unique_prompts = len(set(req.prompt_text or "" for req in requests))
        pattern_efficiency = min(100, (unique_prompts / total_requests) * 200)  # 鼓励多样化请求
        pattern_score = pattern_efficiency * 0.3
        
        # 最终效率分数
        efficiency_score = min(100, max(0, cost_score + model_score + pattern_score))
        
        # 转换为等级
        if efficiency_score >= 85:
            grade = "A"
        elif efficiency_score >= 70:
            grade = "B"
        elif efficiency_score >= 55:
            grade = "C"
        elif efficiency_score >= 40:
            grade = "D"
        else:
            grade = "F"
        
        # 导入国际化消息
        from .i18n import EfficiencyMessages
        
        # 生成建议
        suggestions = []
        positive_points = []
        
        # 成本相关建议
        if avg_cost_per_request > 0.05:
            suggestions.append({
                "text": EfficiencyMessages.get_message(language, "cost_suggestion"),
                "savings": f"Estimated savings: ${avg_cost_per_request * total_requests * 0.3:.2f}"
            })
        else:
            positive_points.append(EfficiencyMessages.get_message(language, "cost_positive"))
        
        # 模型选择建议
        if expensive_usage / total_requests > 0.7:
            suggestions.append({
                "text": EfficiencyMessages.get_message(language, "model_suggestion"),
                "savings": f"Estimated savings: ${total_cost * 0.4:.2f}"
            })
        else:
            positive_points.append(EfficiencyMessages.get_message(language, "model_positive"))
        
        # 请求模式建议
        if unique_prompts / total_requests < 0.3:
            suggestions.append({
                "text": EfficiencyMessages.get_message(language, "pattern_suggestion"),
                "savings": None
            })
        else:
            positive_points.append(EfficiencyMessages.get_message(language, "pattern_positive"))
        
        # 如果没有建议，添加默认建议
        if not suggestions:
            suggestions.append({
                "text": EfficiencyMessages.get_message(language, "default_suggestion"),
                "savings": None
            })
        
        result = {
            "score": round(efficiency_score, 1),
            "grade": grade,
            "analysis": EfficiencyMessages.get_message(language, "analysis_base", count=total_requests),
            "suggestions": suggestions,
            "positive_points": positive_points,
            "metrics": {
                "total_requests": total_requests,
                "total_cost": round(total_cost, 2),
                "avg_cost_per_request": round(avg_cost_per_request, 4),
                "model_distribution": model_usage,
                "unique_prompts": unique_prompts
            }
        }
        
        # 存入缓存
        if use_cache:
            efficiency_cache.set(project_id, time_range, result)
        
        return result
        
    finally:
        db.close()