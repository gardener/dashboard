<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Credential Rotation</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <credential-tile
        title="Rotate All Credentials"
        :shoot-item="shootItem"
        ></credential-tile>
      <v-divider inset></v-divider>
      <credential-tile
        v-if="shootEnableStaticTokenKubeconfig"
        title="Kubeconfig"
        :shoot-item="shootItem"
        type="kubeconfig"
        dense
        ></credential-tile>
      <credential-tile
        title="Certificate Authorities"
        :shoot-item="shootItem"
        type="certificateAuthorities"
        dense
        ></credential-tile>
        <template v-if="!isTestingCluster">
          <credential-tile
            icon="mdi-developer-board"
            title="Observability Passwords"
            :shoot-item="shootItem"
            type="observability"
            dense
          ></credential-tile>
        </template>
          <credential-tile
          title="SSH Key Pair for Worker Nodes"
          :shoot-item="shootItem"
          type="sshKeypair"
          dense
          ></credential-tile>
          <credential-tile
          title="ETCD Encryption Key"
          :shoot-item="shootItem"
          type="etcdEncryptionKey"
          dense
          ></credential-tile>
          <credential-tile
          title="ServiceAccount Token Signing Key"
          :shoot-item="shootItem"
          type="serviceAccountKey"
          dense
          ></credential-tile>
    </v-list>
  </v-card>
</template>

<script>
import CredentialTile from '@/components/CredentialTile'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CredentialTile
  },
  mixins: [shootItem]
}
</script>
