#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, 'backend')

# Set PORT environment variable
os.environ['PORT'] = '8000'

# Test if app can be imported and started
try:
    from backend.app import app
    print("✅ App imported successfully")
    
    # Test basic endpoint
    import requests
    import uvicorn
    from threading import Thread
    import time
    
    def run_server():
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")
    
    # Start server in background
    thread = Thread(target=run_server, daemon=True)
    thread.start()
    time.sleep(2)
    
    # Test root endpoint
    response = requests.get("http://localhost:8000/")
    if response.status_code == 200:
        print("✅ Server is running correctly")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Server responded with status: {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()