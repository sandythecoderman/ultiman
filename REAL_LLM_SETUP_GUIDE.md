# Google Cloud Credentials Setup Guide

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