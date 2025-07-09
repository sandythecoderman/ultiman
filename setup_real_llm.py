#!/usr/bin/env python3
"""
Real LLM Integration Setup Script for Ultiman Agent System
This script helps set up Google Cloud Vertex AI integration for Gemini 2.5 Flash.
"""

import os
import subprocess
import sys
import json
from pathlib import Path

def print_step(step_num, title, description=""):
    """Print a formatted step."""
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {title}")
    if description:
        print(f"{description}")
    print(f"{'='*60}")

def check_gcloud_installed():
    """Check if Google Cloud CLI is installed."""
    try:
        result = subprocess.run(['gcloud', '--version'], 
                              capture_output=True, text=True, check=True)
        print("✅ Google Cloud CLI is installed")
        print(result.stdout.split('\n')[0])
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Google Cloud CLI is not installed")
        return False

def check_authentication():
    """Check if user is authenticated with Google Cloud."""
    try:
        result = subprocess.run(['gcloud', 'auth', 'list'], 
                              capture_output=True, text=True, check=True)
        if "ACTIVE" in result.stdout:
            print("✅ Google Cloud authentication is active")
            return True
        else:
            print("❌ No active Google Cloud authentication found")
            return False
    except subprocess.CalledProcessError:
        print("❌ Could not check Google Cloud authentication")
        return False

def get_project_id():
    """Get the current Google Cloud project ID."""
    try:
        result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], 
                              capture_output=True, text=True, check=True)
        project_id = result.stdout.strip()
        if project_id and project_id != "(unset)":
            print(f"✅ Current project: {project_id}")
            return project_id
        else:
            print("❌ No project is set")
            return None
    except subprocess.CalledProcessError:
        print("❌ Could not get project ID")
        return None

def enable_vertex_ai_api(project_id):
    """Enable Vertex AI API for the project."""
    try:
        print("🔄 Enabling Vertex AI API...")
        subprocess.run(['gcloud', 'services', 'enable', 'aiplatform.googleapis.com', 
                       '--project', project_id], check=True)
        print("✅ Vertex AI API enabled")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to enable Vertex AI API")
        return False

def setup_application_default_credentials():
    """Set up Application Default Credentials."""
    try:
        print("🔄 Setting up Application Default Credentials...")
        print("This will open a browser window for authentication...")
        subprocess.run(['gcloud', 'auth', 'application-default', 'login'], check=True)
        print("✅ Application Default Credentials set up")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to set up Application Default Credentials")
        return False

def create_env_file(project_id):
    """Create .env file with Google Cloud configuration."""
    env_content = f"""# Google Cloud Configuration for Real LLM Integration
GOOGLE_CLOUD_PROJECT={project_id}
GOOGLE_APPLICATION_CREDENTIALS=""  # Will be set automatically by gcloud auth application-default login

# Vertex AI Configuration
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.5-flash

# Agent Service Configuration
USE_REAL_LLM=true
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2048
LLM_TOP_P=0.8
"""
    
    env_file = Path("services/agent-service/.env")
    env_file.write_text(env_content)
    print(f"✅ Environment file created: {env_file}")
    return str(env_file)

def update_orchestrator_for_real_llm():
    """Update the orchestrator to use environment variables."""
    orchestrator_file = Path("services/agent-service/app/core/orchestrator.py")
    
    # Read current content
    content = orchestrator_file.read_text()
    
    # Add environment variable loading at the top
    if "from dotenv import load_dotenv" not in content:
        # Add imports
        import_section = """import re
import os
from typing import List
from dotenv import load_dotenv
from app.core.prompt_assembler import DynamicPromptAssembler
from app.tools.base import BaseTool
from app.core.enhanced_mock_llm import EnhancedMockLLM

# Load environment variables
load_dotenv()"""
        
        # Replace the import section
        lines = content.split('\n')
        new_lines = []
        import_done = False
        
        for line in lines:
            if line.startswith('import') or line.startswith('from'):
                if not import_done:
                    new_lines.extend(import_section.split('\n'))
                    import_done = True
                    continue
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
    
    # Update the create_llm_instance function to use environment variables
    if "os.environ.get(\"USE_REAL_LLM\")" not in content:
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
    if os.environ.get("USE_REAL_LLM", "false").lower() == "false":
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
        
        content = content.replace(old_function, new_function)
    
    orchestrator_file.write_text(content)
    print("✅ Orchestrator updated for real LLM integration")

