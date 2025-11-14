FROM docker.io/library/nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
