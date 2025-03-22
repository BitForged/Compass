FROM node:23

WORKDIR /compass-build

COPY src/                         /compass-build/src
COPY public                       /compass-build/public
COPY package*.json                /compass-build/
COPY index.html                   /compass-build/
COPY jsconfig.json                /compass-build/
COPY postcss.config.js            /compass-build/
COPY tailwind.config.js           /compass-build/
COPY vite.config.js               /compass-build/
COPY .docker-prebuilt/compass_env /compass-build/.env

RUN npm install
RUN ls -alh
RUN npm run build

FROM caddy:2

COPY --from=0  /compass-build/dist/ /srv/compass/
COPY ./.docker-prebuilt/Caddyfile                      /etc/caddy/Caddyfile
COPY ./.docker-prebuilt/env.sh                         /bin/env.sh
COPY ./.docker-prebuilt/docker-entrypoint.sh           /bin/entrypoint.sh

RUN ["chmod", "+x", "/bin/env.sh"]
RUN ["chmod", "+x", "/bin/entrypoint.sh"]

CMD ["sh", "/bin/entrypoint.sh"]