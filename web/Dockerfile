FROM node:20-slim

WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
