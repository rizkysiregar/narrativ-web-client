# Plain Dockerfile syntax only: the Jenkins agent builds with the legacy builder.
# build/ is made beforehand by the Jenkins "Build" stage (npm run build); the image installs the production
# dependencies and runs the server render with react-router-serve. The API base path is relative (/api/v1), so the
# same image runs in every environment; the environment comes in through env vars (see README).
FROM docker.io/library/node:24-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY build ./build

USER node
EXPOSE 8080
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
