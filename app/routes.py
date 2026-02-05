from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from .models import Request, SessionLocal, Feedback, get_db
from .analyzer import analyze_efficiency
from typing import List, Dict, Any
from datetime import datetime, timedelta
from .config import settings
import uuid
from .i18n import ActivityMessages, EfficiencyMessages, Language, get_language_from_header

# Add UserPreferences model
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

def calculate_equivalents(cost_cny: float) -> Dict[str, Any]:
    """Calculate equivalents based on cost in CNY"""
    coffee_cups = round(cost_cny / settings.pricing.coffee_price_cny, 1)
    jianbing_sets = round(cost_cny / settings.pricing.jianbing_price_cny, 1)
    meal_meals = round(cost_cny / settings.pricing.meal_price_cny, 1)
    hotpot_meals = round(cost_cny / settings.pricing.hotpot_price_cny, 1)
    
    # Determine meal equivalent description based on cost and configured prices
    if cost_cny > settings.pricing.hotpot_price_cny:
        meal_equivalent = "一顿海底捞"  # Hotpot equivalent
    elif cost_cny > settings.pricing.meal_price_cny:
        meal_equivalent = "一顿大餐"  # Full meal equivalent
    elif cost_cny > settings.pricing.jianbing_price_cny:
        meal_equivalent = "一份外卖"  # Takeout equivalent
    else:
        meal_equivalent = "一杯咖啡"  # Coffee equivalent
    
    return {
        "coffee_cups": coffee_cups,
        "jianbing_sets": jianbing_sets,
        "meal_meals": meal_meals,
        "meal_equivalent": meal_equivalent,
        "hotpot_meals": hotpot_meals
    }

@router.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    """Get list of all projects from database"""
    # Get all unique project IDs from the Request table
    unique_projects = db.query(Request.project_id).distinct().all()
    
    projects = []
    for project_row in unique_projects:
        project_id = project_row[0]  # Extract string from tuple
        
        # Get the most recent request for this project to get creation time
        recent_request = db.query(Request).filter(
            Request.project_id == project_id
        ).order_by(Request.timestamp.desc()).first()
        
        # Get all requests for this project to calculate totals
        project_requests = db.query(Request).filter(
            Request.project_id == project_id
        ).all()
        
        total_cost_usd = sum(req.total_cost_usd for req in project_requests)
        total_cost_cny = total_cost_usd * settings.pricing.exchange_rate_usd_to_cny
        
        # Calculate equivalent
        equivalents = calculate_equivalents(total_cost_cny)
        
        project_info = {
            "id": project_id,
            "name": project_id,  # For now, use the project_id as the name
            "createdAt": recent_request.timestamp.strftime("%Y-%m-%d") if recent_request else datetime.utcnow().strftime("%Y-%m-%d"),
            "totalCost": total_cost_usd,
            "totalCostCNY": total_cost_cny,
            "equivalent": equivalents["meal_equivalent"]
        }
        projects.append(project_info)
    
    return projects


