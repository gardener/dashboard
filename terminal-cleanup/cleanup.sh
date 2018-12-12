#!/bin/sh
#
# Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
echo "Looking for expired dashboard terminal serviceaccounts.."
THRESHOLD=${NO_HEARTBEAT_DELETE_SECONDS-86400}
CURRENTTIMESTAMP="$(date +%s)"
KUBE_TOKEN="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"

SERVICEACCOUNTS="$(curl -sS --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt -H "Authorization: Bearer $KUBE_TOKEN" -H "Accept: application/json" https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_PORT_443_TCP_PORT}/api/v1/serviceaccounts?labelSelector=component%3Ddashboard-terminal%2Csatype%3Dattach -XGET)"
SERVICEACCOUNTSCOUNT="$(echo ${SERVICEACCOUNTS} | jq .items | jq length)"

echo "Found ${SERVICEACCOUNTSCOUNT} dashboard terminal service accounts"
COUNT=0
while [ "${COUNT}" -lt "${SERVICEACCOUNTSCOUNT}" ]
do
  echo "Checking serviceaccount ${SANAME}"

  SERVICEACCOUNT="$(echo ${SERVICEACCOUNTS} | jq .items[${COUNT}])"
  SANAME="$(echo ${SERVICEACCOUNT} | jq -r .metadata.name)"
  SANAMESPACE="$(echo ${SERVICEACCOUNT} | jq -r .metadata.namespace)"
  SAHEARTBEAT="$(echo ${SERVICEACCOUNT} | jq -r .metadata.annotations[\"garden.sapcloud.io/terminal-heartbeat\"])"

  if [ ! -z "${SANAME}" ] && [ ! -z "${SANAMESPACE}" ]; then
    let SASECSWOHEARTBEAT="${CURRENTTIMESTAMP}-${SAHEARTBEAT}"

    if [ "${SASECSWOHEARTBEAT}" -gt "${THRESHOLD}" ]; then
      echo "Did not receive heartbeat signal within ${THRESHOLD} seconds. Deleting serviceaccount ${SANAME}"
      curl -sS --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt -H "Authorization: Bearer ${KUBE_TOKEN}" https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_PORT_443_TCP_PORT}/api/v1/namespaces/${SANAMESPACE}/serviceaccounts/${SANAME} -XDELETE
    fi
  fi
  COUNT=$((${COUNT}+1))
done