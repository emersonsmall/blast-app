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
COPY scripts/requirements.txt ./scripts/requirements.txt
RUN pip3 install -r ./scripts/requirements.txt --break-system-packages --target /py/packages

# build final Node.js application
FROM node:latest

WORKDIR /app

ENV PYTHONPATH=/py/packages

# Copy Python packages, system dependencies, and Python from builder
COPY --from=builder /usr/bin/ /usr/bin/
COPY --from=builder /usr/lib/ /usr/lib/
COPY --from=builder /py/packages /py/packages

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

EXPOSE 3000

# Default command to start the API server
CMD [ "node", "server.js" ]