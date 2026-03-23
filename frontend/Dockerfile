# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Environment variables for build time
ENV VITE_API_URL=/api
ARG VITE_DISABLE_SIGNIN=true
ENV VITE_DISABLE_SIGNIN=$VITE_DISABLE_SIGNIN

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]