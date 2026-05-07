import ollama

class TaskAgent:
    def __init__(self, model="phi3:mini"):
        self.model = model

    def handle(self, user_input):
        """Extracts task details like title and category."""
        prompt = (
            f"Extract the task from: '{user_input}'. "
            "Return JSON with 'title' and 'category' (e.g., Work, Personal, Shopping)."
        )
        # In a real flow, you would parse this JSON and call task_service.py
        return "I have added that task to your list."
