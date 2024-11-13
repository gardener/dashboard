<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Credential Rotation">
      <template #append>
        <g-credential-rotation-help />
      </template>
    </g-toolbar>
    <g-list>
      <g-credential-tile
        type="ALL_CREDENTIALS"
      />
      <v-divider inset />
      <g-credential-tile
        v-if="shootEnableStaticTokenKubeconfig"
        type="kubeconfig"
        dense
      />
      <g-credential-tile
        type="certificateAuthorities"
        dense
      />
      <g-credential-tile
        v-if="!isTestingCluster"
        type="observability"
        dense
      />
      <g-credential-tile
        v-if="hasShootWorkerGroups && sshAccessEnabled"
        type="sshKeypair"
        dense
      />
      <g-credential-tile
        type="etcdEncryptionKey"
        dense
      />
      <g-credential-tile
        type="serviceAccountKey"
        dense
      />
    </g-list>
  </v-card>
</template>

<script setup>
import GCredentialTile from '@/components/GCredentialTile'
import GCredentialRotationHelp from '@/components/GCredentialRotationHelp'

import { useShootItem } from '@/composables/useShootItem'

const {
  shootEnableStaticTokenKubeconfig,
  isTestingCluster,
  hasShootWorkerGroups,
  sshAccessEnabled,
} = useShootItem()
</script>