def install_dependencies():
    """Install required dependencies."""
    try:
        print("🔄 Installing python-dotenv for environment variable management...")
        subprocess.run([sys.executable, "-m", "pip", "install", "python-dotenv"], 
                      cwd="services/agent-service", check=True)
        print("✅ Dependencies installed")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def test_real_llm_integration(project_id):
    """Test the real LLM integration."""
    test_script = f"""
import os
import sys
sys.path.append('services/agent-service')

os.environ['GOOGLE_CLOUD_PROJECT'] = '{project_id}'
os.environ['USE_REAL_LLM'] = 'true'

from app.core.orchestrator import create_llm_instance

try:
    llm, llm_type = create_llm_instance()
    print(f"✅ LLM Integration Test: {{llm_type}}")
    
    if llm_type == "real_llm":
        print("🎉 Real LLM (Gemini 2.5 Flash) is working!")
    else:
        print("⚠️  Fell back to Enhanced Mock LLM")
        
except Exception as e:
    print(f"❌ LLM Integration Test Failed: {{e}}")
"""
    
    try:
        result = subprocess.run([sys.executable, "-c", test_script], 
                              capture_output=True, text=True, check=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Test failed: {e.stderr}")
        return False

def main():
    """Main setup function."""
    print("🚀 Real LLM Integration Setup for Ultiman Agent System")
    print("This script will help you set up Google Cloud Vertex AI integration.")
    
    # Step 1: Check Google Cloud CLI
    print_step(1, "Checking Google Cloud CLI Installation")
    if not check_gcloud_installed():
        print("\n📋 To install Google Cloud CLI:")
        print("1. Visit: https://cloud.google.com/sdk/docs/install")
        print("2. Follow the installation instructions for your platform")
        print("3. Run: gcloud init")
        return False
    
    # Step 2: Check Authentication
    print_step(2, "Checking Google Cloud Authentication")
    if not check_authentication():
        print("\n📋 To authenticate with Google Cloud:")
        print("1. Run: gcloud auth login")
        print("2. Follow the browser authentication flow")
        return False
    
    # Step 3: Get Project ID
    print_step(3, "Getting Google Cloud Project ID")
    project_id = get_project_id()
    if not project_id:
        print("\n📋 To set up a project:")
        print("1. Visit: https://console.cloud.google.com/")
        print("2. Create a new project or select an existing one")
        print("3. Run: gcloud config set project YOUR_PROJECT_ID")
        return False
    
    # Step 4: Enable Vertex AI API
    print_step(4, "Enabling Vertex AI API")
    if not enable_vertex_ai_api(project_id):
        return False
    
    # Step 5: Set up Application Default Credentials
    print_step(5, "Setting up Application Default Credentials")
    if not setup_application_default_credentials():
        return False
    
    # Step 6: Install Dependencies
    print_step(6, "Installing Required Dependencies")
    if not install_dependencies():
        return False
    
    # Step 7: Create Environment File
    print_step(7, "Creating Environment Configuration")
    env_file = create_env_file(project_id)
    
    # Step 8: Update Orchestrator
    print_step(8, "Updating Agent Orchestrator")
    update_orchestrator_for_real_llm()
    
    # Step 9: Test Integration
    print_step(9, "Testing Real LLM Integration")
    if test_real_llm_integration(project_id):
        print("\n🎉 SUCCESS! Real LLM integration is set up and working!")
        print(f"\n📋 Next Steps:")
        print(f"1. Restart your agent service")
        print(f"2. The system will now use Gemini 2.5 Flash for real LLM responses")
        print(f"3. To disable real LLM, set USE_REAL_LLM=false in {env_file}")
        return True
    else:
        print("\n❌ Integration test failed. Please check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 