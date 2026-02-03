from datetime import datetime, timedelta

# Test the date range logic
num_days = 7

print("Expected date range (7 days):")
for i in range(num_days - 1, -1, -1):  # From num_days ago to today
    day_date = datetime.utcnow() - timedelta(days=i)
    day_date = day_date.replace(hour=0, minute=0, second=0, microsecond=0)  # Normalize to start of day
    
    date_key = day_date.strftime("%m-%d")
    
    print(f"  i={i}: {date_key} (day {num_days - i} days ago)")

print("\nAlternative approach - forward order:")
for i in range(num_days):
    day_offset = num_days - 1 - i  # Start from num_days ago and move forward
    day_date = datetime.utcnow() - timedelta(days=day_offset)
    day_date = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    date_key = day_date.strftime("%m-%d")
    
    print(f"  day {i+1}: {date_key}")

print("\nCurrent UTC date:", datetime.utcnow().strftime("%m-%d"))