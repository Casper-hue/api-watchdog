import requests
import json
from datetime import datetime, timedelta

# Test the API endpoint with debug info
print("Testing API endpoint...")

try:
    # First, let's test basic connectivity
    health_response = requests.get("http://127.0.0.1:8000/")
    print(f"Health check status: {health_response.status_code}")

    # Now test the problematic endpoint
    response = requests.get("http://127.0.0.1:8000/api/projects/stats?time_range=7d")
    print(f"API Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("API Response successful!")
        print(f"Project ID: {data.get('project_id')}")
        print(f"Period: {data.get('period')}")
        print(f"Total requests: {data.get('total_requests', 'N/A')}")
        print(f"Total cost USD: {data.get('total_cost_usd', 'N/A')}")
        print(f"Top models count: {len(data.get('top_models', []))}")
        
        # Let's also test a single project endpoint to compare
        projects_response = requests.get("http://127.0.0.1:8000/api/projects")
        if projects_response.status_code == 200:
            projects = projects_response.json()
            print(f"Available projects: {len(projects)}")
            if projects:
                first_project = projects[0]
                print(f"First project: {first_project['name']} (ID: {first_project['id']})")
                
                # Test the single project stats
                proj_stats_response = requests.get(f"http://127.0.0.1:8000/api/projects/{first_project['id']}/stats?time_range=7d")
                if proj_stats_response.status_code == 200:
                    proj_data = proj_stats_response.json()
                    print(f"Single project total requests: {proj_data.get('total_requests', 'N/A')}")
                    print(f"Single project daily trend length: {len(proj_data.get('daily_trend', []))}")
                    if proj_data.get('daily_trend'):
                        print("Sample single project daily trend data:")
                        for i, day_data in enumerate(proj_data.get('daily_trend', [])[:3]):
                            print(f"  {i+1}. Date: {day_data.get('date')}, Cost: {day_data.get('cost')}")
        
        print(f"Daily trend length: {len(data.get('daily_trend', []))}")
        if data.get('daily_trend'):
            print("Sample daily trend data:")
            for i, day_data in enumerate(data.get('daily_trend', [])[:3]):  # Print first 3 days
                print(f"  {i+1}. Date: {day_data.get('date')}, Cost: {day_data.get('cost')}")
            print("Last 3 days:")
            for i, day_data in enumerate(data.get('daily_trend', [])[-3:]):  # Print last 3 days
                print(f"  {i+1}. Date: {day_data.get('date')}, Cost: {day_data.get('cost')}")
        else:
            print("No daily trend data available.")
            
    else:
        print(f"API Error: {response.text}")
        
except Exception as e:
    print(f"Request failed: {str(e)}")
    import traceback
    traceback.print_exc()