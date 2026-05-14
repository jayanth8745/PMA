from flask import Blueprint, request, jsonify

from agents.voice_agent import VoiceAssistantAgent
from services.expense_service import ExpenseService

api_bp = Blueprint('api', __name__)

voice_agent = VoiceAssistantAgent()
    

# =====================================================
# VOICE COMMAND
# =====================================================

@api_bp.route('/voice/command', methods=['POST'])
def voice_command():

    # ---------------------------------
    # GET USER ID
    # ---------------------------------
    user_id = request.headers.get("Authorization")

    if not user_id:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    data = request.json

    text = data.get("text")

    # ---------------------------------
    # PASS USER ID TO AGENT
    # ---------------------------------
    result = voice_agent.route_request(
        user_id=user_id,
        text=text
    )

    return jsonify({
        "reply": result
    })


# =====================================================
# DASHBOARD SUMMARY
# =====================================================

@api_bp.route('/dashboard/summary', methods=['GET'])
def get_dashboard():

    # ---------------------------------
    # GET USER ID
    # ---------------------------------
    user_id = request.headers.get("Authorization")

    if not user_id:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    return jsonify({
        "expenses": ExpenseService.get_summary(
            user_id=user_id
        )
    })