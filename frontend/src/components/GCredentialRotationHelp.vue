<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-action-button
    icon="mdi-help-circle-outline"
    color="toolbar-title"
    class="mr-4"
    @click="showDialog"
  >
    <template #tooltip>
      <span>Help</span>
    </template>
  </g-action-button>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Ok"
    cancel-button-text=""
    width="600"
  >
    <template #caption>
      Credential Rotation Help
    </template>
    <template #content>
      <v-card-text>
        There are a lot of different credentials for Shoots to make sure that the various components can communicate with each other and to make sure it is usable and operable.<br>
        <g-external-link url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot_credentials_rotation.md">
          This page
        </g-external-link>
        explains how the varieties of credentials can be rotated so that the cluster can be considered secure.
      </v-card-text>
    </template>
  </g-dialog>
</template>

<script>
import GDialog from '@/components/dialogs/GDialog.vue'
import GActionButton from '@/components/GActionButton.vue'

export default {
  components: {
    GDialog,
    GActionButton,
  },
  methods: {
    showDialog () {
      this.$refs.gDialog.showDialog()
    },
  },
}
</script>
