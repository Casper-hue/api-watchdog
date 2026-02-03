import requests
import json

# Test the API endpoint
try:
    response = requests.get("http://127.0.0.1:8000/api/projects/stats?time_range=7d")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("API Response successful!")
        print(f"Total requests: {data.get('total_requests', 'N/A')}")
        print(f"Total cost USD: {data.get('total_cost_usd', 'N/A')}")
        print(f"Daily trend length: {len(data.get('daily_trend', []))}")
        print("Sample daily trend data:")
        for i, day_data in enumerate(data.get('daily_trend', [])[:3]):  # Print first 3 days
            print(f"  {i+1}. Date: {day_data.get('date')}, Cost: {day_data.get('cost')}")
        print("Last 3 days:")
        for i, day_data in enumerate(data.get('daily_trend', [])[-3:]):  # Print last 3 days
            print(f"  {i+1}. Date: {day_data.get('date')}, Cost: {day_data.get('cost')}")
    else:
        print(f"API Error: {response.text}")
except Exception as e:
    print(f"Request failed: {str(e)}")