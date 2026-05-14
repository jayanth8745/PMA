import ollama
import json

from typing import List, Dict

from services.memory_service import MemoryService
from services.expense_service import ExpenseService


class AIAgent:

    def __init__(self, model: str = "phi3:mini"):
        """
        Initialize Ollama AI model
        """
        self.model = model

    # =====================================================
    # CHAT RESPONSE
    # =====================================================

    def get_response(
        self,
        user_id: str,
        user_input: str
    ) -> str:

        try:

            # -----------------------------------------
            # GET USER MEMORIES
            # -----------------------------------------
            history_context = MemoryService.get_memories(
                user_id=user_id
            )

            # -----------------------------------------
            # BUILD CONTEXT
            # -----------------------------------------
            context_str = "\n".join([
                f"- {m.get('content', '')}"
                for m in history_context
            ])

            # -----------------------------------------
            # SYSTEM PROMPT
            # -----------------------------------------
            system_prompt = (
                "You are a Personal Memory Assistant. "
                "Use recent user activities to help naturally.\n\n"
                f"Recent Memories:\n{context_str}\n\n"
                "Keep responses short and voice-friendly."
            )

            # -----------------------------------------
            # OLLAMA CHAT
            # -----------------------------------------
            response = ollama.chat(
                model=self.model,
                messages=[
                    {
                        'role': 'system',
                        'content': system_prompt
                    },
                    {
                        'role': 'user',
                        'content': user_input
                    }
                ]
            )

            reply = response['message']['content']

            # -----------------------------------------
            # SAVE MEMORY
            # -----------------------------------------
            MemoryService.save_memory(
                user_id=user_id,
                data={
                    "content":
                    f"User: {user_input} | Assistant: {reply}"
                }
            )

            return reply

        except Exception as e:

            print("Chat Error:", e)

            return "Sorry, I had trouble processing that."


    # =====================================================
    # EXPENSE PROCESSING
    # =====================================================

    def process_expense_voice(
        self,
        user_id: str,
        transcript: str
    ) -> Dict:

        try:

            # -----------------------------------------
            # AI PROMPT
            # -----------------------------------------
            prompt = (
                f"Extract expense data from: '{transcript}'. "
                "Return ONLY valid JSON with:\n"
                "- amount\n"
                "- category\n"
                "- description\n\n"
                "Categories:\n"
                "Food, Travel, Bills, Shopping, Other.\n\n"
                "If no amount found use 0."
            )

            # -----------------------------------------
            # OLLAMA JSON MODE
            # -----------------------------------------
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                format='json'
            )

            # -----------------------------------------
            # PARSE JSON
            # -----------------------------------------
            expense_data = json.loads(
                response['response']
            )

            # -----------------------------------------
            # SAVE EXPENSE
            # -----------------------------------------
            ExpenseService.save_expense(
                user_id=user_id,
                data=expense_data
            )

            return expense_data

        except Exception as e:

            print("Expense Error:", e)

            return {
                "amount": 0,
                "category": "Other",
                "description": transcript,
                "error": "Failed to process expense"
            }

    def run(self, user_id: str, text: str) -> str:
        return self.get_response(user_id=user_id, user_input=text)


Agent = AIAgent
