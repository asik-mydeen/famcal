FROM node:20-alpine
WORKDIR /app
# Copy entire server directory (package.json + index.js) and api handlers
COPY server/ ./server/
COPY api/ ./api/
# Install server dependencies
RUN cd server && npm install --production
WORKDIR /app/server
EXPOSE 3001
CMD ["node", "index.js"]
