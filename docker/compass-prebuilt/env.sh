#!/bin/sh

# Pulled from https://dev.to/sanjayttg/dynamic-environment-variables-for-dockerized-react-apps-5bc5
# Used to update what would normally go in `.env` for Compass - but since these are baked in at build-time
#   rather than runtime (a limitation of how Vite works), using a pre-built container requires a workaround such as this.
# This isn't required for users who build the container themselves, since the variables are known at build-time.
# This effectively edits all of what *would* be in the `.env` file to runtime definable variables.

# Generate sed script file
sed_script="/tmp/sed_script.sed"
# shellcheck disable=SC2188
> "$sed_script"

# Ensure the sed script file is cleaned up on exit
trap 'rm -f "$sed_script"' EXIT

# Extract COMPASS_APP_ environment variables and build the sed expression
env | grep '^COMPASS_APP_' | while IFS='=' read -r key value; do
    # Escape slashes and other special characters in key and value
    escaped_key=$(printf '%s' "$key" | sed 's/[\/&]/\\&/g')
    escaped_value=$(printf '%s' "$value" | sed 's/[\/&]/\\&/g')
    echo "$key => $value"
    # Append to sed script file
    echo "s|${escaped_key}|${escaped_value}|g;" >> "$sed_script"
done

# Check if the sed script file was created and is not empty
if [ ! -s "$sed_script" ]; then
    echo "No COMPASS_APP_ environment variables found. Exiting with error."
    exit 1
fi

# sed All files
find /srv/compass -type f -exec sed -i -f "$sed_script" '{}' +