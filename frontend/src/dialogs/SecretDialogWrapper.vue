<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <div>
    <aws-dialog v-model="dialogState.aws.visible" :secret="selectedSecret"></aws-dialog>
    <aws-help-dialog v-model="dialogState.aws.help"></aws-help-dialog>

    <azure-dialog v-model="dialogState.azure.visible" :secret="selectedSecret"></azure-dialog>
    <azure-help-dialog v-model="dialogState.azure.help"></azure-help-dialog>

    <gcp-dialog v-model="dialogState.gcp.visible" :secret="selectedSecret"></gcp-dialog>
    <gcp-help-dialog v-model="dialogState.gcp.help"></gcp-help-dialog>

    <openstack-dialog v-model="dialogState.openstack.visible" :secret="selectedSecret"></openstack-dialog>
    <openstack-help-dialog v-model="dialogState.openstack.help"></openstack-help-dialog>

    <alicloud-dialog v-model="dialogState.alicloud.visible" :secret="selectedSecret"></alicloud-dialog>
    <alicloud-help-dialog v-model="dialogState.alicloud.help"></alicloud-help-dialog>
  </div>
</template>

<script>
import GcpDialog from '@/dialogs/SecretDialogGcp'
import GcpHelpDialog from '@/dialogs/SecretDialogGcpHelp'
import AwsHelpDialog from '@/dialogs/SecretDialogAwsHelp'
import AwsDialog from '@/dialogs/SecretDialogAws'
import AzureDialog from '@/dialogs/SecretDialogAzure'
import AzureHelpDialog from '@/dialogs/SecretDialogAzureHelp'
import OpenstackDialog from '@/dialogs/SecretDialogOpenstack'
import OpenstackHelpDialog from '@/dialogs/SecretDialogOpenstackHelp'
import AlicloudDialog from '@/dialogs/SecretDialogAlicloud'
import AlicloudHelpDialog from '@/dialogs/SecretDialogAlicloudHelp'

export default {
  name: 'secret-dialog-wrapper',
  components: {
    GcpDialog,
    GcpHelpDialog,
    AzureHelpDialog,
    AzureDialog,
    AwsDialog,
    AwsHelpDialog,
    OpenstackDialog,
    OpenstackHelpDialog,
    AlicloudDialog,
    AlicloudHelpDialog
  },
  props: {
    dialogState: {
      type: Object,
      required: true
    },
    selectedSecret: {
      type: Object
    }
  }
}
</script>
