FROM node:10

ARG API_URL=https://api.test.rocksolidpoker.net
ARG ENGINE_URL=wss://engine.test.rocksolidpoker.net
ARG TELEGRAM_BOT_NAME=rock_solid_test_bot

ENV ENGINE_URL=$ENGINE_URL
ENV API_URL=$API_URL
ENV TELEGRAM_BOT_NAME=$TELEGRAM_BOT_NAME

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN npm install

# TODO: only bundle the compiled app
# Bundle app source
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000
CMD [ "node", "__sapper__/build" ]
