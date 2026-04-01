FROM node:20-alpine
WORKDIR /app
# Install deps at root so both server/ and api/ can resolve them
COPY server/package*.json ./
RUN npm install --production
# Copy source
COPY server/ ./server/
COPY api/ ./api/
EXPOSE 3001
CMD ["node", "server/index.js"]
