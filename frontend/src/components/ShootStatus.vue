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
  <g-popper :title="statusTitle" :toolbarColor="color" :popperKey="popperKeyWithType" :placement="popperPlacement">
    <template v-slot:popperRef>
      <div class="shoot-status-div d-flex flex-row">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <div v-on="on">
              <v-progress-circular v-if="showProgress" class="vertical-align-middle cursor-pointer" :size="27" :width="3" :value="operation.progress" :color="color" :rotate="-90">
                <v-icon v-if="isStatusHibernated" class="vertical-align-middle progress-icon" :color="color">mdi-sleep</v-icon>
                <v-icon v-else-if="isUserError" class="vertical-align-middle progress-icon-user-error" color="error">mdi-account-alert</v-icon>
                <v-icon v-else-if="shootDeleted" class="vertical-align-middle progress-icon" :color="color">mdi-delete</v-icon>
                <v-icon v-else-if="isTypeCreate" class="vertical-align-middle progress-icon" :color="color">mdi-plus</v-icon>
                <v-icon v-else-if="isTypeReconcile && !isError" class="vertical-align-middle progress-icon-check" :color="color">mdi-check</v-icon>
                <span v-else-if="isError" class="vertical-align-middle error-exclamation-mark">!</span>
                <template v-else>{{operation.progress}}</template>
              </v-progress-circular>
              <v-icon v-else-if="isStatusHibernated" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-sleep</v-icon>
              <v-icon v-else-if="reconciliationDeactivated" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-block-helper</v-icon>
              <v-icon v-else-if="isAborted && shootDeleted" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-delete</v-icon>
              <v-icon v-else-if="isAborted && isTypeCreate" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-plus</v-icon>
              <v-icon v-else-if="isUserError" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-account-alert</v-icon>
              <v-icon v-else-if="isError" class="vertical-align-middle cursor-pointer status-icon" :color="color">mdi-alert-outline</v-icon>
              <v-progress-circular v-else-if="isPending" class="vertical-align-middle cursor-pointer" :size="27" :width="3" indeterminate :color="color"></v-progress-circular>
              <v-icon v-else class="vertical-align-middle cursor-pointer status-icon-check" color="success">mdi-check-circle-outline</v-icon>
            </div>
          </template>
          <div>
            <span class="font-weight-bold">{{tooltip.title}}</span>
            <span v-if="tooltip.progress" class="ml-1">({{tooltip.progress}}%)</span>
            <div v-for="({ shortDescription }, index) in tooltip.userErrorCodeObjects" :key="index">
              <v-icon class="mr-2" color="red lighten-2" small>mdi-account-alert</v-icon>
              <span class="font-weight-bold error--text text--lighten-2">{{shortDescription}} - Action required</span>
            </div>
          </div>
        </v-tooltip>
        <slot name="retryButtonSlot"></slot>
        <span v-if="showStatusText" class="d-flex align-center ml-2">{{statusTitle}}</span>
      </div>
      <template v-if="showStatusText && tooltip.userErrorCodeObjects.length">
        <div v-for="({ shortDescription }, index) in tooltip.userErrorCodeObjects" :key="index">
          <span class="font-weight-bold error--text">{{shortDescription}} - Action required</span>
        </div>
        <span class="error--text">Please click on the user error icon for more information.</span>
      </template>
    </template>
    <shoot-message-details
      :statusTitle="statusTitle"
      :lastMessage="lastMessage"
      :errorDescriptions="errorDescriptions"
      :lastUpdateTime="operation.lastUpdateTime"
    />
  </g-popper>
</template>

<script>
import GPopper from '@/components/GPopper'
import ShootMessageDetails from '@/components/ShootMessageDetails'
import join from 'lodash/join'
import map from 'lodash/map'
import filter from 'lodash/filter'
import { isUserError, objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'

export default {
  components: {
    GPopper,
    ShootMessageDetails
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
    lastErrors: {
      type: Array,
      required: false
    },
    popperKey: {
      type: String,
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
    reconciliationDeactivated: {
      type: Boolean,
      default: false
    },
    popperPlacement: {
      type: String
    },
    showStatusText: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    showProgress () {
      return this.operationState === 'Processing'
    },
    isError () {
      return this.operationState === 'Failed' || this.operationState === 'Error' || this.lastErrors.length
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
      return isUserError(this.allErrorCodes)
    },
    allErrorCodes () {
      return errorCodesFromArray(this.lastErrors)
    },
    popperKeyWithType () {
      return `shootStatus_${this.popperKey}`
    },
    statusTitle () {
      const statusTitle = []
      if (this.isHibernationProgressing) {
        if (this.isStatusHibernated) {
          statusTitle.push('Waking up')
        } else {
          statusTitle.push('Hibernating')
        }
      } else if (this.isStatusHibernated) {
        statusTitle.push('Hibernated')
      }
      if (this.reconciliationDeactivated) {
        statusTitle.push('Reconciliation Deactivated')
      } else {
        statusTitle.push(`${this.operationType} ${this.operationState}`)
      }

      return join(statusTitle, ', ')
    },
    tooltip () {
      return {
        title: this.statusTitle,
        progress: this.showProgress ? this.operation.progress : undefined,
        userErrorCodeObjects: filter(objectsFromErrorCodes(this.allErrorCodes), { userError: true })
      }
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
    },
    errorDescriptions () {
      return map(this.lastErrors, lastError => ({
        description: lastError.description,
        errorCodeObjects: objectsFromErrorCodes(lastError.codes)
      }))
    },
    lastMessage () {
      let message = this.operation.description
      message = message || 'No description'
      if (message === this.lastErrorDescription) {
        return undefined
      }
      return message
    }
  }
}
</script>

<style lang="scss" scoped>

  /* overwrite message class from g-popper child component */
  ::v-deep .message {
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

  ::v-deep .v-card  {
    .v-card__text {
      padding: 0px;
      text-align: left;
    }
  }

</style>
