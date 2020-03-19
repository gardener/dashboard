<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-tooltip top>
    <template slot="activator">
      <v-icon v-if="isStatusHibernated" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-sleep</v-icon>
      <v-icon v-else-if="isOverallStatusOk" class="vertical-align-middle cursor-pointer status-icon-check" color="success">mdi-check-circle-outline</v-icon>
      <v-icon v-else class="vertical-align-middle cursor-pointer status-icon" color="error">mdi-alert-outline</v-icon>
    </template>
    <div>{{ tooltipText }}</div>
  </v-tooltip>
</template>

<script>
import get from 'lodash/get'

export default {
  props: {
    operation: {
      type: Object,
      required: true
    },
    shootDeleted: {
      type: Boolean,
      required: true
    },
    conditions: {
      type: Array,
      required: true
    },
    isStatusHibernated: {
      type: Boolean,
      default: false
    },
    isHibernationProgressing: {
      type: Boolean,
      default: false
    },
    lastErrors: {
      type: Array,
      required: false
    }
  },
  computed: {
    isOverallStatusOk () {
      if (this.isError === true) {
        return false
      }
      if (!this.isReady && this.isHibernationProgressing) {
        return true
      }
      return this.isReady
    },
    isReady () {
      let allowedConditionTypes = ['ControlPlaneHealthy', 'EveryNodeReady', 'APIServerAvailable', 'SystemComponentsHealthy']
      for (let condition of this.conditions) {
        let conditionType = get(condition, 'type')
        let conditionStatus = get(condition, 'status')
        if (allowedConditionTypes.includes(conditionType) && conditionStatus !== 'True') {
          return false
        }
      }
      return true
    },
    isError () {
      return this.operationState === 'Failed' || this.operationState === 'Error' || this.lastErrors.length
    },
    popperKeyWithType () {
      return `shootStatus_${this.popperKey}`
    },
    tooltipText () {
      if (this.isOverallStatusOk) {
        return 'Shoot is healthy'
      } else if (!this.isReady && this.isError) {
        return 'Shoot has availability and reconciliation problems'
      } else if (this.isReady && this.isError) {
        return 'Shoot has reconciliation problems'
      }
      return 'Shoot has availability problems'
    },
    lastErrorDescriptions () {
      return this.lastErrors.length
    },
    color () {
      if (this.isOverallStatusOk) {
        return 'success'
      } else {
        return 'error'
      }
    }
  }
}
</script>

<style lang="styl" scoped>

  .cursor-pointer {
    cursor: pointer;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }

  .status-icon {
    font-size: 25px;
  }

  .status-icon-check {
    font-size: 30px;
  }

</style>
