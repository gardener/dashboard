#!/bin/sh

show_ggshield_setup_message() {
  echo ""
  echo "ggshield Secret Scanning Setup"
  echo "────────────────────────────────────────────"
  echo ""
  echo "You can optionally enable ggshield for secret scanning in this project."
  echo "Note: Only enable this if you already have a ggshield (GitGuardian) account and are willing to connect it, or if you are willing to create one."
  echo "More info: https://www.gitguardian.com/ggshield"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
  echo "To set your preference, run one of the following commands:"
  echo ""
  echo "  - To enable ggshield secret scanning:"
  echo "      echo ggshield=true >> $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "  - To disable ggshield secret scanning:"
  echo "      echo ggshield=false >> $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "You can change this at any time by editing or deleting:"
  echo "  $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
}

show_reuse_setup_message() {
  echo ""
  echo "REUSE Compliance Check Setup"
  echo "────────────────────────────────────────────"
  echo ""
  echo "REUSE checks that all files are properly licensed and attributed."
  echo "Learn more: https://reuse.software/"
  echo ""
  echo "To use it, pipx has to be installed."
  echo "If you don't have pipx installed, but want to use reuse in our pre-commit hook,"
  echo "please visit the link below for installation assistance:"
  echo "https://pipx.pypa.io/stable/installation/"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
  echo "To set your preference, run one of the following commands:"
  echo ""
  echo "  - To enable REUSE Compliance scanning:"
  echo "      echo reuse=true >> $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "  - To disable REUSE Compliance scanning:"
  echo "      echo reuse=false >> $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "Edit $HUSKY_USER_CONFIG_FILE to change this later."
  echo ""
  echo "────────────────────────────────────────────"
  echo ""

}

show_husky_managed_hooks_setup_message() {
  # Create default config if it does not exist
  if [ ! -f "$HUSKY_USER_CONFIG_FILE" ]; then
    cat > "$HUSKY_USER_CONFIG_FILE" <<EOF
managed_hooks=true
ggshield=false
reuse=true
EOF
    echo "[husky] Default configuration file created at $HUSKY_USER_CONFIG_FILE with:
     managed_hooks=true,
     ggshield=false,
     reuse=true."
  fi
  echo ""
  echo "Husky Managed Git Hooks Setup"
  echo "────────────────────────────────────────────"
  echo ""
  echo "We use Husky to centrally manage git hooks for a smoother, more consistent workflow."
  echo "Key checks run automatically before commit/push the same as on our CI pipeline:"
  echo "  - optional: ggshield (secret scanning)"
  echo "  - .hack/verify script for: "
  echo "    - linting"
  echo "    - tests (where applicable)"
  echo "    - dependencies check"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
  echo "A default configuration file will be created with the following settings:"
  echo "  - Husky enabled (managed_hooks=true)"
  echo "  - ggshield disabled (ggshield=false)"
  echo "  - reuse enabled (reuse=true)"
  echo ""
  echo "To disable Husky managed hooks and reset your core.hooksPath, run:"
  echo "    echo managed_hooks=false > $HUSKY_USER_CONFIG_FILE && git config --local --unset core.hooksPath"
  echo ""
  echo "To enable or disable ggshield secret scanning, run:"
  echo "    echo ggshield=true >> $HUSKY_USER_CONFIG_FILE   # enable"
  echo "    echo ggshield=false >> $HUSKY_USER_CONFIG_FILE  # disable"
  echo ""
  echo "To enable or disable REUSE Compliance scanning, run:"
  echo "    echo reuse=true >> $HUSKY_USER_CONFIG_FILE   # enable"
  echo "    echo reuse=false >> $HUSKY_USER_CONFIG_FILE  # disable"
  echo ""
  echo "You can change these settings at any time by editing or deleting:"
  echo "  $HUSKY_USER_CONFIG_FILE"
  echo ""
  echo "Learn more about Husky: https://typicode.github.io/husky/"
  echo ""
  echo "────────────────────────────────────────────"
  echo ""
}
