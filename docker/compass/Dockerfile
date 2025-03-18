FROM node:23

RUN git clone https://github.com/BitForged/compass.git /compass-build
WORKDIR /compass-build
RUN npm install
COPY compass_env /compass-build/.env
RUN npm run build

FROM caddy:2

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=0 /compass-build/dist/ /srv/compass/