command_exists () {
  command -v "$1" >/dev/null 2>&1
}

# https://typicode.github.io/husky/troubleshoot.html#yarn-on-windows
# Workaround for Windows 10, Git Bash, and Yarn
if command_exists winpty && test -t 1; then
  exec < /dev/tty
fi
