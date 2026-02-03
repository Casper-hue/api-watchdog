import sys
import os
import requests

# Test the API and see if there are any server-side errors
try:
    response = requests.get("http://127.0.0.1:8000/api/projects/stats?time_range=7d")
    print(f"Response status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"JSON response keys: {list(data.keys())}")
        print(f"daily_trend length: {len(data.get('daily_trend', []))}")
        print(f"total_requests: {data.get('total_requests', 'N/A')}")
    else:
        print(f"Error response: {response.text}")
        
except Exception as e:
    print(f"Request error: {str(e)}")