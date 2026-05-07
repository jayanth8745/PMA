#!/usr/bin/env python3
"""
Test script to verify chat assistant and voice assistant fixes
"""

import requests
import time
import json

def test_backend_connection():
    """Test backend health endpoint"""
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_chat_assistant():
    """Test chat assistant endpoint"""
    try:
        response = requests.post(
            "http://localhost:5000/api/chat",
            json={"message": "Hello, how are you?"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            if reply and len(reply) > 10:
                print(f"✅ Chat assistant working: {reply[:50]}...")
                return True
            else:
                print("❌ Chat assistant returned empty reply")
                return False
        else:
            print(f"❌ Chat assistant returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Chat assistant test failed: {e}")
        return False

def test_voice_assistant():
    """Test voice assistant endpoint"""
    try:
        response = requests.post(
            "http://localhost:5000/api/voice-assistant",
            json={
                "transcript": "Hey Assistant what time is it",
                "activated": True,
                "wake_phrase": "Hey Assistant"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            activated = data.get("activated", False)
            
            if activated and reply and len(reply) > 10:
                print(f"✅ Voice assistant working: {reply[:50]}...")
                return True
            else:
                print("❌ Voice assistant returned invalid response")
                return False
        else:
            print(f"❌ Voice assistant returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Voice assistant test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 Testing Voice Assistant Fixes")
    print("=" * 60)
    
    tests = [
        ("Backend Connection", test_backend_connection),
        ("Chat Assistant", test_chat_assistant),
        ("Voice Assistant", test_voice_assistant),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        result = test_func()
        results.append((test_name, result))
        time.sleep(1)  # Small delay between tests
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20} : {status}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! The fixes are working correctly.")
    else:
        print("⚠️  Some tests failed. Check the backend server and try again.")
    
    print("\n💡 Next steps:")
    print("1. Open http://localhost:3000/dashboard.html in browser")
    print("2. Test chat assistant in the browser")
    print("3. Say 'Hey Assistant' to test voice assistant")
    print("4. Check that 3D sphere only appears when wake word is detected")

if __name__ == "__main__":
    main()
