import ollama
from backend.db.db_driver import db

class MemoryAgent:
    def __init__(self, model="phi3:mini"):
        self.model = model

    def handle(self, user_input):
        """Processes memory storage or retrieval requests."""
        # Check if the user is asking a question (retrieval) or making a statement (storage)
        prompt = f"Identify if this is a 'save' or 'query' request: '{user_input}'. Return only the word."
        intent = ollama.generate(model=self.model, prompt=prompt)['response'].strip().lower()

        if "query" in intent:
            # Context-aware retrieval logic can be expanded here
            return "Searching your memories..." 
        
        return f"I've noted that for you."
