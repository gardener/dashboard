#!/bin/sh
# .husky/husky-user-choice.sh
# Shared logic for handling user choice for managed/custom Husky hooks (POSIX-compliant)

# Use a fixed file path for the user choice in the .husky folder
HUSKY_USER_CONFIG_FILE=".husky/user-config"

if [ ! -f "$HUSKY_USER_CONFIG_FILE" ]; then
  echo ""
  echo "🐶 Husky Managed Git Hooks Setup"
  echo "────────────────────────────────────────────"
  echo ""
  echo "We use 🐶 Husky to centrally manage git hooks for a smoother, more consistent workflow."
  echo "Key checks run automatically before commit/push the same as on our CI pipeline:"
  echo "  • optional: 🦉 ggshield (secret scanning)"
  echo "  • .hack/verify script for: "
  echo "    • linting"
  echo "    • tests (where applicable)"
  echo "    • dependencies check"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
  echo "No user choice found for managed Husky hooks."
  echo ""
  echo "Choose one of the following options:"
  echo "• ✅  To enable the managed Husky git hooks, run:"
  echo "      echo managed_hooks=true > $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "• ⚠️  To use your own hooks (skip managed hooks), run:"
  echo "      echo managed_hooks=false > $HUSKY_USER_CONFIG_FILE && git config --local --unset core.hooksPath"
  echo ""
  echo "You can change this at any time by editing or deleting:"
  echo "• ⚙️  $HUSKY_USER_CONFIG_FILE"
  echo "\nLearn more about Husky: https://typicode.github.io/husky/"
  echo "────────────────────────────────────────────\n"
  exit 1
fi
