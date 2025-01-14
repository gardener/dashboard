# SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0


# The command to run (defaults to "lint" if no argument is given)
CMD="${1:-lint}"

echo "Running \"${CMD}\" in all relevant workspaces..."

yarn workspace @gardener-dashboard/logger run "${CMD}"
yarn workspace @gardener-dashboard/request run "${CMD}"
yarn workspace @gardener-dashboard/kube-config run "${CMD}"
yarn workspace @gardener-dashboard/kube-client run "${CMD}"
yarn workspace @gardener-dashboard/monitor run "${CMD}"
