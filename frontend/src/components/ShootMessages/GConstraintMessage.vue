<!--
SPDX-FileCopyrightText: Copyright Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <span class="font-weight-bold">{{ constraintCaption }}:</span>
    {{ constraintMessage }}
  </div>
</template>

<script>
export default {
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
}
</script>
