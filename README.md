# Voice Assistant Application

A personal memory assistant with voice and chat capabilities powered by AI.

## 🚀 Quick Start

### Option 1: One-Click Launch (Recommended)
```bash
# Double-click this file or run:
start.bat
```

### Option 2: Python Launcher
```bash
python start_app.py
```

### Option 3: Manual Start
```bash
# Terminal 1 - Backend
cd backend
..\venv\Scripts\Activate.ps1
python server.py

# Terminal 2 - Frontend  
cd frontend
python -m http.server 3000
```

## 📱 Access the Application

- **Login Page**: http://localhost:3000/login.html
- **Register Page**: http://localhost:3000/register.html  
- **Dashboard**: http://localhost:3000/dashboard.html

## 🎤 Voice Assistant Features

- **Wake Phrase**: Say "Hey Assistant" to activate
- **3D Sphere**: Visual feedback when voice assistant is active
- **Chat Interface**: Text-based chat assistant
- **Memory Management**: Store and retrieve memories
- **Task Tracking**: Add and manage tasks
- **Expense Tracking**: Monitor expenses

## 🔧 Requirements

1. **Python 3.11+** (included in .venv)
2. **Ollama** for AI models:
   ```bash
   # Install Ollama from https://ollama.ai/
   ollama serve
   ollama pull llama2
   ```
3. **MongoDB** (for data storage)

## 🛠️ Setup

1. **Clone/Download** this project
2. **Install Ollama** and pull llama2 model
3. **Start MongoDB** (if not running)
4. **Run the application** using one of the methods above

## 🔐 Google OAuth Setup

To enable Google login/register:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth credentials
3. Update `GOOGLE_CLIENT_ID` in `frontend/script.js`
4. See `GOOGLE_OAUTH_SETUP.md` for detailed instructions

## 🐛 Troubleshooting

**Chat assistant not working / 405 errors:**
- Ensure Ollama is running: `ollama serve`
- Check llama2 model is installed: `ollama list`
- Restart the application

**Voice assistant not responding:**
- Check microphone permissions
- Ensure "Hey Assistant" wake phrase is used
- Check browser console for errors

**Server connection issues:**
- Backend runs on port 5000
- Frontend runs on port 3000
- Check if ports are available

## 📁 Project Structure

```
voice-assistant-v3/
├── start.bat              # One-click launcher
├── start_app.py           # Python launcher script
├── backend/               # Flask API server
│   ├── server.py          # Main backend application
│   ├── chatbot.py         # AI model integration
│   └── requirements.txt   # Python dependencies
├── frontend/              # Web interface
│   ├── index.html         # Main dashboard
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── script.js          # Frontend JavaScript
│   └── styles.css         # Styling
├── .venv/                 # Python virtual environment
└── GOOGLE_OAUTH_SETUP.md  # Google OAuth setup guide
```

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

Personal Project - Educational Use
