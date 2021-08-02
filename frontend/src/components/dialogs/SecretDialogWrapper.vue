<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <component v-if="visibleDialog" :is="componentName" v-bind="{ secret: selectedSecret, vendor: visibleDialog }" v-model="visibleDialogState"></component>
</template>

<script>
import GcpDialog from '@/components/dialogs/SecretDialogGcp'
import AwsDialog from '@/components/dialogs/SecretDialogAws'
import AzureDialog from '@/components/dialogs/SecretDialogAzure'
import OpenstackDialog from '@/components/dialogs/SecretDialogOpenstack'
import AlicloudDialog from '@/components/dialogs/SecretDialogAlicloud'
import MetalDialog from '@/components/dialogs/SecretDialogMetal'
import VsphereDialog from '@/components/dialogs/SecretDialogVSphere'
import CloudflareDialog from '@/components/dialogs/SecretDialogCloudflare'
import InfobloxDialog from '@/components/dialogs/SecretDialogInfoblox'
import NetlifyDialog from '@/components/dialogs/SecretDialogNetlify'
import DeleteDialog from '@/components/dialogs/SecretDialogDelete'
import HcloudDialog from '@/components/dialogs/SecretDialogHCloud'

import upperFirst from 'lodash/upperFirst'
import split from 'lodash/split'
import head from 'lodash/head'

export default {
  components: {
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
    DeleteDialog
  },
  data () {
    return {
      visibleDialogState: false
    }
  },
  props: {
    selectedSecret: {
      type: Object,
      required: false
    },
    visibleDialog: {
      type: String,
      required: false
    }
  },
  computed: {
    componentName () {
      switch (this.visibleDialog) {
        case 'google-clouddns':
          return 'GcpDialog'
        default: {
          const name = upperFirst(head(split(this.visibleDialog, '-')))
          return `${name}Dialog`
        }
      }
    }
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
    }
  }
}
</script>
