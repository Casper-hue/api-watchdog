import sys
import os
sys.path.insert(0, r'd:\AAA文件夹分类\小项目\API-watchdog')

from app.models import Request, get_db
from datetime import datetime, timedelta

# Directly check the database
try:
    db_gen = get_db()
    db = next(db_gen)
    
    # Get all requests to analyze timestamp patterns
    all_requests = db.query(Request).all()
    print(f"Total requests in DB: {len(all_requests)}")
    
    if all_requests:
        # Get earliest and latest timestamps
        timestamps = [req.timestamp for req in all_requests]
        earliest = min(timestamps)
        latest = max(timestamps)
        
        print(f"Earliest timestamp: {earliest}")
        print(f"Latest timestamp: {latest}")
        print(f"Time span: {latest - earliest}")
        
        # Get requests from last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_requests = [req for req in all_requests if req.timestamp >= seven_days_ago]
        
        print(f"\nRequests in last 7 days: {len(recent_requests)}")
        
        # Group by date to see the pattern
        date_groups = {}
        for req in recent_requests:
            date_key = req.timestamp.strftime("%m-%d")
            if date_key not in date_groups:
                date_groups[date_key] = []
            date_groups[date_key].append(req)
        
        print("\nRecent requests by date:")
        for date_key in sorted(date_groups.keys()):
            total_cost = sum(r.total_cost_usd for r in date_groups[date_key])
            print(f"  {date_key}: {len(date_groups[date_key])} requests, ${total_cost:.2f}")
        
        # Check all unique dates in the database
        all_dates = set()
        for req in all_requests:
            all_dates.add(req.timestamp.strftime("%m-%d"))
        
        print(f"\nAll unique dates in DB: {sorted(list(all_dates))[-10:]}")  # Last 10 dates
    
    db.close()
    
except Exception as e:
    print(f"Database error: {str(e)}")
    import traceback
    traceback.print_exc()