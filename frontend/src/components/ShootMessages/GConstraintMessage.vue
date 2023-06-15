<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span class="font-weight-bold">{{constraintCaption}}:</span>
    {{constraintMessage}}
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    constraintCaption: {
      type: String,
      required: true,
    },
    constraintMessage: {
      type: String,
      required: true,
    },
  },
})
</script>
