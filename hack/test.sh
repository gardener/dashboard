# SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
#
# SPDX-License-Identifier: Apache-2.0


# The command to run (defaults to "lint" if no argument is given)
ARG="${1}"

echo "Running \"test${ARG:+ }${ARG}\" in all relevant workspaces..."

yarn workspace @gardener-dashboard/logger run test "${ARG}"
yarn workspace @gardener-dashboard/request run test "${ARG}"
yarn workspace @gardener-dashboard/kube-config run test "${ARG}"
yarn workspace @gardener-dashboard/kube-client run test "${ARG}"
yarn workspace @gardener-dashboard/monitor run test "${ARG}"
