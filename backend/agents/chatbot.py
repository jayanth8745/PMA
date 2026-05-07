from pathlib import Path
import sys
import ollama


BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from chatbot import chat_assistant_reply


def chat(prompt, history=None, context=None):
    return chat_assistant_reply(prompt, history=history, context=context)


if __name__ == "__main__":
    history = []
    while True:
        prompt = input("You: ").strip()
        if prompt.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break

        reply = ollama.generate(model="phi3:mini", prompt=prompt)
        print("Max:", reply["response"])
        history.append({"role": "user", "content": prompt})
        history.append({"role": "assistant", "content": reply["response"]})
        
