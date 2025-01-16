#!/bin/sh

# SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0

CMD="$1"
if [[ -z "$CMD" ]]; then
  echo "ERROR: No command provided. Please specify either 'lint', 'lint-sarif' or 'test' (e.g., './workspace-run.sh lint')."
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
@gardener-dashboard/backend
@gardener-dashboard/frontend
"
case "$CMD" in
  lint|lint-sarif|test)
    for ws in $WORKSPACES; do
      echo "Executing: yarn workspace \"$ws\" run $CMD $@"
      yarn workspace "$ws" run "$CMD" "$@"
    done
    ;;
  *)
    echo "ERROR: Unknown command \"$CMD\". Supported commands: lint, lint-sarif, test."
    exit 1
    ;;
esac
