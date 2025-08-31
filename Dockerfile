# Build environment with necessary dependencies
FROM node:18-slim AS builder

# Create app directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ncbi-blast+ \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY scripts/requirements.txt ./scripts/requirements.txt
RUN pip3 install -r ./scripts/requirements.txt

# build final Node.js application
FROM node:18-slim

WORKDIR /app

COPY --from=builder /usr/bin/ /usr/bin/
COPY --from=builder /usr/lib/ /usr/lib/

# set environment variables for BLAST
ENV BLASTDB=/app/data/blastdb
ENV PATH="/usr/bin:${PATH}"

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Create directory for persistent data
RUN mkdir -p /app/data/blastdb

EXPOSE 3000

CMD [ "node", "server.js" ]


