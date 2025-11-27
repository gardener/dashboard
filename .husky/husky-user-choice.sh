#!/bin/sh

# Use a fixed file path for the user choice in the .husky folder
HUSKY_USER_CONFIG_FILE=".husky/user-config"
. "$(dirname "$0")/setup-messages.sh"

if [ ! -f "$HUSKY_USER_CONFIG_FILE" ]; then
  show_husky_managed_hooks_setup_message
  exit 1
fi
