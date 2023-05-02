<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <v-container fluid>
    <v-row
      align="center"
      justify="center"
      class="text-center"
      style="min-height: 100vh;"
    >
      <v-col cols="auto">
        {{ message }}, {{ user.id }}
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useToken } from '@/composables/useToken'

const token = useToken()
const user = toRef(token, 'payload')

const message = ref('Welcome')
</script>
