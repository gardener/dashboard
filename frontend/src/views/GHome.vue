<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->
<template>
  <div>{{ message }}, {{ user.id }}</div>
</template>

<script setup>
  import { ref, toRef } from 'vue'
  import { useToken } from '@/composables/useToken'

  const token = useToken()
  const user = toRef(token, 'payload')

  const message = ref('Welcome')
</script>
