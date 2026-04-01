# Multi-stage build: React → nginx static server
# Stage 1: build the React app
FROM node:20-alpine AS builder

# Build-time env vars (baked into the JS bundle by CRA)
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_SITE_URL
ARG REACT_APP_NOVA_PROXY_URL

ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_SITE_URL=$REACT_APP_SITE_URL
ENV REACT_APP_NOVA_PROXY_URL=$REACT_APP_NOVA_PROXY_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: nginx to serve the built SPA
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
