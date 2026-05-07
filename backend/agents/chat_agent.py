import ollama
from ai.prompts import SYSTEM_PROMPT

class ChatAgent:
    def __init__(self, model="phi3:mini"):
        self.model = model

    def handle(self, user_input):
        """Handles general conversation with a friendly tone."""
        response = ollama.chat(model=self.model, messages=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_input}
        ])
        return response['message']['content']
