# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for building Faiss from source
# python3-dev is required for the Python C headers (Python.h)
# numpy must be installed before building faiss
# gflags and glog are required by faiss for its tests and some modules
RUN apt-get update && apt-get install -y git swig build-essential cmake libopenblas-dev python3-dev libgflags-dev libgoogle-glog-dev && \
    pip install --upgrade pip setuptools && \
    pip install numpy && \
    rm -rf /var/lib/apt/lists/*

# Clone, build, and install Faiss from source
# We also disable the tests to avoid pulling in more dependencies like gtest
RUN git clone https://github.com/facebookresearch/faiss.git && \
    cd faiss && \
    cmake -B build -DFAISS_ENABLE_GPU=OFF -DFAISS_ENABLE_PYTHON=ON -DFAISS_BUILD_TESTS=OFF . && \
    make -C build -j$(nproc) && \
    make -C build install && \
    cd build/faiss/python && \
    python setup.py install

# Copy the requirements file into the container
COPY requirements.txt .

# Install the rest of the application's dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run uvicorn server
# The host 0.0.0.0 is important to make it accessible from outside the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 