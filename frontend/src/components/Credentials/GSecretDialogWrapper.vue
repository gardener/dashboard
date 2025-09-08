<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="componentName"
    v-if="visibleDialog"
    v-model="visibleDialogState"
    v-bind="{ credentialEntity: selectedCredentialEntity, providerType: visibleDialog }"
  />
</template>

<script>

import GcpDialog from '@/components/Credentials/GSecretDialogGcp'
import AwsDialog from '@/components/Credentials/GSecretDialogAws'
import AzureDialog from '@/components/Credentials/GSecretDialogAzure'
import OpenstackDialog from '@/components/Credentials/GSecretDialogOpenstack'
import AlicloudDialog from '@/components/Credentials/GSecretDialogAlicloud'
import MetalDialog from '@/components/Credentials/GSecretDialogMetal'
import VsphereDialog from '@/components/Credentials/GSecretDialogVSphere'
import CloudflareDialog from '@/components/Credentials/GSecretDialogCloudflare'
import InfobloxDialog from '@/components/Credentials/GSecretDialogInfoblox'
import NetlifyDialog from '@/components/Credentials/GSecretDialogNetlify'
import DDnsDialog from '@/components/Credentials/GSecretDialogDDns'
import DeleteDialog from '@/components/Credentials/GSecretDialogDelete'
import HcloudDialog from '@/components/Credentials/GSecretDialogHCloud'
import PowerdnsDialog from '@/components/Credentials/GSecretDialogPowerdns'
import GenericDialog from '@/components/Credentials/GSecretDialogGeneric'

import head from 'lodash/head'
import split from 'lodash/split'
import upperFirst from 'lodash/upperFirst'

const components = {
  GcpDialog,
  AzureDialog,
  AwsDialog,
  OpenstackDialog,
  AlicloudDialog,
  MetalDialog,
  VsphereDialog,
  CloudflareDialog,
  InfobloxDialog,
  NetlifyDialog,
  DDnsDialog,
  HcloudDialog,
  PowerdnsDialog,
  GenericDialog,
  DeleteDialog,
}

export default {
  components,
  props: {
    selectedCredentialEntity: {
      type: Object,
      required: false,
    },
    visibleDialog: {
      type: String,
      required: false,
    },
  },
  emits: [
    'dialog-closed',
  ],
  data () {
    return {
      visibleDialogState: false,
    }
  },
  computed: {
    componentName () {
      switch (this.visibleDialog) {
        case 'google-clouddns':
          return 'GcpDialog'
        case 'rfc2136':
          return 'DDnsDialog'
        default: {
          const name = upperFirst(head(split(this.visibleDialog, '-')))
          const componentName = `${name}Dialog`
          const componentNames = Object.keys(components)
          if (componentNames.includes(componentName)) {
            return componentName
          }
          return 'GenericDialog'
        }
      }
    },
  },
  watch: {
    visibleDialog (visibleDialog) {
      if (visibleDialog) {
        this.visibleDialogState = true
      }
    },
    visibleDialogState (visibleDialogState) {
      if (!visibleDialogState) {
        this.$emit('dialog-closed')
      }
    },
  },
}
</script>
