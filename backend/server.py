import os
from datetime import datetime
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

load_dotenv(ROOT_DIR / "backend" / ".env")

from chatbot import CHAT_MODEL, VOICE_MODEL, chat_assistant_reply, voice_assistant_reply
from agents.voice_agent import VoiceAssistantAgent

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")

# Initialize Voice Agent
voice_agent = VoiceAssistantAgent()
CORS(app)

mongo_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"), serverSelectionTimeoutMS=2500)
db = mongo_client[os.getenv("DB_NAME", "personal_memory_assistant")]

# Create indexes for faster queries
try:
    db.memories.create_index([("user_id", 1), ("created_at", -1)])
    db.tasks.create_index([("user_id", 1), ("created_at", -1)])
    db.expenses.create_index([("user_id", 1), ("created_at", -1)])
except Exception as e:
    print(f"Warning: Failed to create indexes: {e}")


def now_utc():
    return datetime.utcnow()


def serialize(value):
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat() + "Z"
    return value


def doc_id(document):
    return {"_id": ObjectId(document["_id"])} if "_id" in document else {}


def get_user_id_from_auth():
    """
    Extract user mongo ObjectId from Authorization header.
    Token format comes from this app: local-token-<mongo_id> or google-token-<mongo_id>.
    """
    auth = request.headers.get("Authorization") or ""
    parts = auth.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    # local-token-<id> / google-token-<id> / demo_token_<...>
    if token.startswith(("local-token-", "google-token-")):
        mongo_id = token.split("-", 2)[-1]
        try:
            return ObjectId(mongo_id)
        except Exception:
            return None
    return None


def collection_context(user_id):
    try:
        memories = list(db.memories.find({"user_id": user_id}).sort("created_at", -1).limit(8))
        tasks = list(db.tasks.find({"user_id": user_id}).sort("created_at", -1).limit(8))
        expenses = list(db.expenses.find({"user_id": user_id}).sort("created_at", -1).limit(8))
        return serialize({"memories": memories, "tasks": tasks, "expenses": expenses})
    except Exception as error:
        # Return empty context if MongoDB is not available
        print(f"MongoDB context error: {error}")
        return serialize({"memories": [], "tasks": [], "expenses": []})


def handle_chat_operation(text, user_id):
    lower = text.lower().strip()
    if lower.startswith(("add task", "create task", "new task")):
        title = lower
        for prefix in ("add task", "create task", "new task"):
            title = title.replace(prefix, "", 1).strip()
        title = title or "Untitled task"
        task = {"title": title, "category": "work", "priority": "medium", "done": False, "created_at": now_utc(), "user_id": user_id}
        result = db.tasks.insert_one(task)
        task["_id"] = result.inserted_id
        return {"reply": f'Task added: "{title}".', "task": task}

    if lower.startswith(("add expense", "spent", "new expense")):
        import re
        amount_match = re.search(r"(\d+(?:\.\d+)?)", lower)
        amount = float(amount_match.group(1)) if amount_match else 0
        title = text
        expense = {
            "title": title,
            "amount": amount,
            "type": "expense",
            "category": "other",
            "date": now_utc().date().isoformat(),
            "created_at": now_utc(),
            "user_id": user_id,
        }
        result = db.expenses.insert_one(expense)
        expense["_id"] = result.inserted_id
        return {"reply": f"Expense added for {amount:.2f}.", "expense": expense}

    if lower.startswith(("remember", "add memory", "save memory")):
        content = text.split(" ", 1)[1] if " " in text else text
        memory = {
            "title": content[:60],
            "description": content,
            "category": "general",
            "mood": "neutral",
            "tags": [],
            "date": now_utc().date().isoformat(),
            "created_at": now_utc(),
            "user_id": user_id,
        }
        result = db.memories.insert_one(memory)
        memory["_id"] = result.inserted_id
        return {"reply": "Memory saved.", "memory": memory}

    if "list tasks" in lower or "show tasks" in lower:
        tasks = list(db.tasks.find({"user_id": user_id}).sort("created_at", -1).limit(10))
        titles = [task.get("title", "Untitled task") for task in tasks]
        return {"reply": "Tasks: " + (", ".join(titles) if titles else "none yet."), "tasks": tasks}

    if "list expenses" in lower or "show expenses" in lower:
        expenses = list(db.expenses.find({"user_id": user_id}).sort("created_at", -1).limit(10))
        lines = [f"{expense.get('title', 'Expense')} ({expense.get('amount', 0)})" for expense in expenses]
        return {"reply": "Expenses: " + (", ".join(lines) if lines else "none yet."), "expenses": expenses}

    if lower.startswith(("search memory", "find memory", "search memories")):
        query = lower.replace("search memories", "", 1).replace("search memory", "", 1).replace("find memory", "", 1).strip()
        memories = list(db.memories.find({
            "user_id": user_id,
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
            ]
        }).sort("created_at", -1).limit(5))
        titles = [memory.get("title", "Untitled memory") for memory in memories]
        return {"reply": "Memory matches: " + (", ".join(titles) if titles else "none found."), "memories": memories}

    return None


