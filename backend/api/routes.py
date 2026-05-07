from flask import Blueprint, request, jsonify
from agents.agent import MasterAgent
from services.expense_service import ExpenseService

api_bp = Blueprint('api', __name__)
master_agent = MasterAgent()

@api_bp.route('/voice/command', methods=['POST'])
def voice_command():
    data = request.json
    text = data.get("text")
    # Delegate to the Agent system
    result = master_agent.route_request(text)
    return jsonify({"reply": result})

@api_bp.route('/dashboard/summary', methods=['GET'])
def get_dashboard():
    return jsonify({
        "expenses": ExpenseService.get_summary()
    })