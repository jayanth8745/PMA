import ollama
import json
from typing import List, Dict

class AIAgent:
    def __init__(self, model: str = "phi3:mini"):
        """Initializes the agent using a local Ollama model[cite: 28]."""
        self.model = model

    def get_response(self, user_input: str, history_context: List[Dict]) -> str:
        """
        Generates a conversational response based on recent user memories[cite: 16, 18].
        """
        # Format the last 5 memories for the AI to 'remember' [cite: 17]
        context_str = "\n".join([f"- {m['content']}" for m in history_context])
        
        system_prompt = (
            "You are a Personal Memory Assistant[cite: 2]. "
            "Use the following recent activities to help the user:\n"
            f"{context_str}\n\n"
            "Keep responses short and voice-friendly."
        )

        response = ollama.chat(
            model=self.model,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_input}
            ]
        )
        return response['message']['content']

    def process_expense_voice(self, transcript: str) -> Dict:
        """
        Specifically extracts expense data for the Expense Module[cite: 19, 20].
        """
        prompt = (
            f"Extract expense data from: '{transcript}'. "
            "Return JSON with: 'amount', 'category' (Food, Travel, Bills, Other), and 'description'. "
            "If no amount is found, use 0."
        )
        
        # Use Ollama's JSON mode for reliable data entry into MongoDB [cite: 27]
        response = ollama.generate(model=self.model, prompt=prompt, format='json')
        return json.loads(response['response'])
