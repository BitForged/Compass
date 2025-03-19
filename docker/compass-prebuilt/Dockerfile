FROM node:23

RUN git clone https://github.com/BitForged/compass.git /compass-build
WORKDIR /compass-build
RUN npm install
COPY compass_env /compass-build/.env
RUN npm run build

FROM caddy:2

COPY --from=0  /compass-build/dist/ /srv/compass/
COPY Caddyfile                      /etc/caddy/Caddyfile
COPY env.sh                         /bin/env.sh
COPY docker-entrypoint.sh           /bin/entrypoint.sh

RUN ["chmod", "+x", "/bin/env.sh"]
RUN ["chmod", "+x", "/bin/entrypoint.sh"]

CMD ["sh", "/bin/entrypoint.sh"]