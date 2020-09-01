FROM node:12

WORKDIR /usr/src/app

# Instal deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

RUN npm run build

EXPOSE 4999
CMD [ "node", "dist/index.js" ]