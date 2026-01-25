#!/usr/bin/env bash

# this is entirely ai generated and has not been checked. i don't know shell scripts

set -e

ensure_linked_file() {
  local src="$1"        # e.g. src/custom.txt
  local cfg="$2"        # e.g. config/custom.txt
  local example="$3"    # e.g. config/custom.example.txt

  # if source already exists (and is not a broken symlink), do nothing
  if [ -e "$src" ]; then
    echo "$src exists, skipping"
    return
  fi

  # remove broken symlinks if they exist
  if [ -L "$src" ]; then
    echo "$src is a broken symlink, removing"
    rm "$src"
  fi

  echo "$src missing, setting it up"

  # ensure directories exist
  mkdir -p "$(dirname "$src")"
  mkdir -p "$(dirname "$cfg")"

  # create config file from example if needed
  # also handle case where Docker created a directory instead of a file (happens when mount source is missing)
  if [ -d "$cfg" ]; then
    echo "$cfg is a directory (Docker artifact?), removing"
    rm -rf "$cfg"
  fi

  if [ ! -e "$cfg" ]; then
    if [ ! -e "$example" ]; then
      echo "ERROR: example file $example does not exist"
      exit 1
    fi

    cp "$example" "$cfg"
    echo "created $cfg from example"
  fi

  # create hard link
  ln "$cfg" "$src"
  echo "linked $src -> $cfg"
}

# ---- ensure custom routes dir exists ----
mkdir -p "src/routes/(custom)"

# ---- usage ----

ensure_linked_file \
  "src/custom.css" \
  "config/custom.css" \
  "config/custom.example.css"

ensure_linked_file \
  "src/components/custom/Home.svelte" \
  "config/Home.svelte" \
  "config/Home.example.svelte"

ensure_linked_file \
  "src/lib/server/config.toml" \
  "config/config.toml" \
  "config/config.example.toml"
