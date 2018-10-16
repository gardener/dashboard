<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <g-popper :title="popperTitle" :time="operation.lastUpdateTime" :toolbarColor="color" :popperKey="popperKeyWithType" :placement="popperPlacement">
    <div slot="popperRef" class="shoot-status-div">
      <v-tooltip top>
        <template slot="activator">
          <v-progress-circular v-if="showProgress" class="vertical-align-middle cursor-pointer" :size="27" :width="3" :value="operation.progress" :color="color" :rotate="-90">
            <v-icon v-if="isHibernated" class="vertical-align-middle progress-icon" :color="color">mdi-sleep</v-icon>
            <v-icon v-else-if="isUserError" class="vertical-align-middle progress-icon-user-error" color="error">mdi-account-alert</v-icon>
            <v-icon v-else-if="shootDeleted" class="vertical-align-middle progress-icon" :color="color">mdi-delete</v-icon>
            <v-icon v-else-if="isTypeCreate" class="vertical-align-middle progress-icon" :color="color">mdi-plus</v-icon>
            <v-icon v-else-if="isTypeReconcile && !isError" class="vertical-align-middle progress-icon-check" :color="color">mdi-check</v-icon>
            <span v-else-if="isError" class="vertical-align-middle error-exclamation-mark">!</span>
            <template v-else>{{operation.progress}}</template>
          </v-progress-circular>
          <v-icon v-else-if="isHibernated" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-sleep</v-icon>
          <v-icon v-else-if="reconciliationDeactivated" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-block-helper</v-icon>
          <v-icon v-else-if="isAborted && shootDeleted" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-delete</v-icon>
          <v-icon v-else-if="isAborted && isTypeCreate" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-plus</v-icon>
          <v-icon v-else-if="isUserError" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-account-alert</v-icon>
          <v-icon v-else-if="isError" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-alert-outline</v-icon>
          <v-progress-circular v-else-if="isPending" class="vertical-align-middle cursor-pointer" :size="27" :width="3" indeterminate :color="color"></v-progress-circular>
          <v-icon v-else class="vertical-align-middle cursor-pointer status-icon-check" color="success">mdi-check-circle-outline</v-icon>
        </template>
        <div>{{ tooltipText }}</div>
      </v-tooltip>
    </div>
    <template slot="content-after">
      <pre v-if="!!popperMessage" class="alert-message">{{ popperMessage }}</pre>
      <template v-if="isError">
        <v-divider class="my-2"></v-divider>
        <h4 class="error--text text-xs-left">Last Error</h4>
        <template v-for="errorCodeDescription in errorCodeDescriptions">
          <h3 class="error--text text-xs-left" :key="errorCodeDescription">{{errorCodeDescription}}</h3>
        </template>
        <pre class="alert-message error--text" color="error">{{ lastErrorDescription }}</pre>
      </template>
    </template>
  </g-popper>
</template>

<script>
import GPopper from '@/components/GPopper'
import get from 'lodash/get'
import map from 'lodash/map'
import join from 'lodash/join'
import { isUserError } from '@/utils'

const errorCodes = {
  'ERR_INFRA_UNAUTHORIZED': {
    shortDescription: 'Invalid Credentials',
    description: 'Invalid cloud provider credentials.'
  },
  'ERR_INFRA_INSUFFICIENT_PRIVILEGES': {
    shortDescription: 'Insufficient Privileges',
    description: 'Cloud provider credentials have insufficient privileges.'
  },
  'ERR_INFRA_QUOTA_EXCEEDED': {
    shortDescription: 'Quota Exceeded',
    description: 'Cloud provider quota exceeded. Please request limit increases.'
  },
  'ERR_INFRA_DEPENDENCIES': {
    shortDescription: 'Infrastructure Dependencies',
    description: 'Infrastructure operation failed as unmanaged resources exist in your cloud provider account. Please delete all manually created resources related to this Shoot.'
  }
}

