# Build environment with necessary dependencies
FROM node:latest AS builder

# Create app directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ncbi-blast+ \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN mkdir -p /py/packages
COPY worker/requirements.txt ./requirements.txt
RUN pip3 install -r ./requirements.txt --break-system-packages --target /py/packages

# Build final Node.js application
FROM node:latest

WORKDIR /app

ENV PYTHONPATH=/py/packages

# Copy Python packages, system dependencies, and Python from builder
COPY --from=builder /usr/bin/ /usr/bin/
COPY --from=builder /usr/lib/ /usr/lib/
COPY --from=builder /py/packages /py/packages

# Install Node.js dependencies
COPY worker/package*.json ./
RUN npm install

# Copy shared source code
COPY src ./src

# Copy worker-specific files
COPY worker/worker.js ./worker/worker.js
COPY worker/blast_workflow.py ./worker/blast_workflow.py

CMD [ "node", "worker/worker.js" ]