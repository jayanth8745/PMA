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


class ExistingServer:
    def poll(self):
        return None

    def terminate(self):
        pass

    def wait(self, timeout=None):
        return 0


def is_url_up(url, timeout=2):
    try:
        import requests
        return requests.get(url, timeout=timeout).status_code < 500
    except Exception:
        return False


def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("[ERROR] Python 3.8 or higher is required")
        return False
    print(f"[OK] Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_ollama():
    """Check if Ollama is running"""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [model.get("name", "") for model in models]
            print(f"[OK] Ollama is running with models: {', '.join(model_names)}")
            return True
    except:
        pass
    
    print("[WARN] Ollama is not running. Please start Ollama first:")
    print("   - Download from: https://ollama.ai/")
    print("   - Run: ollama serve")
    print("   - Install models: ollama pull llama2")
    return False

def start_backend():
    """Start the Flask backend server"""
    backend_dir = Path(__file__).parent / "backend"
    venv_python = backend_dir.parent / ".venv" / "Scripts" / "python.exe"
    
    if not venv_python.exists():
        print("[ERROR] Virtual environment not found. Please run setup first.")
        return None
    
    if is_url_up("http://localhost:5000/api/health"):
        print("[OK] Backend server already running on http://localhost:5000")
        return ExistingServer()
    
    print("Starting backend server...")
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Start backend server with better error handling
    backend_process = subprocess.Popen([
        str(venv_python),
        "server.py"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait a bit and check if server started
    time.sleep(3)
    if backend_process.poll() is None:
        print("[OK] Backend server started on http://localhost:5000")
        return backend_process
    else:
        print("[ERROR] Backend server failed to start")
        # Print error output for debugging
        stdout, stderr = backend_process.communicate()
        if stderr:
            print(f"Error: {stderr}")
        return None

def start_frontend():
    """Start the frontend development server"""
    frontend_dir = Path(__file__).parent / "frontend"
    
    if is_url_up("http://localhost:3000/index.html"):
        print("[OK] Frontend server already running on http://localhost:3000")
        return ExistingServer()
    
    print("Starting frontend server...")
    
    # Change to frontend directory
    os.chdir(frontend_dir)
    
    # Start frontend server with better error handling
    frontend_process = subprocess.Popen([
        sys.executable,
        "-m", "http.server", "3000"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait a bit and check if server started
    time.sleep(2)
    if frontend_process.poll() is None:
        print("[OK] Frontend server started on http://localhost:3000")
        return frontend_process
    else:
        print("[ERROR] Frontend server failed to start")
        # Print error output for debugging
        stdout, stderr = frontend_process.communicate()
        if stderr:
            print(f"Error: {stderr}")
        return None

def open_browser():
    """Open browser to the application"""
    time.sleep(5)  # Wait for servers to fully start
    print("Opening browser...")
    webbrowser.open("http://localhost:3000/index.html")

def main():
    """Main function to start the application"""
    print("=" * 60)
    print("Voice Assistant Application Launcher")
    print("=" * 60)
    
    # Check requirements
    if not check_python_version():
        sys.exit(1)
    
    if not check_ollama():
        print("[WARN] Continuing anyway, but chat features may not work...")
    
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
    
    # Give servers more time to stabilize
    print("Waiting for servers to stabilize...")
    time.sleep(3)
    
    print("\n" + "=" * 60)
    print("Application is running!")
    print("Backend: http://localhost:5000")
    print("Frontend: http://localhost:3000")
    print("Home: http://localhost:3000/index.html")
    print("Dashboard: http://localhost:3000/dashboard.html")
    print("\nSay 'Hey Assistant' to activate voice assistant")
    print("Press Ctrl+C to stop the application")
    print("=" * 60)
    
    try:
        # Keep the script running with better monitoring
        print("Monitoring servers... (Press Ctrl+C to stop)")
        while True:
            time.sleep(1)
            # Check if servers are still running
            if backend_process.poll() is not None:
                print("[ERROR] Backend server stopped unexpectedly")
                print("Stopping application...")
                break
            if frontend_process.poll() is not None:
                print("[ERROR] Frontend server stopped unexpectedly")
                print("Stopping application...")
                break
    except KeyboardInterrupt:
        print("\nStopping servers...")
    finally:
        # Clean up
        print("Cleaning up processes...")
        if backend_process:
            backend_process.terminate()
            backend_process.wait(timeout=5)
        if frontend_process:
            frontend_process.terminate()
            frontend_process.wait(timeout=5)
        print("[OK] Application stopped")

if __name__ == "__main__":
    main()
