<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Credential Rotation" />
    <g-list>
      <g-credential-tile
        :shoot-item="shootItem"
        type="ALL_CREDENTIALS"
      ></g-credential-tile>
      <v-divider inset></v-divider>
      <g-credential-tile
        v-if="shootEnableStaticTokenKubeconfig"
        :shoot-item="shootItem"
        type="kubeconfig"
        dense
      ></g-credential-tile>
      <g-credential-tile
        :shoot-item="shootItem"
        type="certificateAuthorities"
        dense
      ></g-credential-tile>
      <template v-if="!isTestingCluster">
        <g-credential-tile
          icon="mdi-developer-board"
          :shoot-item="shootItem"
          type="observability"
          dense
        ></g-credential-tile>
      </template>
      <g-credential-tile
        :shoot-item="shootItem"
        type="sshKeypair"
        dense
      ></g-credential-tile>
      <g-credential-tile
        :shoot-item="shootItem"
        type="etcdEncryptionKey"
        dense
      ></g-credential-tile>
      <g-credential-tile
        :shoot-item="shootItem"
        type="serviceAccountKey"
        dense
      ></g-credential-tile>
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
