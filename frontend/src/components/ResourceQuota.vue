<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex">
    <div class="quota-caption" v-if="!hideCaption">{{resourceQuota.caption}} ({{resourceQuota.resourceName}})</div>
    <div class="quota-progress d-flex align-center flex-grow-1">
      <v-progress-linear :value="resourceQuota.percentage" class="mx-2" :color="progressColor"></v-progress-linear>
      <div class="d-flex flex-shrink-0">{{resourceQuota.usedValue}} / {{resourceQuota.limitValue}}</div>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    resourceQuota: {
      type: Object
    },
    hideCaption: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    progressColor () {
      if (this.resourceQuota.percentage === 100) {
        return 'error'
      }
      if (this.resourceQuota.percentage > 80) {
        return 'warning'
      }
      return 'primary'
    }
  }
}
</script>

<style lang="scss" scoped>
  .quota-caption {
    overflow: hidden;
  }

  .quota-progress {
    min-width: 120px;
  }
</style>
