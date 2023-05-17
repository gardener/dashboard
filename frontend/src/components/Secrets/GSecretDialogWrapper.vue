<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component v-if="visibleDialog" :is="componentName" v-model="visibleDialogState" v-bind="{ secret: selectedSecret, vendor: visibleDialog  }"></component>
</template>

<script>
import { defineComponent } from 'vue'
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
import DeleteDialog from '@/components/Secrets/GSecretDialogDelete'
import HcloudDialog from '@/components/Secrets/GSecretDialogHCloud'
import GenericDialog from '@/components/Secrets/GSecretDialogGeneric'

import upperFirst from 'lodash/upperFirst'
import split from 'lodash/split'
import head from 'lodash/head'

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
  HcloudDialog,
  GenericDialog,
  DeleteDialog,
}

export default defineComponent({
  components,
  data () {
    return {
      visibleDialogState: false,
    }
  },
  props: {
    selectedSecret: {
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
  computed: {
    componentName () {
      switch (this.visibleDialog) {
        case 'google-clouddns':
          return 'GcpDialog'
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
})
</script>
