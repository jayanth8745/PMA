import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class DatabaseDriver:

    def __init__(self):

        self.client = MongoClient(
            os.getenv(
                "MONGO_URI",
                "mongodb://localhost:27017/"
            )
        )

        self.db = self.client[
            os.getenv(
                "DB_NAME",
                "memory_assistant"
            )
        ]

        # Collections
        self.memories = self.db["memories"]
        self.expenses = self.db["expenses"]
        self.tasks = self.db["tasks"]
        self.users = self.db["users"]

    # =====================================================
    # USER METHODS
    # =====================================================

    def add_user(self, email, password, name=None):
        user = {
            "email": email,
            "password": password,
            "name": name,
            "created_at": self._now()
        }
        return self.users.insert_one(user)

    def get_user(self, email):
        return self.users.find_one({"email": email})

    def get_user_by_id(self, user_id):
        from bson import ObjectId
        return self.users.find_one({"_id": ObjectId(user_id)})

    def update_user(self, user_id, update_data):
        from bson import ObjectId
        return self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

    # =====================================================
    # MEMORY METHODS
    # =====================================================

    def add_memory(self, user_id, content, title=None, category=None, mood=None):
        from bson import ObjectId
        memory = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "content": content,
            "title": title or "Untitled",
            "category": category or "general",
            "mood": mood or "neutral",
            "created_at": self._now()
        }
        return self.memories.insert_one(memory)

    def get_recent_memories(self, user_id, limit=5):
        from bson import ObjectId
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        memories = self.memories.find(
            {"user_id": user_oid}
        ).sort("created_at", -1).limit(limit)
        return list(memories)

    def get_memory(self, memory_id, user_id):
        from bson import ObjectId
        return self.memories.find_one({
            "_id": ObjectId(memory_id),
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id
        })

    def update_memory(self, memory_id, user_id, update_data):
        from bson import ObjectId
        return self.memories.update_one(
            {"_id": ObjectId(memory_id), "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id},
            {"$set": update_data}
        )

    def delete_memory(self, memory_id, user_id):
        from bson import ObjectId
        return self.memories.delete_one({
            "_id": ObjectId(memory_id),
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id
        })

    # =====================================================
    # TASK METHODS
    # =====================================================

    def add_task(self, user_id, title, category="work", priority="medium"):
        from bson import ObjectId
        task = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "title": title,
            "category": category,
            "priority": priority,
            "done": False,
            "created_at": self._now()
        }
        return self.tasks.insert_one(task)

    def get_recent_tasks(self, user_id, limit=10):
        from bson import ObjectId
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        tasks = self.tasks.find(
            {"user_id": user_oid}
        ).sort("created_at", -1).limit(limit)
        return list(tasks)

    def update_task(self, task_id, user_id, update_data):
        from bson import ObjectId
        return self.tasks.update_one(
            {"_id": ObjectId(task_id), "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id},
            {"$set": update_data}
        )

    def delete_task(self, task_id, user_id):
        from bson import ObjectId
        return self.tasks.delete_one({
            "_id": ObjectId(task_id),
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id
        })

    # =====================================================
    # EXPENSE METHODS
    # =====================================================

    def add_expense(
        self,
        user_id,
        amount,
        category,
        description=None,
        date=None
    ):
        from bson import ObjectId
        expense = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "amount": amount,
            "category": category,
            "description": description or "",
            "date": date or self._now().date().isoformat(),
            "created_at": self._now()
        }
        return self.expenses.insert_one(expense)

    def get_recent_expenses(self, user_id, limit=10):
        from bson import ObjectId
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        expenses = self.expenses.find(
            {"user_id": user_oid}
        ).sort("created_at", -1).limit(limit)
        return list(expenses)

    def update_expense(self, expense_id, user_id, update_data):
        from bson import ObjectId
        return self.expenses.update_one(
            {"_id": ObjectId(expense_id), "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id},
            {"$set": update_data}
        )

    def delete_expense(self, expense_id, user_id):
        from bson import ObjectId
        return self.expenses.delete_one({
            "_id": ObjectId(expense_id),
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id
        })

    # =====================================================
    # UTILITY METHODS
    # =====================================================

    def _now(self):
        from datetime import datetime
        return datetime.utcnow()


db = DatabaseDriver()
