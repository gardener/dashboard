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
        :phase="shootStatusCredentialRotationAggregatedPhase"
        initOperation="rotate-credentials-start"
        completionOperation="rotate-credentials-complete"
        ></credential-tile>
      <v-divider inset></v-divider>
      <credential-tile
        icon="mdi-file"
        title="Rotate Kubeconfig"
        :lastInitiationTime="shootStatusCredentialRotationKubeconfig.lastInitiationTime"
        :lastCompletionTime="shootStatusCredentialRotationKubeconfig.lastCompletionTime"
        :shoot-item="shootItem"
        initOperation="rotate-kubeconfig-credentials"
        ></credential-tile>
      <v-divider inset></v-divider>
      <credential-tile
        icon="mdi-file-certificate"
        title="Certificate Authorities"
        :lastInitiationTime="shootStatusCredentialRotationCA.lastInitiationTime"
        :lastCompletionTime="shootStatusCredentialRotationCA.lastCompletionTime"
        :phase="shootStatusCredentialRotationCA.phase"
        :shoot-item="shootItem"
        initOperation="rotate-ca-start"
        completionOperation="rotate-ca-complete"
        ></credential-tile>
        <template v-if="shootPurpose!=='testing'">
          <v-divider inset></v-divider>
          <credential-tile
            icon="mdi-developer-board"
            title="Observability Passwords"
            :lastInitiationTime="shootStatusCredentialRotationObservability.lastInitiationTime"
            :lastCompletionTime="shootStatusCredentialRotationObservability.lastCompletionTime"
            :shoot-item="shootItem"
            initOperation="rotate-observability-credentials"
          ></credential-tile>
        </template>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-ssh"
          title="SSH Key Pair for Worker Nodes"
          :lastInitiationTime="shootStatusCredentialRotationSshKeypair.lastInitiationTime"
          :lastCompletionTime="shootStatusCredentialRotationSshKeypair.lastCompletionTime"
          :shoot-item="shootItem"
          initOperation="rotate-ssh-keypair"
          ></credential-tile>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-database"
          title="ETCD Encryption Key"
          :lastInitiationTime="shootStatusCredentialRotationEtcdEncryptionKey.lastInitiationTime"
          :lastCompletionTime="shootStatusCredentialRotationEtcdEncryptionKey.lastCompletionTime"
          :phase="shootStatusCredentialRotationEtcdEncryptionKey.phase"
          :shoot-item="shootItem"
          initOperation="rotate-etcd-encryption-key-start"
          completionOperation="rotate-etcd-encryption-key-complete"
          ></credential-tile>
        <v-divider inset></v-divider>
        <credential-tile
          icon="mdi-monitor-multiple"
          title="ServiceAccount Token Signing Key"
          :lastInitiationTime="shootStatusCredentialRotationServiceAccountKey.lastInitiationTime"
          :lastCompletionTime="shootStatusCredentialRotationServiceAccountKey.lastCompletionTime"
          :phase="shootStatusCredentialRotationServiceAccountKey.phase"
          :shoot-item="shootItem"
          initOperation="rotate-serviceaccount-key-start"
          completionOperation="rotate-serviceaccount-key-complete"
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
