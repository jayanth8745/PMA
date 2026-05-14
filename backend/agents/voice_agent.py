import json

from ai.ollama_client import OllamaClient

from services.memory_service import MemoryService
from services.expense_service import ExpenseService


class VoiceAssistantAgent:

    # =====================================================
    # INIT
    # =====================================================

    def __init__(self):

        self.ai = OllamaClient()

    # =====================================================
    # MAIN ROUTER
    # =====================================================

    def route_request(
        self,
        user_id,
        text
    ):

        try:

            if not text:

                return (
                    "I didn't hear anything."
                )

            text_lower = text.lower()

            # ==========================================
            # EXPENSE DETECTION
            # ==========================================

            expense_keywords = [

                "spent",
                "paid",
                "bought",
                "expense",
                "cost",
                "bill",
                "price",
                "ordered",
                "purchase"
            ]

            if any(

                word in text_lower

                for word in expense_keywords
            ):

                expense_data = (
                    self.process_expense(
                        user_id,
                        text
                    )
                )

                return (
                    f"Expense saved. "
                    f"{expense_data['amount']} "
                    f"for "
                    f"{expense_data['category']}."
                )

            # ==========================================
            # MEMORY SAVE
            # ==========================================

            memory_keywords = [

                "remember",
                "save this",
                "note this",
                "store this"
            ]

            if any(

                word in text_lower

                for word in memory_keywords
            ):

                MemoryService.add_memory(

                    user_id=user_id,

                    content=text,

                    category="voice"
                )

                return (
                    "Okay, memory saved."
                )

            # ==========================================
            # MEMORY SEARCH
            # ==========================================

            search_keywords = [

                "find",
                "search",
                "show memories",
                "what did i",
                "recent memories"
            ]

            if any(

                word in text_lower

                for word in search_keywords
            ):

                results = (
                    MemoryService.search_memories(

                        user_id=user_id,

                        query_text=text
                    )
                )

                if not results:

                    return (
                        "No memories found."
                    )

                memories = []

                for item in results[:3]:

                    memories.append(

                        item.get(
                            "content",
                            ""
                        )
                    )

                return (

                    "Here are your memories: "
                    + " | ".join(memories)
                )

            # ==========================================
            # GENERAL AI CHAT
            # ==========================================

            return self.chat_response(
                user_id,
                text
            )

        except Exception as e:

            print(
                "Route Error:",
                e
            )

            return (
                "Something went wrong."
            )

    # =====================================================
    # CHAT RESPONSE
    # =====================================================

    def chat_response(
        self,
        user_id,
        text
    ):

        try:

            memories = (

                MemoryService
                .get_dashboard_memories(

                    user_id=user_id,

                    limit=5
                )
            )

            context = "\n".join([

                m.get(
                    "content",
                    ""
                )

                for m in memories
            ])

            system_prompt = f"""
You are a smart AI Voice Assistant.

Use recent user memories
to answer naturally.

Recent memories:
{context}

Rules:
- short replies
- natural replies
- voice friendly
- conversational
"""

            reply = self.ai.chat(

                system_prompt=system_prompt,

                user_prompt=text
            )

            # ==========================================
            # SAVE CHAT MEMORY
            # ==========================================

            MemoryService.add_memory(

                user_id=user_id,

                content=(
                    f"User: {text} | "
                    f"Assistant: {reply}"
                ),

                category="chat"
            )

            return reply

        except Exception as e:

            print(
                "Chat Error:",
                e
            )

            return (
                "Sorry, I had trouble responding."
            )

    # =====================================================
    # EXPENSE PROCESSOR
    # =====================================================

    def process_expense(
        self,
        user_id,
        text
    ):

        try:

            prompt = f"""
Extract expense data from:

{text}

Return ONLY valid JSON:

{{
    "amount": number,
    "category": "Food",
    "description": "text"
}}

Categories:
Food
Travel
Bills
Shopping
Other

If amount missing:
use 0.
"""

            response = (
                self.ai.generate_json(
                    prompt
                )
            )

            expense_data = json.loads(
                response
            )

            ExpenseService.save_expense(

                user_id=user_id,

                data=expense_data
            )

            return expense_data

        except Exception as e:

            print(
                "Expense Error:",
                e
            )

            return {

                "amount": 0,

                "category": "Other",

                "description": text
            }