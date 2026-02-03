from datetime import datetime, timedelta

# Simulate the logic from the API
num_days = 7

# Simulated date_costs from the database
date_costs = {
    "01-27": 1.64,
    "01-28": 1.67,
    "01-29": 2.04,
    "01-30": 2.37,
    "01-31": 1.11,
    "02-01": 0.82,
    "02-02": 1.55,
    "02-03": 1.01
}

print("Date costs dictionary:", date_costs)

# Generate daily_trend using the same logic as the API
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

print(f"\nGenerated daily_trend ({len(daily_trend)} items):")
for item in daily_trend:
    print(f"  {item['date']}: ${item['cost']}")
    
print(f"\nCurrent date: {datetime.utcnow().strftime('%m-%d')}")

# Also test the expected date range
print("\nExpected date range (from 6 days ago to today):")
for i in range(6, -1, -1):  # 6, 5, 4, 3, 2, 1, 0
    day_date = datetime.utcnow() - timedelta(days=i)
    date_key = day_date.strftime("%m-%d")
    print(f"  Day {6-i+1} (i={i}): {date_key}")