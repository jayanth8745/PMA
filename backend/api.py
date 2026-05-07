from flask import Flask, request, jsonify
from flask_cors import CORS
from db_driver import DatabaseDriver
import ollama
import prompts
import json

app = Flask(__name__)
CORS(app)
db = DatabaseDriver()

@app.route('/chat', methods=['POST'])
def chat():
    """Handles the chat interface and voice transcription processing[cite: 9, 29]."""
    data = request.json
    user_input = data.get("text")
    
    # Get last 5 memories for context recall [cite: 18]
    history = db.get_recent_memories(limit=5)
    context_str = "\n".join([m['content'] for m in history])
    
    # Generate response via Ollama [cite: 28]
    response = ollama.chat(model="phi3:mini", messages=[
        {'role': 'system', 'content': f"{prompts.SYSTEM_PROMPT}\nContext: {context_str}"},
        {'role': 'user', 'content': user_input}
    ])
    
    reply = response['message']['content']
    
    # Automatically store interaction in the memory system [cite: 16]
    db.add_memory(f"User: {user_input} | Assistant: {reply}")
    
    return jsonify({"reply": reply})

@app.route('/expense', methods=['POST'])
def add_expense():
    """Extracts and stores expenses from voice or text[cite: 20]."""
    data = request.json
    text = data.get("text")
    
    # Use Ollama to parse structured data [cite: 28]
    parser_resp = ollama.generate(
        model="phi3:mini", 
        prompt=prompts.EXPENSE_PARSER_PROMPT.format(text=text),
        format='json'
    )
    
    expense_data = json.loads(parser_resp['response'])
    db.add_expense(expense_data['amount'], expense_data['category'], expense_data['description'])
    
    return jsonify({"status": "success", "data": expense_data})

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """Provides summaries for the dashboard and chart visualization[cite: 11, 14]."""
    return jsonify({
        "memories": db.get_recent_memories(5),
        "expenses": db.get_recent_expenses(5)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
