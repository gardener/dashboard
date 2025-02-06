<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component
    :is="componentName"
    v-if="visibleDialog"
    v-model="visibleDialogState"
    v-bind="{ secretBinding: selectedSecretBinding, providerType: visibleDialog }"
  />
</template>

<script>

import GcpDialog from '@/components/Secrets/GSecretDialogGcp'
import AwsDialog from '@/components/Secrets/GSecretDialogAws'
import AzureDialog from '@/components/Secrets/GSecretDialogAzure'
import OpenstackDialog from '@/components/Secrets/GSecretDialogOpenstack'
import AlicloudDialog from '@/components/Secrets/GSecretDialogAlicloud'
import MetalDialog from '@/components/Secrets/GSecretDialogMetal'
import VsphereDialog from '@/components/Secrets/GSecretDialogVSphere'
import CloudflareDialog from '@/components/Secrets/GSecretDialogCloudflare'
import InfobloxDialog from '@/components/Secrets/GSecretDialogInfoblox'
import NetlifyDialog from '@/components/Secrets/GSecretDialogNetlify'
import DDnsDialog from '@/components/Secrets/GSecretDialogDDns'
import DeleteDialog from '@/components/Secrets/GSecretDialogDelete'
import HcloudDialog from '@/components/Secrets/GSecretDialogHCloud'
import GenericDialog from '@/components/Secrets/GSecretDialogGeneric'

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
  GenericDialog,
  DeleteDialog,
}

export default {
  components,
  props: {
    selectedSecretBinding: {
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
