# Plain Dockerfile syntax only: the Jenkins agent builds with the legacy builder.
# build/ is made beforehand by the Jenkins "Build" stage (npm run build); the image only serves files.
# The API base path is relative (/api/v1), so the same image runs in every environment.
FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY build/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY build/client/ /usr/share/nginx/html/

EXPOSE 8080
