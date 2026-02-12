#!/usr/bin/env bash
# Convert source images to ASCII art text files
# Requires: ascii-image-converter (brew install ascii-image-converter)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCES_DIR="$PROJECT_DIR/src/lib/ascii/sources"
PIECES_DIR="$PROJECT_DIR/src/lib/ascii/pieces"

if ! command -v ascii-image-converter &> /dev/null; then
  echo "Error: ascii-image-converter not found."
  echo "Install it with: brew install ascii-image-converter"
  exit 1
fi

shopt -s nullglob
files=("$SOURCES_DIR"/*.{jpg,jpeg,png,webp})
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No source images found in $SOURCES_DIR"
  echo "Add .jpg, .png, or .webp files and re-run."
  exit 0
fi

for file in "${files[@]}"; do
  name="$(basename "$file" | sed 's/\.[^.]*$//')"
  output="$PIECES_DIR/$name.txt"
  echo "Converting: $(basename "$file") -> $name.txt"
  ascii-image-converter "$file" \
    --width 65 \
    --map " .:-=+*#%@" \
    --dither \
    > "$output"
done

echo "Done. Converted ${#files[@]} image(s)."
