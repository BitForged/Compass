#!/bin/sh

CADDY_PID=1111 # Use this later to stop Caddy upon SIGINT

stopCaddy() {
  echo "Received stop signal - shutting down Caddy!"
  kill $CADDY_PID
}

# Before starting the web server, run `/bin/env.sh` (see `env.sh` for reasons why) first.
echo "Fixing up environmental variables..."
if ! sh /bin/env.sh; then
  echo "env.sh returned a non-zero exit code - did you forget to pass in the 'COMPASS_APP_' variables?"
  exit 1
fi

trap stopCaddy INT QUIT TERM # Listen to exit signals from Docker

# Kick off Caddy
echo "Starting Caddy!"
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

wait "$CADDY_PID"
echo "Caddy exited. Farewell!"