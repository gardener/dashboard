<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-generic-action-button-dialog
    icon="mdi-help-circle-outline"
    color="toolbar-title"
    class="mr-4"
    caption="Credential Rotation Help"
    can-perform-action
    cancel-button-text=""
    confirm-button-text="Close"
  >
    <template #tooltip>
      <span>Help</span>
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
  </g-generic-action-button-dialog>
</template>

<script setup>

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog.vue'

</script>
