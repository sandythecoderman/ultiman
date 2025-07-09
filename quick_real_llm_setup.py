#!/usr/bin/env python3
"""
Quick Real LLM Integration Setup
This script sets up the system to use real LLM when credentials are available,
with graceful fallback to Enhanced Mock LLM.
"""

import os
import subprocess
import sys
from pathlib import Path

def install_dependencies():
    """Install required dependencies."""
    try:
        print("🔄 Installing python-dotenv...")
        subprocess.run([
            sys.executable, "-m", "pip", "install", "python-dotenv"
        ], cwd="services/agent-service", check=True)
        print("✅ Dependencies installed")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def update_orchestrator():
    """Update orchestrator to use environment variables and better real LLM integration."""
    orchestrator_file = Path("services/agent-service/app/core/orchestrator.py")
    
    # Read current content
    content = orchestrator_file.read_text()
    
    # Add dotenv import if not present
    if "from dotenv import load_dotenv" not in content:
        content = content.replace(
            "import re\nimport os\nfrom typing import List",
            "import re\nimport os\nfrom typing import List\nfrom dotenv import load_dotenv"
        )
        
        # Add load_dotenv call after imports
        content = content.replace(
            "from app.core.enhanced_mock_llm import EnhancedMockLLM",
            "from app.core.enhanced_mock_llm import EnhancedMockLLM\n\n# Load environment variables\nload_dotenv()"
        )
    
    # Update the create_llm_instance function for better real LLM integration
    old_function = """def create_llm_instance():
    \"\"\"
    Create LLM instance with automatic fallback.
    Tries to use real Gemini 2.5 Flash, falls back to Enhanced Mock LLM.
    \"\"\"
    try:
        # Try to import and initialize real LLM
        from langchain_google_vertexai import ChatVertexAI
        
        # Check if we have proper credentials
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        
        if not project_id:
            print("⚠️  GOOGLE_CLOUD_PROJECT not set, falling back to Enhanced Mock LLM")
            return EnhancedMockLLM(), "enhanced_mock\""""
    
    new_function = """def create_llm_instance():
    \"\"\"
    Create LLM instance with automatic fallback.
    Tries to use real Gemini 2.5 Flash, falls back to Enhanced Mock LLM.
    \"\"\"
    # Check if real LLM is explicitly disabled
    if os.environ.get("USE_REAL_LLM", "auto").lower() == "false":
        print("🔄 Real LLM disabled via USE_REAL_LLM=false, using Enhanced Mock LLM")
        return EnhancedMockLLM(), "enhanced_mock"
    
    try:
        # Try to import and initialize real LLM
        from langchain_google_vertexai import ChatVertexAI
        
        # Check if we have proper credentials
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-2.5-flash")
        
        if not project_id:
            print("⚠️  GOOGLE_CLOUD_PROJECT not set, falling back to Enhanced Mock LLM")
            return EnhancedMockLLM(), "enhanced_mock\""""
    
    if old_function in content:
        content = content.replace(old_function, new_function)
    
    # Update the real LLM creation part
    old_llm_creation = """        # Try to create real LLM
        real_llm = ChatVertexAI(
            model_name="gemini-2.5-flash",
            project=project_id,
            temperature=0.1,  # Low temperature for consistent, focused responses
            max_tokens=2048,  # Sufficient for detailed responses
            top_p=0.8,       # Balanced creativity and focus
        )"""
    
    new_llm_creation = """        # Try to create real LLM with environment configuration
        real_llm = ChatVertexAI(
            model_name=model_name,
            project=project_id,
            location=location,
            temperature=float(os.environ.get("LLM_TEMPERATURE", "0.1")),
            max_tokens=int(os.environ.get("LLM_MAX_TOKENS", "2048")),
            top_p=float(os.environ.get("LLM_TOP_P", "0.8")),
        )"""
    
    content = content.replace(old_llm_creation, new_llm_creation)
    
    orchestrator_file.write_text(content)
    print("✅ Orchestrator updated for real LLM integration")

