FROM node:25-slim AS builder

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
RUN pip3 install --no-cache-dir -r ./requirements.txt --break-system-packages --target /py/packages \
    && apt-get purge -y python3-pip \
    && apt-get autoremove -y \
    && rm -rf /root/.cache

ENV PYTHONPATH=/py/packages

# Install Node.js dependencies
COPY worker/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy shared source code
COPY src ./src

# Copy worker-specific files
COPY worker/worker.js ./worker/worker.js
COPY worker/blast_workflow.py ./worker/blast_workflow.py

CMD [ "node", "worker/worker.js" ]