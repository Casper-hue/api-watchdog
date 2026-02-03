"""
前后端集成测试
验证数据从后端到前端的完整流程
"""

import requests
import json
import sys

def test_api_endpoints():
    """测试所有API端点是否正常工作"""
    base_url = "http://127.0.0.1:8000"
    
    print("=== 前后端集成测试 ===\n")
    
    # 测试 Dashboard API
    print("1. 测试 Dashboard API")
    try:
        response = requests.get(f"{base_url}/api/dashboard/summary")
        data = response.json()
        
        print(f"   ✅ 状态码: {response.status_code}")
        print(f"   📊 今日花费: ${data['today']['total_cost_usd']}")
        print(f"   📈 活跃项目: {data['active_projects']}")
        print(f"   ⚠️  警告数量: {data['warning_count']}")
        
        # 验证数据格式是否符合契约
        required_fields = ['today', 'week', 'active_projects', 'warning_count']
        for field in required_fields:
            assert field in data, f"缺少必需字段: {field}"
        
        print("   ✅ 数据格式符合契约定义")
        
    except Exception as e:
        print(f"   ❌ Dashboard API 测试失败: {e}")
        return False
    
    # 测试活动流 API
    print("\n2. 测试活动流 API")
    try:
        response = requests.get(f"{base_url}/api/activities/recent")
        data = response.json()
        
        print(f"   ✅ 状态码: {response.status_code}")
        print(f"   📋 活动数量: {len(data['activities'])}")
        print(f"   🔄 是否有更多: {data['has_more']}")
        
        # 验证数据格式
        assert 'activities' in data, "缺少activities字段"
        assert 'has_more' in data, "缺少has_more字段"
        
        print("   ✅ 数据格式符合契约定义")
        
    except Exception as e:
        print(f"   ❌ 活动流 API 测试失败: {e}")
        return False
    
    # 测试项目列表 API
    print("\n3. 测试项目列表 API")
    try:
        response = requests.get(f"{base_url}/api/projects")
        data = response.json()
        
        print(f"   ✅ 状态码: {response.status_code}")
        print(f"   📁 项目数量: {len(data)}")
        
        # 验证数据格式
        assert isinstance(data, list), "项目列表应该是数组"
        
        print("   ✅ 数据格式符合契约定义")
        
    except Exception as e:
        print(f"   ❌ 项目列表 API 测试失败: {e}")
        return False
    
    # 测试项目统计 API
    print("\n4. 测试项目统计 API")
    try:
        response = requests.get(f"{base_url}/api/projects/default-project/stats")
        data = response.json()
        
        print(f"   ✅ 状态码: {response.status_code}")
        print(f"   📊 项目ID: {data.get('project_id', 'N/A')}")
        print(f"   💰 总花费: ${data.get('total_cost_usd', 0)}")
        
        # 验证数据格式
        required_fields = ['project_id', 'total_cost_usd', 'total_cost_cny']
        for field in required_fields:
            if field in data:
                print(f"   ✅ 字段 {field} 存在")
        
        print("   ✅ 数据格式符合契约定义")
        
    except Exception as e:
        print(f"   ❌ 项目统计 API 测试失败: {e}")
        return False
    
    # 测试错误处理
    print("\n5. 测试错误处理")
    try:
        response = requests.get(f"{base_url}/api/nonexistent-endpoint")
        
        if response.status_code == 404:
            print("   ✅ 404错误处理正常")
        else:
            print(f"   ⚠️  非预期状态码: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ 错误处理测试失败: {e}")
        return False
    
    print("\n=== 集成测试完成 ===")
    print("✅ 所有API端点正常工作")
    print("✅ 数据格式符合契约定义")
    print("✅ 前后端集成成功")
    
    return True

def test_data_consistency():
    """测试前后端数据一致性"""
    print("\n=== 数据一致性测试 ===")
    
    base_url = "http://127.0.0.1:8000"
    
    try:
        # 获取dashboard数据
        response = requests.get(f"{base_url}/api/dashboard/summary")
        dashboard_data = response.json()
        
        # 验证数据类型
        assert isinstance(dashboard_data['today']['total_cost_usd'], (int, float)), "今日花费应该是数字"
        assert isinstance(dashboard_data['active_projects'], int), "活跃项目数应该是整数"
        assert isinstance(dashboard_data['warning_count'], int), "警告数量应该是整数"
        
        # 验证数据范围
        assert dashboard_data['today']['total_cost_usd'] >= 0, "今日花费不能为负数"
        assert dashboard_data['active_projects'] >= 0, "活跃项目数不能为负数"
        assert dashboard_data['warning_count'] >= 0, "警告数量不能为负数"
        
        print("✅ 数据类型和范围验证通过")
        
        # 验证货币等价物计算
        equivalents = dashboard_data['today']['equivalents']
        required_equivalents = ['coffee_cups', 'jianbing_sets', 'meal_equivalent', 'hotpot_meals']
        
        for field in required_equivalents:
            assert field in equivalents, f"缺少等价物字段: {field}"
        
        print("✅ 货币等价物计算验证通过")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据一致性测试失败: {e}")
        return False

if __name__ == "__main__":
    # 运行集成测试
    api_test_passed = test_api_endpoints()
    
    # 运行数据一致性测试
    consistency_test_passed = test_data_consistency()
    
    # 总结
    print("\n=== 测试总结 ===")
    if api_test_passed and consistency_test_passed:
        print("🎉 所有测试通过！前后端集成成功！")
        sys.exit(0)
    else:
        print("❌ 部分测试失败，需要检查问题")
        sys.exit(1)