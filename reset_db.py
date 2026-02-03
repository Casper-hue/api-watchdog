import os
import shutil
from app.models import init_db

# Remove the database file if it exists
db_path = "data/watchdog.db"
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Removed existing database: {db_path}")

# Initialize the database with the new schema
init_db()
print("Database initialized with new schema")