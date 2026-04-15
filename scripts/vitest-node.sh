#!/usr/bin/env bash
#
# SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0
#
set -euo pipefail
workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NODE_OPTIONS="--require ${workspace_dir}/.pnp.cjs ${NODE_OPTIONS-}"
exec node "$@"
