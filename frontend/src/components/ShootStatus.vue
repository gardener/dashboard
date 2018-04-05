<!--
Copyright 2018 by The Gardener Authors.

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
  <g-popper :title="popperTitle" :time="operation.lastUpdateTime" toolbarColor="cyan darken-2" :popperKey="popperKeyWithType">
    <div slot="popperRef">
      <v-tooltip top>
        <template slot="activator">
          <v-progress-circular v-if="showProgress && !isError" class="cursor-pointer progress-circular" :size="27" :width="3" :value="operation.progress" color="cyan darken-2" rotate="-90">{{operation.progress}}</v-progress-circular>
          <v-progress-circular v-else-if="showProgress" class="cursor-pointer progress-circular-error" :size="27" :width="3" :value="operation.progress" color="error" rotate="-90">!</v-progress-circular>
          <v-icon v-else-if="isError" class="cursor-pointer status-icon" color="error">mdi-alert-outline</v-icon>
          <v-progress-circular v-else-if="operationState==='Pending'" class="cursor-pointer" :size="27" :width="3" indeterminate color="cyan darken-2"></v-progress-circular>
          <v-icon v-else-if="isHibernated" class="cursor-pointer status-icon" color="cyan darken-2">mdi-sleep</v-icon>
          <v-icon v-else class="cursor-pointer status-icon" color="success">mdi-check-circle-outline</v-icon>
        </template>
        <span>{{ tooltipText }}</span>
      </v-tooltip>
    </div>
    <template slot="content-after">
      <pre v-if="!!popperMessage" class="alert-message">{{ popperMessage }}</pre>
      <template v-if="isError">
        <v-divider class="my-2"></v-divider>
        <h3 class="error--text text-xs-left">Last Error</h3>
        <template v-for="errorCodeDescription in errorCodeDescriptions">
          <h4 class="error--text text-xs-left">{{errorCodeDescription}}</h4>
        </template>
        <pre class="alert-message error--text" color="error">{{ lastErrorDescription }}</pre>
      </template>
  </template>>
  </g-popper>
</template>

<script>
  import GPopper from '@/components/GPopper'
  import get from 'lodash/get'
  import map from 'lodash/map'

  export default {
    components: {
      GPopper
    },
    props: {
      operation: {
        type: Object,
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
      }
    },
    computed: {
      showProgress () {
        return this.operation.progress !== 100 && this.operation.state !== 'Failed' && !!this.operation.progress
      },
      isError () {
        return this.operation.state === 'Failed' || this.lastErrorDescription
      },
      lastErrorDescription () {
        return get(this.lastError, 'description')
      },
      errorCodeDescriptions () {
        const errorCodeDescriptions = map(get(this.lastError, 'codes'), code => {
          let description
          switch (code) {
            case 'ERR_INFRA_UNAUTHORIZED':
              description = 'Invalid infrastructure secret'
              break
            case 'ERR_INFRA_INSUFFICIENT_PRIVILEGES':
              description = 'Infrastructure secret has insufficient privileges'
              break
            case 'ERR_INFRA_QUOTA_EXCEEDED':
              description = 'Infrastructure secret quota exceeded'
              break
            case 'ERR_INFRA_DEPENDENCIES':
              description = 'Operation failed as there are dependent objects on cloud provider level'
              break
            default:
              description = code
          }
          return description
        })
        return errorCodeDescriptions
      },
      popperKeyWithType () {
        return `shootStatus_${this.popperKey}`
      },
      popperTitle () {
        let popperTitle = ''
        if (this.isHibernated) {
          popperTitle = popperTitle.concat('Hibernated; ')
        }
        return popperTitle.concat(`${this.operationType} ${this.operationState}`)
      },
      tooltipText () {
        return this.showProgress ? `${this.popperTitle} (${this.operation.progress}%)` : this.popperTitle
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
      }
    }
  }
</script>

<style lang="styl" scoped>

  /* overwrite message class from g-popper child component */
  >>> .message {
    max-height: 800px;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .progress-circular {
    font-size: 12px;
  }

  .progress-circular-error {
    font-size: 15px;
    font-weight: bold;
  }

  .status-icon {
    font-size: 2em;
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