def create_env_file():
    """Create .env file with default configuration."""
    env_content = """# Real LLM Configuration
# Set USE_REAL_LLM=true to enable real LLM when credentials are available
USE_REAL_LLM=auto

# Google Cloud Configuration (set these when you have credentials)
# GOOGLE_CLOUD_PROJECT=your-project-id
# VERTEX_AI_LOCATION=us-central1
# VERTEX_AI_MODEL=gemini-2.5-flash

# LLM Parameters
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2048
LLM_TOP_P=0.8

# Agent Service Configuration
AGENT_VERBOSE=true
"""
    
    env_file = Path("services/agent-service/.env")
    env_file.write_text(env_content)
    print(f"✅ Environment file created: {env_file}")
    return str(env_file)

def create_credentials_setup_guide():
    """Create a guide for setting up Google Cloud credentials."""
    guide_content = """# Google Cloud Credentials Setup Guide

## Option 1: Using Google Cloud CLI (Recommended)

1. **Install Google Cloud CLI**
   ```bash
   # Visit https://cloud.google.com/sdk/docs/install
   # Follow installation instructions for your platform
   ```

2. **Authenticate**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Set Project**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **Enable Vertex AI API**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

5. **Update Environment Variables**
   Edit `services/agent-service/.env`:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   USE_REAL_LLM=true
   ```

## Option 2: Using Service Account Key

1. **Create Service Account**
   - Go to Google Cloud Console
   - Navigate to IAM & Admin > Service Accounts
   - Create new service account with Vertex AI User role

2. **Download Key**
   - Generate and download JSON key file
   - Place it in a secure location

3. **Set Environment Variable**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/key.json
   ```

4. **Update Environment Variables**
   Edit `services/agent-service/.env`:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/key.json
   USE_REAL_LLM=true
   ```

## Testing

After setup, restart the agent service:
```bash
cd services/agent-service
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

Check the logs for:
- ✅ Real LLM (Gemini 2.5 Flash) initialized successfully
- Or ⚠️ messages explaining why it fell back to Enhanced Mock LLM

## Current Status

The system is now configured to:
1. ✅ Use Enhanced Mock LLM by default (works without credentials)
2. ✅ Automatically detect and use real LLM when credentials are available
3. ✅ Provide clear status messages about which LLM is being used
4. ✅ Gracefully handle credential issues

You can use the system immediately with Enhanced Mock LLM, and it will automatically upgrade to real LLM when you set up credentials.
"""
    
    guide_file = Path("REAL_LLM_SETUP_GUIDE.md")
    guide_file.write_text(guide_content)
    print(f"✅ Setup guide created: {guide_file}")

def main():
    """Main setup function."""
    print("🚀 Quick Real LLM Integration Setup")
    print("Setting up the system to use real LLM when credentials are available...")
    
    # Install dependencies
    print("\n📦 Installing Dependencies...")
    if not install_dependencies():
        return False
    
    # Update orchestrator
    print("\n🔧 Updating Orchestrator...")
    update_orchestrator()
    
    # Create environment file
    print("\n⚙️  Creating Environment Configuration...")
    env_file = create_env_file()
    
    # Create setup guide
    print("\n📚 Creating Setup Guide...")
    create_credentials_setup_guide()
    
    print("\n🎉 Quick Setup Complete!")
    print("\n📋 What's Ready:")
    print("✅ System configured for real LLM integration")
    print("✅ Enhanced Mock LLM works immediately (no credentials needed)")
    print("✅ Will automatically use real LLM when credentials are available")
    print("✅ Environment variables configured")
    print("✅ Setup guide created")
    
    print("\n📋 Next Steps:")
    print("1. Restart your agent service to apply changes")
    print("2. System will use Enhanced Mock LLM by default")
    print("3. Follow REAL_LLM_SETUP_GUIDE.md to enable real LLM")
    print("4. Check service logs to see which LLM is being used")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 