@router.get("/api/dashboard/summary")
def get_dashboard_summary(time_range: str = "24h", db: Session = Depends(get_db)):
    """
    Return dashboard summary data from database
    """
    # Calculate time range based on parameter
    if time_range == "24h":
        start_time = datetime.utcnow() - timedelta(hours=24)
        comparison_period = "previous_period"  # Compare with previous 24 hours
        comparison_start_time = datetime.utcnow() - timedelta(hours=48)
    elif time_range == "7d":
        start_time = datetime.utcnow() - timedelta(days=7)
        comparison_period = "previous_period"  # Compare with previous 7 days
        comparison_start_time = datetime.utcnow() - timedelta(days=14)
    elif time_range == "30d":
        start_time = datetime.utcnow() - timedelta(days=30)
        comparison_period = "previous_period"  # Compare with previous 30 days
        comparison_start_time = datetime.utcnow() - timedelta(days=60)
    elif time_range == "90d":
        start_time = datetime.utcnow() - timedelta(days=90)
        comparison_period = "previous_period"  # Compare with previous 90 days
        comparison_start_time = datetime.utcnow() - timedelta(days=180)
    else:
        # Default to 24 hours if invalid time range
        start_time = datetime.utcnow() - timedelta(hours=24)
        comparison_period = "previous_period"
        comparison_start_time = datetime.utcnow() - timedelta(hours=48)
    
    # Query for all requests in the specified time range
    requests = db.query(Request).filter(Request.timestamp >= start_time).all()
    
    total_spend_usd = sum(req.total_cost_usd for req in requests)
    total_spend_cny = total_spend_usd * settings.pricing.exchange_rate_usd_to_cny
    
    # Count unique projects
    unique_projects = set(req.project_id for req in requests)
    
    # Count warnings (requests with advisor_level > 1)
    warnings_count = sum(1 for req in requests if req.advisor_level and req.advisor_level > 1)
    
    # Calculate trend (compare with previous period)
    prev_requests = db.query(Request).filter(
        Request.timestamp >= comparison_start_time,
        Request.timestamp < start_time
    ).all()
    
    prev_spend = sum(req.total_cost_usd for req in prev_requests)
    
    if prev_spend > 0:
        change_pct = round(((total_spend_usd - prev_spend) / prev_spend) * 100, 2)
    else:
        change_pct = 0.0
    
    # Calculate equivalents
    equivalents = calculate_equivalents(total_spend_cny)
    
    # For backward compatibility, return data with appropriate labels
    period_label = "current_period"
    if time_range == "24h":
        period_label = "today"
    elif time_range == "7d":
        period_label = "week"
    elif time_range == "30d":
        period_label = "month"
    elif time_range == "90d":
        period_label = "quarter"
    
    result = {
        period_label: {
            "total_cost_usd": round(total_spend_usd, 2),
            "total_cost_cny": round(total_spend_cny, 2),
            "equivalents": {
                "coffee_cups": equivalents["coffee_cups"],
                "jianbing_sets": equivalents["jianbing_sets"],
                "meal_meals": equivalents["meal_meals"],
                "meal_equivalent": equivalents["meal_equivalent"],
                "hotpot_meals": equivalents["hotpot_meals"]
            },
            "change_percent": change_pct
        },
        "active_projects": len(unique_projects),
        "warning_count": warnings_count
    }
    
    # For backward compatibility, also return week data if not requesting week data
    if time_range != "7d":
        week_ago = datetime.utcnow() - timedelta(days=7)
        week_requests = db.query(Request).filter(Request.timestamp >= week_ago).all()
        
        week_spend_usd = sum(req.total_cost_usd for req in week_requests)
        week_spend_cny = week_spend_usd * settings.pricing.exchange_rate_usd_to_cny
        
        # Calculate week trend (compare with previous week)
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)
        prev_week_requests = db.query(Request).filter(
            Request.timestamp >= two_weeks_ago,
            Request.timestamp < week_ago
        ).all()
        
        prev_week_spend = sum(req.total_cost_usd for req in prev_week_requests)
        
        if prev_week_spend > 0:
            week_change_pct = round(((week_spend_usd - prev_week_spend) / prev_week_spend) * 100, 2)
        else:
            week_change_pct = 0.0
        
        # Calculate equivalents for week
        week_equivalents = calculate_equivalents(week_spend_cny)
        
        result["week"] = {
            "total_cost_usd": round(week_spend_usd, 2),
            "total_cost_cny": round(week_spend_cny, 2),
            "equivalents": {
                "coffee_cups": week_equivalents["coffee_cups"],
                "jianbing_sets": week_equivalents["jianbing_sets"],
                "meal_meals": week_equivalents["meal_meals"],
                "meal_equivalent": week_equivalents["meal_equivalent"],
                "hotpot_meals": week_equivalents["hotpot_meals"]
            },
            "change_percent": week_change_pct
        }
    
    return result

