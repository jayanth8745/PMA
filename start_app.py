#!/usr/bin/env python3
"""
Voice Assistant Application Launcher
Starts both backend and frontend servers with one command
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

def start_backend():
    """Start the Flask backend server"""
    backend_dir = Path(__file__).parent / "backend"
    venv_python = backend_dir.parent / ".venv" / "Scripts" / "python.exe"
    
    if not venv_python.exists():
        print("❌ Virtual environment not found. Please run setup first.")
        return None
    
    print("🚀 Starting backend server...")
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Start backend server
    backend_process = subprocess.Popen([
        str(venv_python),
        "server.py"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait a bit and check if server started
    time.sleep(3)
    if backend_process.poll() is None:
        print("✅ Backend server started on http://localhost:5000")
        return backend_process
    else:
        print("❌ Backend server failed to start")
        return None

def start_frontend():
    """Start the frontend development server"""
    frontend_dir = Path(__file__).parent / "frontend"
    
    print("🚀 Starting frontend server...")
    
    # Change to frontend directory
    os.chdir(frontend_dir)
    
    # Start frontend server
    frontend_process = subprocess.Popen([
        sys.executable,
        "-m", "http.server", "3000"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait a bit and check if server started
    time.sleep(2)
    if frontend_process.poll() is None:
        print("✅ Frontend server started on http://localhost:3000")
        return frontend_process
    else:
        print("❌ Frontend server failed to start")
        return None

def open_browser():
    """Open browser to the application"""
    time.sleep(5)  # Wait for servers to fully start
    print("🌐 Opening browser...")
    webbrowser.open("http://localhost:3000/login.html")

def main():
    """Main function to start the application"""
    print("=" * 60)
    print("🎤 Voice Assistant Application Launcher")
    print("=" * 60)
    
    # Check requirements
    if not check_python_version():
        sys.exit(1)
    
    if not check_ollama():
        print("⚠️  Continuing anyway, but chat features may not work...")
    
    # Start servers
    backend_process = start_backend()
    if not backend_process:
        sys.exit(1)
    
    frontend_process = start_frontend()
    if not frontend_process:
        backend_process.terminate()
        sys.exit(1)
    
    # Open browser in a separate thread
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
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
        # Keep the script running
        while True:
            time.sleep(1)
            # Check if servers are still running
            if backend_process.poll() is not None:
                print("❌ Backend server stopped")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend server stopped")
                break
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
    finally:
        # Clean up
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        print("✅ Application stopped")

if __name__ == "__main__":
    main()
