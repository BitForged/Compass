#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <directory>"
  exit 1
fi

if [ ! -d "$1" ]; then
  echo "Error: '$1' is not a valid directory."
  exit 1
fi

# Read the filenames and format them as a JSON array
files=$(ls -1 "$1" | jq -R . | jq -s -c .)

echo "$files"

echo "$files" > "$1/image-manifest.json"