@router.get("/api/projects/{id}/stats")
def get_project_stats(id: str, time_range: str = "24h", db: Session = Depends(get_db)):
    """Get project statistics from database"""
    # Calculate time range based on parameter
    if time_range == "24h":
        start_time = datetime.utcnow() - timedelta(hours=24)
    elif time_range == "7d":
        start_time = datetime.utcnow() - timedelta(days=7)
    elif time_range == "30d":
        start_time = datetime.utcnow() - timedelta(days=30)
    elif time_range == "90d":
        start_time = datetime.utcnow() - timedelta(days=90)
    else:
        # Default to 24 hours if invalid time range
        start_time = datetime.utcnow() - timedelta(hours=24)
    
    # Query for requests for this specific project in the specified time range
    requests = db.query(Request).filter(
        Request.project_id == id,
        Request.timestamp >= start_time
    ).all()
    
    total_requests = len(requests)
    total_cost_usd = sum(req.total_cost_usd for req in requests)
    total_cost_cny = total_cost_usd * settings.pricing.exchange_rate_usd_to_cny
    
    # Calculate equivalents
    equivalents = calculate_equivalents(total_cost_cny)
    
    # Calculate debug rate (requests with advisor_level >= 2)
    if total_requests > 0:
        debug_requests = sum(1 for req in requests if req.advisor_level and req.advisor_level >= 2)
        debug_rate = round(debug_requests / total_requests, 2)
    else:
        debug_rate = 0.0
    
    # Group by model to get top models
    model_stats = {}
    for req in requests:
        model = req.model
        if model not in model_stats:
            model_stats[model] = {"requests": 0, "cost": 0.0}
        model_stats[model]["requests"] += 1
        model_stats[model]["cost"] += req.total_cost_usd
    
    # Sort by cost and get top models
    top_models = []
    for model, stats in sorted(model_stats.items(), key=lambda x: x[1]["cost"], reverse=True):
        top_models.append({
            "model": model,
            "requests": stats["requests"],
            "cost": round(stats["cost"], 2)
        })
    
    # Calculate daily trend based on time range
    daily_trend = []
    
    # Determine number of days based on time_range
    if time_range == "24h":
        # For 24h, just return the current day data
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_requests = db.query(Request).filter(
            Request.project_id == id,
            Request.timestamp >= day_start,
            Request.timestamp < day_end
        ).all()
        
        day_cost = sum(req.total_cost_usd for req in day_requests)
        
        daily_trend.append({
            "date": day_start.strftime("%m-%d"),
            "cost": round(day_cost, 2)
        })
    else:
        # Calculate number of days based on time range
        if time_range == "7d":
            num_days = 7
        elif time_range == "30d":
            num_days = 30
        elif time_range == "90d":
            num_days = 90
        else:
            num_days = 7  # Default to 7 days
        
        for i in range(num_days - 1, -1, -1):  # From num_days ago to today
            day_start = datetime.utcnow() - timedelta(days=i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_requests = db.query(Request).filter(
                Request.project_id == id,
                Request.timestamp >= day_start,
                Request.timestamp < day_end
            ).all()
            
            day_cost = sum(req.total_cost_usd for req in day_requests)
            
            daily_trend.append({
                "date": day_start.strftime("%m-%d"),
                "cost": round(day_cost, 2)
            })
    
    # Calculate usage analysis (breakdown by purpose)
    debug_requests = sum(1 for req in requests if req.pattern_score and req.pattern_score >= 3)
    development_requests = sum(1 for req in requests if req.pattern_score and req.pattern_score < 3 and req.similarity_score < 0.5)
    optimization_requests = total_requests - debug_requests - development_requests
    
    usage_breakdown = [
        {"name": "Debug", "value": debug_requests, "percentage": round((debug_requests/total_requests)*100, 2) if total_requests > 0 else 0},
        {"name": "Development", "value": development_requests, "percentage": round((development_requests/total_requests)*100, 2) if total_requests > 0 else 0},
        {"name": "Optimization", "value": optimization_requests, "percentage": round((optimization_requests/total_requests)*100, 2) if total_requests > 0 else 0},
    ]
    
    return {
        "project_id": id,
        "period": "24h",
        "total_requests": total_requests,
        "total_cost_usd": round(total_cost_usd, 2),
        "total_cost_cny": round(total_cost_cny, 2),
        "equivalents": equivalents,
        "debug_rate": debug_rate,
        "top_models": top_models,  # All models, not just top 3
        "daily_trend": daily_trend,
        "usage_breakdown": usage_breakdown
    }

@router.get("/api/analyzer/efficiency")
def get_efficiency_analysis(
    project_id: str = "webapp-production", 
    time_range: str = "7d", 
    no_cache: bool = False,
    language: Language = Depends(get_language_from_header)
):
    """
    Get efficiency analysis for a project
    """
    try:
        # Use the analyzer to get efficiency analysis with language support
        analysis_result = analyze_efficiency(project_id, time_range, use_cache=not no_cache, language=language.value)
        
        return {
            "success": True,
            "data": analysis_result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "score": 0,
                "grade": "N/A",
                "analysis": "Analysis failed",
                "suggestions": [],
                "positive_points": []
            }
        }


