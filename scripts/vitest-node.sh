#!/usr/bin/env bash
set -euo pipefail
workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NODE_OPTIONS="--require ${workspace_dir}/.pnp.cjs ${NODE_OPTIONS-}"
exec node "$@"