def ok(payload=None, status=200):
    return jsonify(serialize(payload or {})), status


def parse_json():
    return request.get_json(silent=True) or {}


def public_user(user):
    return {"id": str(user.get("_id")), "name": user.get("name", ""), "email": user.get("email", "")}


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def frontend_file(path):
    target = FRONTEND_DIR / path
    if target.exists() and target.is_file():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health", methods=["GET"])
def health():
    try:
        mongo_client.admin.command("ping")
        mongo_status = "ok"
    except Exception as error:
        mongo_status = f"error: {error}"
    return ok({"status": "ok", "mongo": mongo_status, "chat_model": CHAT_MODEL, "voice_model": VOICE_MODEL})


@app.route("/api/register", methods=["POST"])
def register():
    payload = parse_json()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    name = (payload.get("name") or email.split("@")[0]).strip()
    if not email or not password:
        return ok({"error": "Email and password are required"}, 400)
    if db.users.find_one({"email": email}):
        return ok({"error": "User already exists"}, 409)
    user = {"name": name, "email": email, "password": password, "created_at": now_utc()}
    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return ok({"access_token": f"local-token-{result.inserted_id}", "user": public_user(user)}, 201)


@app.route("/api/login", methods=["POST"])
def login():
    payload = parse_json()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    user = db.users.find_one({"email": email, "password": password})
    if not user:
        return ok({"error": "Invalid email or password"}, 401)
    return ok({"access_token": f"local-token-{user['_id']}", "user": public_user(user)})


@app.route("/api/auth/google", methods=["POST"])
def google_auth():
    import requests
    
    payload = parse_json()
    token = payload.get("token")
    
    if not token:
        return ok({"error": "Google token is required"}, 400)
    
    try:
        # Verify Google token
        response = requests.get(
            f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={token}"
        )
        
        if response.status_code != 200:
            return ok({"error": "Invalid Google token"}, 401)
            
        google_user = response.json()
        email = google_user.get("email")
        name = google_user.get("name")
        picture = google_user.get("picture")
        
        if not email:
            return ok({"error": "Email is required from Google"}, 400)
        
        # Check if user exists
        user = db.users.find_one({"email": email})
        
        if not user:
            return ok({"error": "User not found. Please register first."}, 404)
        
        # Update user info with Google data
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "name": name or user.get("name"),
                "picture": picture,
                "google_id": google_user.get("id"),
                "last_login": now_utc()
            }}
        )
        
        user = db.users.find_one({"email": email})
        return ok({"access_token": f"google-token-{user['_id']}", "user": public_user(user)})
        
    except Exception as error:
        return ok({"error": f"Google authentication failed: {str(error)}"}, 500)


