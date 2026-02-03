import requests
import json

# 测试新的API端点，获取所有项目的汇总数据
url = "http://127.0.0.1:8000/api/projects/stats?time_range=30d"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print("API Response (All Projects Aggregated):")
    print(json.dumps(data, indent=2))
    
    print("\nTop Models across all projects:")
    for i, model in enumerate(data.get('top_models', [])):
        print(f"{i+1}. {model['model']} - Requests: {model['requests']}, Cost: ${model['cost']}")
        
    print(f"\nTotal requests across all projects: {data.get('total_requests', 0)}")
    print(f"Total cost across all projects: ${data.get('total_cost_usd', 0)}")
else:
    print(f"Error: {response.status_code} - {response.text}")