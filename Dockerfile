# Use a Python version that is stable and has good library support
FROM python:3.11-slim

# Set the PATH to include the directory where pip installs executables
ENV PATH="/root/.local/bin:${PATH}"

# Set the working directory
WORKDIR /app

# Install system-level build tools needed for faiss-cpu and tokenizers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    swig \
    && rm -rf /var/lib/apt/lists/*

# Copy your requirements file
COPY requirements.txt .

# Install your dependencies from requirements.txt
# Using --no-cache-dir helps ensure a clean install
RUN pip install --no-cache-dir --timeout=600 -r requirements.txt

# Copy the rest of your application code
COPY . .

# Command to run your application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 