@app.route("/api/auth/google/register", methods=["POST"])
def google_register():
    import requests
    
    payload = parse_json()
    token = payload.get("token")
    
    if not token:
        return ok({"error": "Google token is required"}, 400)
    
    try:
        # Verify Google token
        response = requests.get(
            f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={token}"
        )
        
        if response.status_code != 200:
            return ok({"error": "Invalid Google token"}, 401)
            
        google_user = response.json()
        email = google_user.get("email")
        name = google_user.get("name")
        picture = google_user.get("picture")
        
        if not email:
            return ok({"error": "Email is required from Google"}, 400)
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return ok({"access_token": f"google-token-{existing_user['_id']}", "user": public_user(existing_user)})
        
        # Create new user
        user = {
            "name": name or email.split("@")[0],
            "email": email,
            "password": "",  # No password for Google users
            "picture": picture,
            "google_id": google_user.get("id"),
            "auth_method": "google",
            "created_at": now_utc(),
            "last_login": now_utc()
        }
        
        result = db.users.insert_one(user)
        user["_id"] = result.inserted_id
        
        return ok({"access_token": f"google-token-{result.inserted_id}", "user": public_user(user)}, 201)
        
    except Exception as error:
        return ok({"error": f"Google registration failed: {str(error)}"}, 500)


@app.route("/api/chat", methods=["POST"])
def chat():
    payload = parse_json()
    text = payload.get("message") or payload.get("text") or payload.get("query") or ""

    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Unauthorized"}, 401)

    history = payload.get("history") or []
    context = payload.get("context") or collection_context(user_id)

    # Persist user data (scoped)
    operation = handle_chat_operation(text, user_id=user_id)

    if operation:
        reply = operation["reply"]
    else:
        reply = chat_assistant_reply(text, history=history, context=context)

    # Try to save conversation, but don't fail if MongoDB is not available
    try:
        db.conversations.insert_one({
            "type": "chat",
            "model": CHAT_MODEL,
            "user_id": user_id,
            "user_message": text,
            "assistant_reply": reply,
            "created_at": now_utc(),
        })
    except Exception as error:
        print(f"Failed to save conversation: {error}")

    return ok({"reply": reply, "response": reply, "model": CHAT_MODEL, **(operation or {})})


@app.route("/api/voice-assistant", methods=["POST"])
def voice_assistant():
    payload = parse_json()
    wake_phrase = (payload.get("wake_phrase") or "Hey Assistant").lower()
    transcript = payload.get("transcript") or payload.get("text") or payload.get("command") or ""
    user_id = get_user_id_from_auth() or "demo_user"

    if wake_phrase not in transcript.lower() and not payload.get("activated"):
        return ok({"activated": False, "reply": "", "response": "", "model": VOICE_MODEL})

    clean_transcript = transcript.lower().replace(wake_phrase, "", 1).strip() or transcript
    reply = voice_assistant_reply(clean_transcript, context=collection_context(user_id))

    try:
        db.conversations.insert_one({
            "type": "voice",
            "model": VOICE_MODEL,
            "user_id": user_id,
            "user_message": transcript,
            "assistant_reply": reply,
            "created_at": now_utc(),
        })
    except Exception as error:
        print(f"Failed to save voice assistant conversation: {error}")

    return ok({"activated": True, "reply": reply, "response": reply, "model": VOICE_MODEL})


@app.route("/api/voice", methods=["POST"])
def voice_chat():
    payload = parse_json()
    text = payload.get("text") or payload.get("command") or payload.get("transcript") or ""
    user_id = get_user_id_from_auth() or payload.get("user_id") or "demo_user"

    reply = voice_agent.route_request(
        user_id=user_id,
        text=text
    )

    return ok({
        "success": True,
        "reply": reply,
        "response": reply,
        "model": VOICE_MODEL
    })


@app.route("/api/voice-memory", methods=["POST"])
def voice_memory():
    payload = parse_json()
    text = payload.get("text") or payload.get("content") or ""
    if not text:
        return ok({"error": "Text is required"}, 400)
    
    memory = {
        "title": text[:60],
        "description": text,
        "category": "voice",
        "mood": "neutral",
        "tags": ["voice"],
        "date": now_utc().date().isoformat(),
        "created_at": now_utc(),
    }
    result = db.memories.insert_one(memory)
    memory["_id"] = result.inserted_id
    return ok({"memory": memory}, 201)


