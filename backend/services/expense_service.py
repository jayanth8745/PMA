from datetime import datetime

try:
    from backend.db.db_driver import db
except ModuleNotFoundError:
    from db.db_driver import db


class ExpenseService:

    # =====================================================
    # SAVE EXPENSE
    # =====================================================

    @staticmethod
    def save_expense(user_id, data):

        # ---------------------------------
        # ADD USER ID
        # ---------------------------------
        data['user_id'] = user_id

        # ---------------------------------
        # ADD TIMESTAMP
        # ---------------------------------
        data['timestamp'] = datetime.utcnow()

        result = db.expenses.insert_one(data)

        return str(result.inserted_id)

    # =====================================================
    # GET USER SUMMARY
    # =====================================================

    @staticmethod
    def get_summary(user_id):

        # ---------------------------------
        # FILTER BY USER
        # ---------------------------------
        recent = list(
            db.expenses.find(
                {
                    "user_id": user_id
                }
            ).sort(
                "timestamp",
                -1
            ).limit(5)
        )

        # ---------------------------------
        # CONVERT OBJECTID
        # ---------------------------------
        for item in recent:

            item['_id'] = str(item['_id'])

        return recent
