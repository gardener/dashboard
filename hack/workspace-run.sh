# SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

#!/bin/sh

CMD="$1"
if [[ -z "$CMD" ]]; then
  echo "ERROR: No command provided. Please specify either 'lint' or 'test' (e.g., './workspace-run.sh lint')."
  exit 1
fi

# Shift away the first argument (the command),
# so that $@ now holds any additional arguments.
shift

WORKSPACES="
@gardener-dashboard/logger
@gardener-dashboard/request
@gardener-dashboard/kube-config
@gardener-dashboard/kube-client
@gardener-dashboard/monitor
"
case "$CMD" in
  lint|lint-sarif|test)
    echo "Running \"${CMD}${@:+ }${@}\" in all relevant workspaces..."
    for ws in $WORKSPACES; do
      yarn workspace "$ws" run "$CMD" "$@"
    done
    ;;
  *)
    echo "ERROR: Unknown command \"$CMD\". Supported commands: lint, lint-sarif, test."
    exit 1
    ;;
esac