@app.route("/api/query", methods=["POST"])
@app.route("/api/voice/command", methods=["POST"])
def legacy_chat_routes():
    payload = parse_json()
    text = (payload.get("command") or payload.get("query") or payload.get("text") or payload.get("message") or "").strip()
    if not text:
        return ok({"action": "chat", "reply": "Please say that again.", "response": "Please say that again.", "model": VOICE_MODEL})
    
    user_id = get_user_id_from_auth()
    if not user_id:
        # Use demo user for testing
        user_id = "demo_user"
    
    # Use voice agent for voice commands
    reply = voice_agent.route_request(
        user_id=user_id,
        text=text
    )
    
    try:
        db.conversations.insert_one({
            "type": "voice",
            "model": VOICE_MODEL,
            "user_id": user_id,
            "user_message": text,
            "assistant_reply": reply,
            "created_at": now_utc(),
        })
    except Exception as error:
        print(f"Failed to save conversation: {error}")
    
    return ok({"action": "chat", "reply": reply, "response": reply, "model": VOICE_MODEL})


@app.route("/api/memories", methods=["GET", "POST"])
def memories():
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "POST":
        payload = parse_json()
        document = {
            "user_id": user_id,
            "title": payload.get("title") or payload.get("content", "Untitled memory")[:60],
            "description": payload.get("description") or payload.get("content") or "",
            "category": payload.get("category") or "general",
            "mood": payload.get("mood") or "neutral",
            "tags": payload.get("tags") or [],
            "date": payload.get("date") or now_utc().date().isoformat(),
            "created_at": now_utc(),
        }
        result = db.memories.insert_one(document)
        document["_id"] = result.inserted_id
        return ok({"memory": document}, 201)

    query = {"user_id": user_id}
    search = request.args.get("search") or request.args.get("q")
    category = request.args.get("category")
    mood = request.args.get("mood")
    limit = int(request.args.get("limit", "20"))
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    if mood:
        query["mood"] = mood
    items = list(db.memories.find(query).sort("created_at", -1).limit(limit))
    return ok({"memories": items})


@app.route("/api/memories/<memory_id>", methods=["PUT", "DELETE"])
def memory_detail(memory_id):
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "DELETE":
        result = db.memories.delete_one({"_id": ObjectId(memory_id), "user_id": user_id})
        if result.deleted_count == 0:
            return ok({"error": "Memory not found"}, 404)
        return ok({"deleted": True})
    payload = parse_json()
    payload["updated_at"] = now_utc()
    result = db.memories.update_one({"_id": ObjectId(memory_id), "user_id": user_id}, {"$set": payload})
    if result.matched_count == 0:
        return ok({"error": "Memory not found"}, 404)
    return ok({"updated": True})


@app.route("/api/tasks", methods=["GET", "POST"])
@app.route("/api/tasks/add", methods=["POST"])
def tasks():
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "POST":
        payload = parse_json()
        document = {
            "user_id": user_id,
            "title": payload.get("title") or payload.get("text") or "Untitled task",
            "category": payload.get("category") or "work",
            "priority": payload.get("priority") or "medium",
            "done": bool(payload.get("done", False)),
            "created_at": now_utc(),
        }
        result = db.tasks.insert_one(document)
        document["_id"] = result.inserted_id
        return ok({"task": document}, 201)

    query = {"user_id": user_id}
    search = request.args.get("search") or request.args.get("q")
    category = request.args.get("category")
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if category and category != "all":
        query["category"] = category
    return ok({"tasks": list(db.tasks.find(query).sort("created_at", -1).limit(50))})


