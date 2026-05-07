from db.database import db
from datetime import datetime

class MemoryService:
    @staticmethod
    def add_memory(content, category="general"):
        """Stores a new memory in MongoDB[cite: 8, 15]."""
        memory_doc = {
            "content": content,
            "category": category,
            "created_at": datetime.utcnow()
        }
        result = db.memories.insert_one(memory_doc)
        return str(result.inserted_id)

    @staticmethod
    def get_dashboard_memories(limit=5):
        """Retrieves the last 5 memories for the dashboard display[cite: 17, 24]."""
        memories = list(db.memories.find().sort("created_at", -1).limit(limit))
        # Format for JSON API
        for m in memories:
            m['_id'] = str(m['_id'])
            m['created_at'] = m['created_at'].isoformat()
        return memories

    @staticmethod
    def search_memories(query_text):
        """Basic keyword search through stored memories[cite: 18]."""
        # Simple regex search; for production, consider MongoDB Atlas Vector Search
        results = list(db.memories.find({"content": {"$regex": query_text, "$options": "i"}}))
        return results