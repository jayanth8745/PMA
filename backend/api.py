from flask import Flask, request, jsonify
from flask_cors import CORS
from db.db_driver import DatabaseDriver
import ollama
import prompts
import json

app = Flask(__name__)
CORS(app)

db = DatabaseDriver()


# =========================================================
# CHAT ROUTE
# =========================================================

@app.route('/chat', methods=['POST'])
def chat():

    # -----------------------------
    # GET USER ID
    # -----------------------------
    user_id = request.headers.get("Authorization")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    user_input = data.get("text")

    # -----------------------------
    # USER-SPECIFIC MEMORIES
    # -----------------------------
    history = db.get_recent_memories(user_id=user_id, limit=5)

    context_str = "\n".join([m['content'] for m in history])

    response = ollama.chat(
        model="phi3:mini",
        messages=[
            {
                'role': 'system',
                'content': f"{prompts.SYSTEM_PROMPT}\nContext: {context_str}"
            },
            {
                'role': 'user',
                'content': user_input
            }
        ]
    )

    reply = response['message']['content']

    # -----------------------------
    # SAVE USER MEMORY
    # -----------------------------
    db.add_memory(
        user_id=user_id,
        content=f"User: {user_input} | Assistant: {reply}"
    )

    return jsonify({"reply": reply})


# =========================================================
# EXPENSE ROUTE
# =========================================================

@app.route('/expense', methods=['POST'])
def add_expense():

    # -----------------------------
    # GET USER ID
    # -----------------------------
    user_id = request.headers.get("Authorization")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    text = data.get("text")

    parser_resp = ollama.generate(
        model="phi3:mini",
        prompt=prompts.EXPENSE_PARSER_PROMPT.format(text=text),
        format='json'
    )

    expense_data = json.loads(parser_resp['response'])

    # -----------------------------
    # SAVE USER EXPENSE
    # -----------------------------
    db.add_expense(
        user_id=user_id,
        amount=expense_data['amount'],
        category=expense_data['category'],
        description=expense_data['description']
    )

    return jsonify({
        "status": "success",
        "data": expense_data
    })


# =========================================================
# DASHBOARD ROUTE
# =========================================================

@app.route('/dashboard', methods=['GET'])
def dashboard():

    # -----------------------------
    # GET USER ID
    # -----------------------------
    user_id = request.headers.get("Authorization")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify({
        "memories": db.get_recent_memories(user_id=user_id, limit=5),
        "expenses": db.get_recent_expenses(user_id=user_id, limit=5)
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)