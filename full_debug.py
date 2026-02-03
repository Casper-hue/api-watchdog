import sys
import os
sys.path.insert(0, r'd:\AAA文件夹分类\小项目\API-watchdog')

from app.models import Request, get_db
from datetime import datetime, timedelta

# Simulate the exact logic from the API function
def debug_get_all_projects_stats(time_range="7d"):
    print(f"Getting stats for time_range: {time_range}")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Get all unique project IDs (same as in the API)
        unique_project_ids = [row[0] for row in db.query(Request.project_id).distinct().all()]
        print(f"Unique project IDs: {unique_project_ids}")
        
        # Calculate time range based on parameter (same as in the API)
        start_time = None
        if time_range == "24h":
            start_time = datetime.utcnow() - timedelta(hours=24)
        elif time_range == "7d":
            start_time = datetime.utcnow() - timedelta(days=7)
        elif time_range == "30d":
            start_time = datetime.utcnow() - timedelta(days=30)
        elif time_range == "90d":
            start_time = datetime.utcnow() - timedelta(days=90)
        else:
            start_time = datetime.utcnow() - timedelta(days=30)  # Default to 30 days
        
        print(f"Start time: {start_time}")
        
        # Aggregate data across all projects (same as in the API)
        all_requests = []
        for project_id in unique_project_ids:
            print(f"Processing project: {project_id}")
            # Get requests for this project in the time range
            project_requests = db.query(Request).filter(
                Request.project_id == project_id
            )
            
            if start_time:
                project_requests = project_requests.filter(
                    Request.timestamp >= start_time
                )
            
            project_reqs_list = project_requests.all()
            print(f"  Found {len(project_reqs_list)} requests for project {project_id}")
            all_requests.extend(project_reqs_list)
        
        print(f"Total all_requests: {len(all_requests)}")
        
        if all_requests:
            print("Sample request timestamps:")
            for i, req in enumerate(all_requests[:5]):  # Print first 5
                print(f"  {i+1}. {req.timestamp} (formatted: {req.timestamp.strftime('%m-%d')})")
        
        # Calculate number of days based on time_range (same as in the API)
        if time_range == "7d":
            num_days = 7
        elif time_range == "30d":
            num_days = 30
        elif time_range == "90d":
            num_days = 90
        else:
            num_days = 30  # Default to 30 days
            
        print(f"Num days for calculation: {num_days}")
        
        # Build daily trend from the already collected all_requests data
        # Create a mapping of dates to costs, grouping requests by date
        date_costs = {}
        for req in all_requests:
            # Extract just the date part then format as MM-DD
            req_date = req.timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
            date_key = req_date.strftime("%m-%d")
            if date_key not in date_costs:
                date_costs[date_key] = 0.0
            date_costs[date_key] += req.total_cost_usd
        
        print(f"Date costs dictionary: {date_costs}")
        
        # Generate the date range and populate with actual data or 0
        daily_trend = []
        for i in range(num_days - 1, -1, -1):  # From num_days ago to today
            day_start = datetime.utcnow() - timedelta(days=i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)  # Normalize to start of day
            
            date_key = day_start.strftime("%m-%d")
            
            day_cost = date_costs.get(date_key, 0.0)
            
            daily_trend.append({
                "date": date_key,
                "cost": round(day_cost, 2)
            })
        
        print(f"Final daily_trend: {daily_trend}")
        print(f"Daily trend length: {len(daily_trend)}")
        
    finally:
        db.close()

# Run the debug function
debug_get_all_projects_stats("7d")