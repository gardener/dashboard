#!/bin/sh

show_husky_managed_hooks_setup_message() {
  # Create default config if it does not exist
  if [ ! -f "$HUSKY_USER_CONFIG_FILE" ]; then
    cat > "$HUSKY_USER_CONFIG_FILE" <<EOF

managed_hooks=true

# User configuration template for Husky managed hooks
#
# ggshield Secret Scanning Setup
# ────────────────────────────────────────────
# You can optionally enable ggshield for secret scanning in this project.
# Note: Only enable this if you already have a ggshield (GitGuardian) account and are willing to connect it, or if you are willing to create one.
# More info: https://www.gitguardian.com/ggshield
ggshield=false

# REUSE Compliance Check Setup
# ────────────────────────────────────────────
# REUSE checks that all files are properly licensed and attributed.
# Learn more: https://reuse.software/
# To use it, pipx has to be installed.
# If you don't have pipx installed, but want to use reuse in our pre-commit hook,
# please visit the link below for installation assistance:
# https://pipx.pypa.io/stable/installation/
reuse=false
verify_on_push=true
EOF
    echo ""
    echo "[husky] Default configuration file created at $HUSKY_USER_CONFIG_FILE with:
     managed_hooks=true,
     ggshield=false,
     reuse=false,
     verify_on_push=true."
  fi
  echo ""
  echo "Husky Managed Git Hooks Setup"
  echo "────────────────────────────────────────────"
  echo ""
  echo "We use Husky to centrally manage git hooks for a smoother, more consistent workflow."
  echo "Key checks run automatically before commit/push the same as on our CI pipeline:"
  echo "  - optional: ggshield (secret scanning)"
  echo "  - optional: reuse (license compliance)"
  echo "  - optional: .hack/verify script for: "
  echo "    - linting"
  echo "    - tests (where applicable)"
  echo "    - dependencies check"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
  echo "A default configuration file will be created with the following settings:"
  echo "  - Husky enabled (managed_hooks=true)"
  echo "  - ggshield disabled (ggshield=false)"
  echo "  - reuse disabled (reuse=false)"
  echo "  - verify script on pre-push disabled (verify_on_push=true)"
  echo ""
  echo "To disable Husky managed hooks and reset your core.hooksPath, run:"
  echo "    echo managed_hooks=false > $HUSKY_USER_CONFIG_FILE && git config --local --unset core.hooksPath"
  echo ""
  echo "To change any other settings, edit the following file manually:"
  echo "  $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "Learn more about Husky: https://typicode.github.io/husky/"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
}
