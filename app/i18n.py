from enum import Enum
from typing import Dict, Optional
from fastapi import Header

class Language(str, Enum):
    EN = "en"
    ZH = "zh"

class EfficiencyMessages:
    """效率分析消息"""
    
    MESSAGES: Dict[str, Dict[str, str]] = {
        "en": {
            "cost_suggestion": "Consider using more economical models to reduce average request cost",
            "cost_positive": "Good cost control, low average request cost",
            "model_suggestion": "Over-reliance on expensive models, consider mixing in economical models",
            "model_positive": "Reasonable model selection, balanced cost distribution",
            "pattern_suggestion": "Request patterns are relatively uniform, consider diversifying content to improve efficiency",
            "pattern_positive": "Diversified request patterns, contributing to overall efficiency",
            "default_suggestion": "Continue maintaining current API usage patterns",
            "analysis_base": "In-depth analysis based on {count} request records"
        },
        "zh": {
            "cost_suggestion": "考虑使用更经济的模型来降低平均请求成本",
            "cost_positive": "成本控制良好，平均请求成本较低",
            "model_suggestion": "过度依赖昂贵模型，考虑混用经济模型",
            "model_positive": "模型选择合理，成本分布均衡",
            "pattern_suggestion": "请求模式相对单一，考虑多样化内容以提高效率",
            "pattern_positive": "请求模式多样化，有助于整体效率",
            "default_suggestion": "继续保持当前的API使用模式",
            "analysis_base": "基于 {count} 条请求记录的深入分析"
        }
    }
    
    @classmethod
    def get_message(cls, lang: str, key: str, **kwargs) -> str:
        """获取指定语言和键的消息，支持参数替换"""
        if lang not in cls.MESSAGES:
            lang = "en"  # 默认语言
        
        message_template = cls.MESSAGES[lang].get(key, cls.MESSAGES["en"][key])
        
        # 替换模板中的参数
        for param, value in kwargs.items():
            message_template = message_template.replace(f"{{{param}}}", str(value))
        
        return message_template


class ActivityMessages:
    """国际化活动消息"""
    
    MESSAGES: Dict[str, Dict[str, str]] = {
        "en": {
            "level_0": "Nice! Spending with discipline.",
            "level_1": "Efficient usage detected.",
            "level_2": "Similar requests detected. Consider optimizing.",
            "level_3": "High similarity detected. Review your approach.",
            "level_4": "Rate limiting triggered due to high consumption."
        },
        "zh": {
            "level_0": "很好！消费很自律。",
            "level_1": "检测到高效使用。",
            "level_2": "检测到相似请求。考虑优化。",
            "level_3": "检测到高度相似。请审视您的方法。",
            "level_4": "因高消耗触发速率限制。"
        }
    }
    
    @classmethod
    def get_message(cls, lang: str, level: int) -> str:
        """获取指定语言和级别的消息"""
        if lang not in cls.MESSAGES:
            lang = "en"  # 默认语言
        
        key = f"level_{level}"
        if key in cls.MESSAGES[lang]:
            return cls.MESSAGES[lang][key]
        else:
            # 如果特定级别的消息不存在，返回默认消息
            return cls.MESSAGES[lang].get("level_0", cls.MESSAGES["en"]["level_0"])

def get_language_from_header(accept_language: str = Header(None)) -> Language:
    """从请求头获取语言偏好"""
    if accept_language:
        # 提取主要语言 (例如从 "zh-CN,zh;q=0.9,en;q=0.8" 中提取 "zh")
        primary_lang = accept_language.split(',')[0].split(';')[0].strip()
        if primary_lang.startswith('zh'):
            return Language.ZH
        elif primary_lang.startswith('en'):
            return Language.EN
    
    return Language.EN  # 默认返回英语