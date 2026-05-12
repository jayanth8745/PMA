#!/usr/bin/env python3
"""
Simple Voice Assistant Launcher
Starts both backend and frontend servers without complex monitoring
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_ollama():
    """Check if Ollama is running"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [model.get("name", "") for model in models]
            print(f"✅ Ollama is running with models: {', '.join(model_names)}")
            return True
    except:
        pass
    
    print("⚠️  Ollama is not running. Please start Ollama first:")
    print("   - Download from: https://ollama.ai/")
    print("   - Run: ollama serve")
    print("   - Install models: ollama pull llama2")
    return False

def main():
    """Main function to start the application"""
    print("=" * 60)
    print("🎤 Voice Assistant - Simple Launcher")
    print("=" * 60)
    
    # Check requirements
    if not check_python_version():
        sys.exit(1)
    
    if not check_ollama():
        print("⚠️  Continuing anyway, but chat features may not work...")
    
    # Start backend
    backend_dir = Path(__file__).parent / "backend"
    venv_python = backend_dir.parent / ".venv" / "Scripts" / "python.exe"
    
    if not venv_python.exists():
        print("❌ Virtual environment not found. Please run setup first.")
        sys.exit(1)
    
    print("🚀 Starting backend server...")
    os.chdir(backend_dir)
    backend_process = subprocess.Popen([
        str(venv_python),
        "server.py"
    ])
    
    # Start frontend
    frontend_dir = Path(__file__).parent / "frontend"
    print("🚀 Starting frontend server...")
    os.chdir(frontend_dir)
    frontend_process = subprocess.Popen([
        sys.executable,
        "-m", "http.server", "3000"
    ])
    
    # Wait for servers to start
    print("⏳ Waiting for servers to start...")
    time.sleep(5)
    
    # Open browser
    print("🌐 Opening browser...")
    webbrowser.open("http://localhost:3000/login.html")
    
    print("\n" + "=" * 60)
    print("🎉 Application is running!")
    print("📍 Backend: http://localhost:5000")
    print("📍 Frontend: http://localhost:3000")
    print("📍 Login: http://localhost:3000/login.html")
    print("📍 Dashboard: http://localhost:3000/dashboard.html")
    print("\n💡 Say 'Hey Assistant' to activate voice assistant")
    print("💡 Press Ctrl+C to stop the application")
    print("=" * 60)
    
    try:
        # Keep script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Application stopped")

if __name__ == "__main__":
    main()