@router.get("/api/projects/stats")
def get_all_projects_stats(time_range: str = "30d", db: Session = Depends(get_db)):
    """
    Return aggregated statistics across all projects
    """
    # Get all unique project IDs
    unique_project_ids = [row[0] for row in db.query(Request.project_id).distinct().all()]
    
    # Aggregate data across all projects
    all_requests = []
    for project_id in unique_project_ids:
        # Calculate time range based on parameter
        start_time = None
        if time_range == "24h":
            from datetime import datetime, timedelta
            start_time = datetime.utcnow() - timedelta(hours=24)
        elif time_range == "7d":
            from datetime import datetime, timedelta
            start_time = datetime.utcnow() - timedelta(days=7)
        elif time_range == "30d":
            from datetime import datetime, timedelta
            start_time = datetime.utcnow() - timedelta(days=30)
        elif time_range == "90d":
            from datetime import datetime, timedelta
            start_time = datetime.utcnow() - timedelta(days=90)
        else:
            from datetime import datetime, timedelta
            start_time = datetime.utcnow() - timedelta(days=30)  # Default to 30 days

        # Get requests for this project in the time range
        project_requests = db.query(Request).filter(
            Request.project_id == project_id
        )
        
        if start_time:
            project_requests = project_requests.filter(
                Request.timestamp >= start_time
            )
        
        all_requests.extend(project_requests.all())
    
    # Calculate overall statistics
    total_requests = len(all_requests)
    total_cost_usd = sum(req.total_cost_usd for req in all_requests)
    total_cost_cny = total_cost_usd * settings.pricing.exchange_rate_usd_to_cny
    
    # Calculate equivalents
    equivalents = calculate_equivalents(total_cost_cny)
    
    # Calculate debug rate
    if total_requests > 0:
        debug_requests = sum(1 for req in all_requests if req.advisor_level and req.advisor_level >= 2)
        debug_rate = round(debug_requests / total_requests, 2)
    else:
        debug_rate = 0.0
    
    # Group by model to get top models across all projects
    model_stats = {}
    for req in all_requests:
        model = req.model
        if model not in model_stats:
            model_stats[model] = {"requests": 0, "cost": 0.0}
        model_stats[model]["requests"] += 1
        model_stats[model]["cost"] += req.total_cost_usd
    
    # Sort by cost and get all models (not just top 3)
    top_models = []
    for model, stats in sorted(model_stats.items(), key=lambda x: x[1]["cost"], reverse=True):
        top_models.append({
            "model": model,
            "requests": stats["requests"],
            "cost": round(stats["cost"], 2)
        })
    
    # Calculate daily trend across all projects
    daily_trend = []
    
    # Determine number of days based on time_range
    if time_range == "24h":
        from datetime import datetime, timedelta
        # For 24h, just return the current day data
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_requests = db.query(Request).filter(
            Request.timestamp >= day_start,
            Request.timestamp < day_end
        ).all()
        
        day_cost = sum(req.total_cost_usd for req in day_requests)
        
        daily_trend.append({
            "date": day_start.strftime("%m-%d"),
            "cost": round(day_cost, 2)
        })
    else:
        from datetime import datetime, timedelta
        # Calculate number of days based on time_range
        if time_range == "7d":
            num_days = 7
        elif time_range == "30d":
            num_days = 30
        elif time_range == "90d":
            num_days = 90
        else:
            num_days = 30  # Default to 30 days
            
        # Build daily trend from the already collected all_requests data
        # Create a mapping of dates to costs, grouping requests by date
        date_costs = {}
        for req in all_requests:
            # Extract just the date part (YYYY-MM-DD) then format as MM-DD
            # Match the exact format used in single project stats
            req_date = req.timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
            date_key = req_date.strftime("%m-%d")
            if date_key not in date_costs:
                date_costs[date_key] = 0.0
            date_costs[date_key] += req.total_cost_usd
        
        # Generate the date range and populate with actual data or 0
        # Following the same pattern as single project stats to maintain consistency
        # Ensure we have an entry for every day in the range, even if cost is 0
        daily_trend = []  # Initialize for non-24h time ranges
        for i in range(num_days - 1, -1, -1):  # From num_days ago to today
            day_start = datetime.utcnow() - timedelta(days=i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)  # Normalize to start of day
            
            date_key = day_start.strftime("%m-%d")
            
            day_cost = date_costs.get(date_key, 0.0)
            
            daily_trend.append({
                "date": date_key,
                "cost": round(day_cost, 2)
            })

    # Calculate usage breakdown across all projects
    usage_breakdown = []
    if total_requests > 0:
        debug_requests = sum(1 for req in all_requests if req.advisor_level and req.advisor_level >= 2)
        refining_requests = sum(1 for req in all_requests if req.progress_indicator == "refining")
        exploring_requests = sum(1 for req in all_requests if req.progress_indicator == "exploring")
        resolved_requests = sum(1 for req in all_requests if req.progress_indicator == "resolved")
        stuck_requests = sum(1 for req in all_requests if req.progress_indicator == "stuck")
        
        usage_breakdown = [
            {"name": "Debug", "percentage": round((debug_requests / total_requests) * 100, 2)},
            {"name": "Refining", "percentage": round((refining_requests / total_requests) * 100, 2)},
            {"name": "Exploring", "percentage": round((exploring_requests / total_requests) * 100, 2)},
            {"name": "Resolved", "percentage": round((resolved_requests / total_requests) * 100, 2)},
            {"name": "Stuck", "percentage": round((stuck_requests / total_requests) * 100, 2)}
        ]

    return {
        "project_id": "all-projects",
        "period": time_range,
        "total_requests": total_requests,
        "total_cost_usd": round(total_cost_usd, 2),
        "total_cost_cny": round(total_cost_cny, 2),
        "equivalents": equivalents,
        "debug_rate": debug_rate,
        "top_models": top_models,  # All models across all projects
        "daily_trend": daily_trend,
        "usage_breakdown": usage_breakdown
    }