export default {
  components: {
    GPopper
  },
  props: {
    operation: {
      type: Object,
      required: true
    },
    shootDeleted: {
      type: Boolean,
      required: true
    },
    lastError: {
      type: Object,
      required: false
    },
    popperKey: {
      type: String,
      required: true
    },
    isHibernated: {
      type: Boolean,
      default: false
    },
    reconciliationDeactivated: {
      type: Boolean,
      default: false
    },
    popperPlacement: {
      type: String
    }
  },
  computed: {
    showProgress () {
      return this.operationState === 'Processing'
    },
    isError () {
      return this.operationState === 'Failed' || this.operationState === 'Error' || this.lastErrorDescription
    },
    isAborted () {
      return this.operationState === 'Aborted'
    },
    isPending () {
      return this.operationState === 'Pending'
    },
    isTypeCreate () {
      return this.operationType === 'Create'
    },
    isTypeReconcile () {
      return this.operationType === 'Reconcile'
    },
    isUserError () {
      return isUserError(this.errorCodes)
    },
    lastErrorDescription () {
      return get(this.lastError, 'description')
    },
    errorCodes () {
      return get(this.lastError, 'codes', [])
    },
    errorCodeDescriptions () {
      return map(this.errorCodes, code => get(errorCodes, `${code}.description`, code))
    },
    errorCodeShortDescriptions () {
      return map(this.errorCodes, code => get(errorCodes, `${code}.shortDescription`, code))
    },
    errorCodeShortDescriptionsText () {
      return join(this.errorCodeShortDescriptions, ', ')
    },
    popperKeyWithType () {
      return `shootStatus_${this.popperKey}`
    },
    popperTitle () {
      let popperTitle = ''
      if (this.isHibernated) {
        popperTitle = popperTitle.concat('Hibernated; ')
      }
      if (this.reconciliationDeactivated) {
        popperTitle = popperTitle.concat('Reconciliation Deactivated')

        this.emitExtendedTitle(popperTitle)
        return popperTitle
      }
      popperTitle = popperTitle.concat(`${this.operationType} ${this.operationState}`)

      this.emitExtendedTitle(popperTitle)
      return popperTitle
    },
    tooltipText () {
      let tooltipText = this.popperTitle
      if (this.showProgress) {
        tooltipText = tooltipText.concat(` (${this.operation.progress}%)`)
      }
      if (this.isUserError) {
        tooltipText = tooltipText.concat(`; ${this.errorCodeShortDescriptionsText}`)
      }

      return tooltipText
    },
    popperMessage () {
      let message = this.operation.description
      message = message || 'No description'
      if (message === this.lastErrorDescription) {
        return undefined
      }
      return message
    },
    operationType () {
      return this.operation.type || 'Create'
    },
    operationState () {
      return this.operation.state || 'Pending'
    },
    color () {
      if (this.isAborted) {
        return 'grey darken-1'
      } else if (this.isError) {
        return 'error'
      } else {
        return 'cyan darken-2'
      }
    }
  },
  methods: {
    emitExtendedTitle (title) {
      // similar to tooltipText, except the progress is missing
      let extendedTitle = title
      if (this.isUserError) {
        extendedTitle = extendedTitle.concat(`; ${this.errorCodeShortDescriptionsText}`)
      }

      this.$emit('titleChange', extendedTitle)
    }
  }
}
</script>

<style lang="styl" scoped>

  /* overwrite message class from g-popper child component */
  >>> .message {
    max-height: 800px;
  }

  .shoot-status-div {
    display: inline-block;
    width: 30px;
    text-align: center;
    height: auto;
    max-height:  30px;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .vertical-align-middle {
    vertical-align: middle;
  }

  .v-progress-circular {
    font-size: 12px;
    vertical-align: middle;

  }

  .progress-icon {
    font-size: 15px;
  }

  .progress-icon-check {
    font-size: 20px;
  }

  .progress-icon-user-error {
    font-size: 14px;
  }

  .error-exclamation-mark {
    font-size: 20px;
    font-weight: bold;
  }

  .status-icon {
    font-size: 25px;
  }

  .status-icon-check {
    font-size: 30px;
  }

  .alert-message {
    text-align: left;
    min-width: 250px;
    max-width: 800px;
    max-height: 300px;
    white-space: pre-wrap;
    overflow-y: auto;
  }

</style>
