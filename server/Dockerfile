FROM node:25-slim

WORKDIR /app

# Install Node.js dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy shared source code
COPY src ./src

# Copy server-specific files
COPY server ./server

EXPOSE 3000

CMD [ "node", "server/server.js" ]