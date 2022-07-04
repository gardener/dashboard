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
        icon="mdi-key"
        title="Rotate All Credentials"
        :shoot-item="shootItem"
        ></credential-tile>
      <v-divider inset></v-divider>
      <credential-tile
        icon="mdi-file"
        title="Rotate Kubeconfig"
        :shoot-item="shootItem"
        type="kubeconfig"
        ></credential-tile>
      <v-divider inset></v-divider>
      <credential-tile
        :color="caColor"
        icon="mdi-file-certificate"
        title="Certificate Authorities"
        :shoot-item="shootItem"
        type="certificateAuthorities"
        >
          <template v-slot:subtitle v-if="!isCACertificateValiditiesAcceptable">
            <v-list-item-subtitle class="d-flex align-center pt-1">
              <shoot-messages :shoot-item="shootItem" :filter="['cacertificatevalidities-constraint']" small class="mr-1" />
              <span color="warning">Certificate Authorities will expire in less than one year</span>
            </v-list-item-subtitle>
          </template>
        </credential-tile>
        <template v-if="shootPurpose!=='testing'">
          <v-divider inset></v-divider>
          <credential-tile
            icon="mdi-developer-board"
            title="Observability Passwords"
            :shoot-item="shootItem"
            type="observability"
          ></credential-tile>
        </template>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-ssh"
          title="SSH Key Pair for Worker Nodes"
          :shoot-item="shootItem"
          type="sshKeypair"
          ></credential-tile>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-database"
          title="ETCD Encryption Key"
          :shoot-item="shootItem"
          type="etcdEncryptionKey"
          ></credential-tile>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-monitor-multiple"
          title="ServiceAccount Token Signing Key"
          :shoot-item="shootItem"
          type="serviceAccountKey"
          ></credential-tile>
    </v-list>
  </v-card>
</template>

<script>
import CredentialTile from '@/components/CredentialTile'
import ShootMessages from '@/components/ShootMessages/ShootMessages'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CredentialTile,
    ShootMessages
  },
  mixins: [shootItem],
  computed: {
    caColor () {
      if (!this.isCACertificateValiditiesAcceptable) {
        return 'warning'
      }
      return undefined
    }
  }
}
</script>
