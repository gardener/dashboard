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
        There are many different credentials for Shoots to ensure that various components can communicate with each other and to make sure they are usable and operable.<br>
        <g-external-link url="https://github.com/gardener/gardener/blob/master/docs/usage/shoot-operations/shoot_credentials_rotation.md">
          This page
        </g-external-link>
        explains how these credentials can be rotated to ensure the cluster's security.
      </v-card-text>
    </template>
  </g-generic-action-button-dialog>
</template>

<script setup>

import GGenericActionButtonDialog from '@/components/dialogs/GGenericActionButtonDialog.vue'

</script>
