FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm --prefix client install && npm --prefix client run build
EXPOSE 8080
CMD ["node","server/index.js"]
