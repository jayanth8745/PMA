from datetime import datetime

try:
    from backend.db.db_driver import db
except ModuleNotFoundError:
    from db.db_driver import db


class MemoryService:

    # =====================================================
    # ADD MEMORY
    # =====================================================

    @staticmethod
    def add_memory(
        user_id,
        content,
        category="general"
    ):
        """
        Store a user-specific memory
        """

        memory_doc = {

            # ---------------------------------
            # USER SEPARATION
            # ---------------------------------
            "user_id": user_id,

            # ---------------------------------
            # MEMORY DATA
            # ---------------------------------
            "content": content,

            "category": category,

            "created_at": datetime.utcnow()
        }

        result = db.memories.insert_one(
            memory_doc
        )

        return str(result.inserted_id)

    @staticmethod
    def save_memory(user_id, data):
        return MemoryService.add_memory(
            user_id=user_id,
            content=data.get("content", ""),
            category=data.get("category", "general")
        )

    @staticmethod
    def get_memories(user_id, limit=5):
        return MemoryService.get_dashboard_memories(
            user_id=user_id,
            limit=limit
        )

    # =====================================================
    # DASHBOARD MEMORIES
    # =====================================================

    @staticmethod
    def get_dashboard_memories(
        user_id,
        limit=5
    ):
        """
        Retrieve only this user's memories
        """

        memories = list(

            db.memories.find({

                # ---------------------------------
                # FILTER BY USER
                # ---------------------------------
                "user_id": user_id

            }).sort(
                "created_at",
                -1
            ).limit(limit)
        )

        # ---------------------------------
        # FORMAT JSON RESPONSE
        # ---------------------------------
        for m in memories:

            m['_id'] = str(m['_id'])

            if 'created_at' in m:
                m['created_at'] = (
                    m['created_at'].isoformat()
                )

        return memories

    # =====================================================
    # SEARCH MEMORIES
    # =====================================================

    @staticmethod
    def search_memories(
        user_id,
        query_text
    ):
        """
        Search ONLY user's memories
        """

        results = list(

            db.memories.find({

                # ---------------------------------
                # USER FILTER
                # ---------------------------------
                "user_id": user_id,

                # ---------------------------------
                # TEXT SEARCH
                # ---------------------------------
                "content": {
                    "$regex": query_text,
                    "$options": "i"
                }
            })
        )

        # ---------------------------------
        # FORMAT OBJECT IDs
        # ---------------------------------
        for item in results:

            item['_id'] = str(item['_id'])

            if 'created_at' in item:
                item['created_at'] = (
                    item['created_at'].isoformat()
                )

        return results
