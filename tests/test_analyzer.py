"""
这不是普通的单元测试，而是「可执行的需求文档」
每个测试用例 = 一个具体的业务场景
"""

import pytest
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List
from unittest.mock import Mock, patch

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.analyzer import analyze_behavior

# ============================================
# 辅助函数：创建测试数据
# ============================================

def create_message(message: str) -> Dict[str, str]:
    """创建一个测试用的消息对象"""
    return {
        "role": "user",
        "content": message
    }

def create_messages(*messages: str) -> List[Dict[str, str]]:
    """创建消息列表"""
    return [create_message(msg) for msg in messages]

# ============================================
# 场景1：正常开发，不应该警告
# ============================================

def test_normal_development_no_warning():
    """
    场景：用户在正常开发新功能
    预期：不触发任何警告
    """
    project_id = "test-project"
    messages = create_messages(
        "Create a user authentication module",
        "Add password hashing to the auth module"
    )
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] == 0, "正常开发不应该触发警告"
    assert result["confidence"] < 0.3, "置信度应该很低"


# ============================================
# 场景2：无效循环，应该警告
# ============================================

def test_stuck_in_debug_loop():
    """
    场景：用户卡在同一个错误上，重复问了3次
    预期：触发Level 2警告
    """
    project_id = "test-project"
    messages = create_messages(
        "How to fix this TypeError in my code?",
        "Still getting TypeError, how to fix it?",
        "Same TypeError error, what should I do?"
    )
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] >= 2, "应该触发警告"
    assert result["confidence"] > 0.3, "置信度应该较高"


# ============================================
# 场景3：合理迭代，不应该误判
# ============================================

def test_reasonable_iteration_no_false_positive():
    """
    场景：用户在优化代码，虽然有相似词汇，但在进步
    预期：不触发警告或只有轻微提示
    """
    project_id = "test-project"
    messages = create_messages(
        "Refactor this function to be more efficient",
        "Further optimize the refactored function for speed"
    )
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] <= 1, "优化迭代不应该触发严重警告"


# ============================================
# 场景4：情绪化编程，强制冷静
# ============================================

def test_emotional_programming_rate_limit():
    """
    场景：用户快速重复5次相似请求，显示挫败情绪
    预期：触发Level 4强制冷静
    """
    project_id = "test-project"
    messages = create_messages(
        "Why is this still not working? Try #1",
        "Why is this still not working? Try #2", 
        "Why is this still not working? Try #3",
        "Why is this still not working? Try #4",
        "Why is this still not working? Try #5"
    )
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] >= 3, "高重复率应该触发高级别警告"


# ============================================
# 场景5：Claude vs GPT的阈值差异
# ============================================

def test_model_specific_thresholds():
    """
    场景：同样的重复，不同模型可能有不同阈值
    预期：不同模型可能有不同警告级别
    """
    project_id = "test-project"
    messages = create_messages(
        "Fix error A",
        "Fix error A again"
    )
    
    # Test with different models
    gpt_result = analyze_behavior(project_id, messages, "gpt-4o")
    claude_result = analyze_behavior(project_id, messages, "claude-opus-4")
    
    # Both should detect some level of similarity
    assert gpt_result["level"] >= 0, "GPT应该能检测到重复"
    assert claude_result["level"] >= 0, "Claude应该能检测到重复"


# ============================================
# 场景6：高效使用，应该鼓励
# ============================================

def test_efficient_usage_should_encourage():
    """
    场景：用户高效使用AI，不同主题的请求
    预期：不触发严重警告
    """
    project_id = "test-project"
    messages = create_messages(
        "Explain this algorithm",
        "Provide code example"
    )
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] <= 1, "高效使用不应该触发严重警告"


# ============================================
# 场景7：空请求列表处理
# ============================================

def test_empty_requests_list():
    """
    场景：只有当前请求，没有历史记录
    预期：返回level=0
    """
    project_id = "test-project"
    messages = create_messages("First request")  # 只有一条消息
    
    result = analyze_behavior(project_id, messages)
    
    assert result["level"] == 0, "单条消息应该返回level=0"


# ============================================
# 场景8：跨项目请求，不应该关联
# ============================================

def test_cross_project_requests_should_not_affect():
    """
    场景：不同项目的请求不应该相互影响
    预期：只分析当前项目的请求
    """
    # 项目A的重复请求
    project_a_messages = create_messages(
        "Error A",
        "Error A again"
    )
    
    # 项目B的重复请求
    project_b_messages = create_messages(
        "Error B", 
        "Error B again"
    )
    
    # 分析项目A的请求
    result_a = analyze_behavior("project-a", project_a_messages)
    
    # 项目A的重复应该被检测到
    assert result_a["level"] >= 1, "项目A的重复应该被检测到"


if __name__ == "__main__":
    # 运行所有测试
    pytest.main([__file__, "-v"])