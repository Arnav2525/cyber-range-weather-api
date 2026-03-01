FROM node:22-alpine 
# Set the working directory inside the container
WORKDIR /app

# Copy package files first
COPY package*.json ./

RUN npm install
COPY . .
EXPOSE 8080

# Set environment variable so pino-http logging is enabled
ENV NODE_ENV=production

CMD ["npm", "start"]