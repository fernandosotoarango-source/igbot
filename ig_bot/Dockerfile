FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production || true
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]
