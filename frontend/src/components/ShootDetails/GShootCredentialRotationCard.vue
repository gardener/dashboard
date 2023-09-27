<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Credential Rotation" />
    <g-list>
      <g-credential-tile
        :shoot-item="shootItem"
        type="ALL_CREDENTIALS"
      />
      <v-divider inset />
      <g-credential-tile
        v-if="shootEnableStaticTokenKubeconfig"
        :shoot-item="shootItem"
        type="kubeconfig"
        dense
      />
      <g-credential-tile
        :shoot-item="shootItem"
        type="certificateAuthorities"
        dense
      />
      <g-credential-tile
        v-if="!isTestingCluster"
        :shoot-item="shootItem"
        type="observability"
        dense
      />
      <g-credential-tile
        v-if="hasShootWorkerGroups"
        :shoot-item="shootItem"
        type="sshKeypair"
        dense
      />
      <g-credential-tile
        :shoot-item="shootItem"
        type="etcdEncryptionKey"
        dense
      />
      <g-credential-tile
        :shoot-item="shootItem"
        type="serviceAccountKey"
        dense
      />
    </g-list>
  </v-card>
</template>

<script>
import GCredentialTile from '@/components/GCredentialTile'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GCredentialTile,
  },
  mixins: [shootItem],
}
</script>
