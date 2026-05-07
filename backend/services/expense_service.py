from db.database import db
from datetime import datetime

class ExpenseService:
    @staticmethod
    def save_expense(data):
        data['timestamp'] = datetime.utcnow()
        return db.expenses.insert_one(data)

    @staticmethod
    def get_summary():
        recent = list(db.expenses.find().sort("timestamp", -1).limit(5))
        # Convert ObjectId to string for JSON serialization
        for item in recent: item['_id'] = str(item['_id'])
        return recent