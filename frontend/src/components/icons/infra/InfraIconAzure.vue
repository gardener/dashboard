<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    viewBox="0 0 24 24"
    :aria-labelledby="iconName"
    role="presentation"
  >
    <title
      :id="iconName"
      lang="en"
    >{{ iconName }} icon</title>
    <g><path d="M13.05,4.24L6.56,18.05L2,18L7.09,9.24L13.05,4.24M13.75,5.33L22,19.76H6.74L16.04,18.1L11.17,12.31L13.75,5.33Z" :fill="color"/></g>
  </svg>
</template>

<script>

export default {
  data () {
    return {
      iconName: 'azure'
    }
  },
  props: {
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    iconColorCode: {
      type: String
    }
  },
  computed: {
    color () {
      return this.iconColorCode || '#2075b8'
    }
  }
}
</script>
