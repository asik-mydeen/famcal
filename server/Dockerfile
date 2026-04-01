FROM node:20-alpine
WORKDIR /app
# Copy server files
COPY server/package.json ./server/
COPY api/ ./api/
# Install server dependencies
RUN cd server && npm install --production
WORKDIR /app/server
EXPOSE 3001
CMD ["node", "index.js"]
