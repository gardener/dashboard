#!/bin/sh
# .husky/husky-user-choice.sh
# Shared logic for handling user choice for managed/custom Husky hooks (POSIX-compliant)

# Use a fixed file path for the user choice in the .husky folder
HUSKY_MANAGED_HOOKS_ENABLED_FILE=".husky/managed-hooks-enabled"

if [ ! -f "$HUSKY_MANAGED_HOOKS_ENABLED_FILE" ]; then
  echo "\n"
  echo "🐶 Husky Managed Git Hooks Setup"
  echo "────────────────────────────────────────────"
  echo "No user choice found for managed Husky hooks."
  echo "\n"
  echo "Choose one of the following options:"
  echo "• ✅  To enable the managed Husky git hooks, run:"
  echo "      echo true > $HUSKY_MANAGED_HOOKS_ENABLED_FILE"
  echo "\n"
  echo "• ⚠️  To use your own hooks (skip managed hooks), run:"
  echo "      echo false > $HUSKY_MANAGED_HOOKS_ENABLED_FILE && git config --local --unset core.hooksPath"
  echo "\n"
  echo "You can change this at any time by editing or deleting:"
  echo "• ⚙️  $HUSKY_MANAGED_HOOKS_ENABLED_FILE"
  echo "\nLearn more about Husky: https://typicode.github.io/husky/"
  echo "────────────────────────────────────────────\n"
  exit 1
fi
