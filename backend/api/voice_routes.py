from flask import Blueprint
from flask import request
from flask import jsonify

try:
    from agents.voice_agent import VoiceAssistantAgent
except ModuleNotFoundError:
    from backend.agents.voice_agent import VoiceAssistantAgent


voice_bp = Blueprint(

    "voice_bp",

    __name__
)

agent = VoiceAssistantAgent()


# =====================================================
# VOICE CHAT
# =====================================================

@voice_bp.route(

    "/api/voice",

    methods=["POST"]
)

def voice_chat():

    try:

        data = request.get_json(silent=True) or {}

        text = data.get(

            "text",

            data.get("command", "")
        )

        user_id = request.headers.get("Authorization") or data.get("user_id") or "demo_user"

        response = agent.route_request(

            user_id=user_id,

            text=text
        )

        return jsonify({

            "success": True,

            "reply": response,

            "response": response
        })

    except Exception as e:

        return jsonify({

            "success": False,

            "error": str(e)
        })