@app.route("/api/tasks/<task_id>", methods=["PUT", "DELETE"])
def task_detail(task_id):
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "DELETE":
        result = db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user_id})
        if result.deleted_count == 0:
            return ok({"error": "Task not found"}, 404)
        return ok({"deleted": True})
    payload = parse_json()
    payload["updated_at"] = now_utc()
    result = db.tasks.update_one({"_id": ObjectId(task_id), "user_id": user_id}, {"$set": payload})
    if result.matched_count == 0:
        return ok({"error": "Task not found"}, 404)
    return ok({"updated": True})


@app.route("/api/expenses", methods=["GET", "POST"])
@app.route("/api/expenses/add", methods=["POST"])
def expenses():
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "POST":
        payload = parse_json()
        document = {
            "user_id": user_id,
            "title": payload.get("title") or payload.get("description") or "Expense",
            "amount": float(payload.get("amount") or 0),
            "type": payload.get("type") or "expense",
            "category": payload.get("category") or "other",
            "date": payload.get("date") or now_utc().date().isoformat(),
            "created_at": now_utc(),
        }
        result = db.expenses.insert_one(document)
        document["_id"] = result.inserted_id
        return ok({"expense": document}, 201)

    query = {"user_id": user_id}
    search = request.args.get("search") or request.args.get("q")
    category = request.args.get("category")
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    if category and category != "all":
        query["category"] = category
    return ok({"expenses": list(db.expenses.find(query).sort("created_at", -1).limit(50))})


@app.route("/api/expenses/<expense_id>", methods=["PUT", "DELETE"])
def expense_detail(expense_id):
    user_id = get_user_id_from_auth()
    if not user_id:
        return ok({"error": "Authentication required"}, 401)
    
    if request.method == "DELETE":
        result = db.expenses.delete_one({"_id": ObjectId(expense_id), "user_id": user_id})
        if result.deleted_count == 0:
            return ok({"error": "Expense not found"}, 404)
        return ok({"deleted": True})
    payload = parse_json()
    payload["updated_at"] = now_utc()
    result = db.expenses.update_one({"_id": ObjectId(expense_id), "user_id": user_id}, {"$set": payload})
    if result.matched_count == 0:
        return ok({"error": "Expense not found"}, 404)
    return ok({"updated": True})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return ok({"error": "No file provided"}, 400)
    
    file = request.files['file']
    if file.filename == '':
        return ok({"error": "No file selected"}, 400)
    
    # For now, just return a success response with file info
    # In a production app, you'd save the file to storage or cloud
    return ok({
        "message": "File uploaded successfully",
        "filename": file.filename,
        "size": len(file.read()),
        "content_type": file.content_type
    })


@app.route("/api/stats", methods=["GET"])
def stats():
    memories_count = db.memories.count_documents({})
    tasks = list(db.tasks.find())
    expenses = list(db.expenses.find())
    
    spent = sum(item.get("amount", 0) for item in expenses if item.get("type") == "expense")
    income = sum(item.get("amount", 0) for item in expenses if item.get("type") == "income")
    
    return ok({
        "memory_count": memories_count,
        "task_count": len(tasks),
        "done_tasks": len([task for task in tasks if task.get("done")]),
        "spent": spent,
        "income": income,
        "expense_count": len(expenses),
    })


@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    memories = list(db.memories.find().sort("created_at", -1).limit(5))
    tasks = list(db.tasks.find().sort("created_at", -1).limit(50))
    expenses = list(db.expenses.find().sort("created_at", -1).limit(20))
    recent_expenses = expenses[:5]
    spent = sum(item.get("amount", 0) for item in expenses if item.get("type") == "expense")
    income = sum(item.get("amount", 0) for item in expenses if item.get("type") == "income")
    return ok({
        "recent_memories": memories,
        "tasks": tasks,
        "recent_expenses": recent_expenses,
        "expenses": expenses,
        "stats": {
            "memory_count": db.memories.count_documents({}),
            "task_count": len(tasks),
            "done_tasks": len([task for task in tasks if task.get("done")]),
            "spent": spent,
            "income": income,
        },
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    app.run(host="127.0.0.1", port=port, debug=debug)