@router.get("/api/cache/stats")
def get_cache_stats():
    """
    Get cache statistics
    """
    try:
        from .analyzer import efficiency_cache
        stats = efficiency_cache.get_stats()
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {}
        }


@router.post("/api/cache/invalidate")
def invalidate_cache(project_id: str = None, time_range: str = None):
    """
    Invalidate cache entries
    """
    try:
        from .analyzer import efficiency_cache
        
        if project_id:
            efficiency_cache.invalidate(project_id, time_range)
            message = f"Cache invalidated for project: {project_id}"
            if time_range:
                message += f", time_range: {time_range}"
        else:
            efficiency_cache.invalidate()
            message = "All cache entries invalidated"
        
        return {
            "success": True,
            "message": message
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/api/warnings")
def get_warnings(db: Session = Depends(get_db)):
    """
    Return warnings from the last 24 hours
    """
    # Calculate time range (last 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(hours=24)
    
    # Get all warnings (level >= 2) from the last 24 hours
    warnings = db.query(Request).filter(
        Request.timestamp >= one_day_ago,
        Request.advisor_level >= 2
    ).order_by(Request.timestamp.desc()).all()
    
    warnings_list = []
    for req in warnings:
        level = req.advisor_level or 0
        
        # Create warning message based on level
        if level == 2:
            message = "Similar requests detected. Consider optimizing."
        elif level == 3:
            message = "High similarity detected. Review your approach."
        else:  # level >= 4
            message = "Rate limiting triggered due to high consumption."
        
        # Calculate CNY cost
        cost_cny = req.total_cost_usd * settings.pricing.exchange_rate_usd_to_cny
        
        # Build details object
        details = {
            "cost_usd": round(req.total_cost_usd, 2),
            "cost_cny": round(cost_cny, 2)
        }
        
        # Add level-specific details
        if level >= 2:
            details["similarity_score"] = round(req.similarity_score, 2) if req.similarity_score else None
        
        if level >= 4:
            details["cooldown_seconds"] = 1200  # 20 minutes
        
        warning_item = {
            "id": req.id,
            "timestamp": req.timestamp.isoformat(),
            "project_id": req.project_id,
            "level": level,
            "message": message,
            "details": details
        }
        warnings_list.append(warning_item)
    
    return {
        "warnings": warnings_list,
        "total_count": len(warnings_list),
        "time_range": "last_24_hours"
    }

@router.get("/api/activities/recent")
def get_recent_activities(
    db: Session = Depends(get_db),
    language: Language = Depends(get_language_from_header)
):    
    """
    Return recent activities from database
    """
    # Get the most recent 20 requests to ensure we include warnings
    recent_requests = db.query(Request).order_by(Request.timestamp.desc()).limit(20).all()
    
    # Prioritize warnings (level >= 2) by sorting them to the top
    recent_requests.sort(key=lambda req: (req.advisor_level or 0) >= 2, reverse=True)
    
    # Take only the first 10 for display
    recent_requests = recent_requests[:10]
    
    activities = []
    for req in recent_requests:
        # Convert advisor level to appropriate message
        level = req.advisor_level or 0
        
        # Get localized message based on level and language
        message = ActivityMessages.get_message(language.value, level)
        
        # Calculate CNY cost
        cost_cny = req.total_cost_usd * settings.pricing.exchange_rate_usd_to_cny
        
        # Build details object based on level
        details = {
            "cost_usd": round(req.total_cost_usd, 2),
            "cost_cny": round(cost_cny, 2)
        }
        
        # Add level-specific details
        if level >= 2:
            details["similarity_score"] = round(req.similarity_score, 2) if req.similarity_score else None
        
        if level == 1:
            # Simple efficiency rating based on cost
            if req.total_cost_usd < 0.1:
                details["efficiency_rating"] = "A"
            elif req.total_cost_usd < 0.3:
                details["efficiency_rating"] = "B"
            elif req.total_cost_usd < 0.5:
                details["efficiency_rating"] = "C"
            else:
                details["efficiency_rating"] = "D"
        
        if level >= 4:
            details["cooldown_seconds"] = 1200  # 20 minutes
        
        activity = {
            "id": req.id,
            "timestamp": req.timestamp.isoformat(),
            "project_id": req.project_id,
            "level": level,
            "message": message,
            "details": details
        }
        activities.append(activity)
    
    # Check if there are more activities
    has_more = len(recent_requests) == 10
    
    return {
        "activities": activities,
        "has_more": has_more
    }

@router.post("/api/feedback")
def post_feedback(feedback: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Handle feedback from users
    """
    request_id = feedback.get('request_id')
    is_accurate = feedback.get('is_accurate', 1)  # 1 for accurate, 0 for inaccurate
    message = feedback.get('message', '')
    project_id = feedback.get('project_id', 'unknown')
    
    # Create a new feedback record
    feedback_record = Feedback(
        id=str(uuid.uuid4()),
        request_id=request_id,
        is_accurate=is_accurate,
        timestamp=datetime.utcnow(),
        project_id=project_id,
        message=message
    )
    
    # Add to database
    db.add(feedback_record)
    db.commit()
    
    return {
        "success": True,
        "message": "Thank you for your feedback. We will use this to improve our analysis."
    }




@router.delete("/api/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """
    Delete a project and all its associated requests and feedback
    """
    # Delete all requests for this project
    deleted_requests = db.query(Request).filter(Request.project_id == project_id).delete()
    
    # Delete all feedback for this project
    deleted_feedback = db.query(Feedback).filter(Feedback.project_id == project_id).delete()
    
    # Commit the changes
    db.commit()
    
    return {
        "success": True,
        "deleted_requests": deleted_requests,
        "deleted_feedback": deleted_feedback,
        "message": f"Project '{project_id}' and all associated data have been deleted"
    }


# User Preferences Model
class UserPreferences(BaseModel):
    today_budget: Optional[float] = 50.0
    week_budget: Optional[float] = 300.0
    active_proj_limit: Optional[int] = 10
    warning_threshold: Optional[int] = 20


# System-wide settings storage
system_settings = {
    "pricing": {
        "exchange_rate_usd_to_cny": settings.pricing.exchange_rate_usd_to_cny,
        "equivalents": {
            "coffee": settings.pricing.coffee_price_cny,
            "jianbing": settings.pricing.jianbing_price_cny,
            "meal": settings.pricing.meal_price_cny,
            "hotpot": settings.pricing.hotpot_price_cny,
        },
        "models": settings.pricing.models.copy()  # Copy actual model prices from config
    },
    "privacy": {
        "store_request_content": settings.privacy.store_request_content,
        "similarity_method": settings.privacy.similarity_method,
        "cache_ttl_seconds": settings.privacy.cache_ttl_seconds,
        "anonymize_project_id": settings.privacy.anonymize_project_id
    },
    "notification": {
        "email_notifications": False,
        "slack_notifications": False,
        "webhook_enabled": False
    }
}

# In-memory storage for user preferences (in production, this would be stored in DB)
user_preferences_storage = {
    "default": {
        "today_budget": 50.0,
        "week_budget": 300.0,
        "active_proj_limit": 10,
        "warning_threshold": 20
    }
}


@router.get("/api/user/preferences", response_model=UserPreferences)
def get_user_preferences():
    """
    Get user preference settings for dashboard meters
    """
    return UserPreferences(**user_preferences_storage.get("default", {
        "today_budget": 50.0,
        "week_budget": 300.0,
        "active_proj_limit": 10,
        "warning_threshold": 20
    }))


@router.get("/api/settings")
def get_system_settings():
    """
    Get system-wide settings including pricing configuration
    """
    return system_settings


@router.post("/api/settings")
def update_system_settings(updated_settings: dict):
    """
    Update system-wide settings including pricing, privacy, and notification configuration
    """
    global system_settings
    try:
        # Update the system settings
        system_settings = updated_settings
        
        # Update the actual pricing configuration in settings object to apply changes globally
        pricing_data = updated_settings.get("pricing", {})
        
        # Update exchange rate
        if "exchange_rate_usd_to_cny" in pricing_data:
            settings.pricing.exchange_rate_usd_to_cny = pricing_data["exchange_rate_usd_to_cny"]
        
        # Update equivalent prices
        if "equivalents" in pricing_data:
            equivalents = pricing_data["equivalents"]
            if "coffee" in equivalents:
                settings.pricing.coffee_price_cny = equivalents["coffee"]
            if "jianbing" in equivalents:
                settings.pricing.jianbing_price_cny = equivalents["jianbing"]
            if "meal" in equivalents:
                settings.pricing.meal_price_cny = equivalents["meal"]
            if "hotpot" in equivalents:
                settings.pricing.hotpot_price_cny = equivalents["hotpot"]
        
        # Update model prices
        if "models" in pricing_data:
            settings.pricing.models = pricing_data["models"]
        
        # Update privacy configuration
        privacy_data = updated_settings.get("privacy", {})
        if privacy_data:
            # Update store_request_content
            if "store_request_content" in privacy_data:
                settings.privacy.store_request_content = privacy_data["store_request_content"]
            # Update similarity_method
            if "similarity_method" in privacy_data:
                settings.privacy.similarity_method = privacy_data["similarity_method"]
            # Update cache_ttl_seconds
            if "cache_ttl_seconds" in privacy_data:
                settings.privacy.cache_ttl_seconds = privacy_data["cache_ttl_seconds"]
            # Update anonymize_project_id
            if "anonymize_project_id" in privacy_data:
                settings.privacy.anonymize_project_id = privacy_data["anonymize_project_id"]
        
        return {
            "success": True,
            "message": "System settings updated successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to update settings: {str(e)}"
        }


@router.get("/api/models/pricing/fetch-official")
def fetch_official_pricing():
    """
    Fetch official model pricing from API providers (placeholder implementation)
    """
    # This is a simplified implementation - in a real scenario, you would fetch
    # from actual API provider websites or APIs
    official_pricing = {
        "gpt-4o": {
            "input": 0.0025,
            "output": 0.010
        },
        "gpt-4o-2024-08-06": {
            "input": 0.0025,
            "output": 0.010
        },
        "gpt-4-turbo": {
            "input": 0.010,
            "output": 0.030
        },
        "gpt-4": {
            "input": 0.030,
            "output": 0.060
        },
        "gpt-3.5-turbo": {
            "input": 0.0005,
            "output": 0.0015
        },
        "claude-3-5-sonnet-20241022": {
            "input": 0.003,
            "output": 0.015
        },
        "claude-3-opus-20240229": {
            "input": 0.015,
            "output": 0.075
        },
        "claude-3-sonnet-20240229": {
            "input": 0.003,
            "output": 0.015
        },
        "claude-3-haiku-20240307": {
            "input": 0.00025,
            "output": 0.00125
        },
        "gemini-1.5-pro": {
            "input": 0.00375,
            "output": 0.01875
        },
        "gemini-1.5-flash": {
            "input": 0.00075,
            "output": 0.00375
        },
        "deepseek-chat": {
            "input": 0.00014,
            "output": 0.00028
        },
        "deepseek-coder": {
            "input": 0.00028,
            "output": 0.00084
        }
    }
    
    return {
        "success": True,
        "data": official_pricing,
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/api/models/pricing/auto-update-from-data")
def auto_update_pricing_from_data(update_existing: bool = False):
    """
    Automatically analyze database for used models and fetch pricing for them
    """
    db = SessionLocal()
    try:
        # Get all unique models from the request data
        unique_models = db.query(Request.model).distinct().filter(Request.model.isnot(None)).all()
        
        # Extract model names from query result
        model_names = [model[0] for model in unique_models if model[0]]
        
        # Get official pricing for these models
        official_pricing = fetch_official_pricing()["data"]
        
        # Filter to only include models that were found in the database
        pricing_for_used_models = {}
        for model in model_names:
            if model in official_pricing:
                pricing_for_used_models[model] = official_pricing[model]
            else:
                # If model is not in our official list, add it with default pricing
                pricing_for_used_models[model] = {"input": 0.001, "output": 0.003}  # Default pricing
        
        # Update system settings with new pricing
        global system_settings
        for model, pricing in pricing_for_used_models.items():
            if update_existing or model not in system_settings["pricing"]["models"]:
                system_settings["pricing"]["models"][model] = pricing
        
        # Also update the settings object
        for model, pricing in pricing_for_used_models.items():
            if update_existing or model not in settings.pricing.models:
                settings.pricing.models[model] = pricing
        
        return {
            "success": True,
            "data": pricing_for_used_models,
            "models_found": model_names,
            "models_updated": list(pricing_for_used_models.keys()),
            "update_existing": update_existing,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {}
        }
    finally:
        db.close()


@router.post("/api/user/preferences")
def update_user_preferences(preferences: UserPreferences):
    """
    Update user preference settings for dashboard meters
    """
    user_preferences_storage["default"] = preferences.dict()
    return {"success": True, "preferences": user_preferences_storage["default"]}