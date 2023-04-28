<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="d-flex align-center">
      <g-popper :title="toolbarTitle" :toolbar-color="color" :popper-key="popperKeyWithType" :placement="popperPlacement">
        <template v-slot:popperRef>
          <div class="d-flex align-center">
            <v-tooltip location="top">
              <template v-slot:activator="{ on }">
                <v-btn v-if="isUserError" icon v-on="on">
                  <v-icon color="error">mdi-account-alert</v-icon>
                </v-btn>
                <v-btn icon v-on="on">
                  <v-progress-circular v-if="showProgress" :size="27" :width="3" :model-value="shootLastOperation.progress" :color="color" :rotate="-90">
                    <v-icon v-if="isShootStatusHibernated" size="small" :color="color">mdi-sleep</v-icon>
                    <v-icon v-else-if="isShootLastOperationTypeDelete" size="small" :color="color">mdi-delete</v-icon>
                    <v-icon v-else-if="isShootMarkedForDeletion" size="small" :color="color">mdi-delete-clock</v-icon>
                    <v-icon v-else-if="isTypeCreate" size="small" :color="color">mdi-plus</v-icon>
                    <v-icon v-else-if="isTypeReconcile && !isError" size="small" :color="color">mdi-check</v-icon>
                    <span v-else-if="isError" small>!</span>
                    <template v-else>{{shootLastOperation.progress}}</template>
                  </v-progress-circular>
                  <v-icon v-else-if="isShootStatusHibernated" :color="color">mdi-sleep</v-icon>
                  <v-icon v-else-if="isShootReconciliationDeactivated" :color="color">mdi-block-helper</v-icon>
                  <v-icon v-else-if="isAborted && isShootLastOperationTypeDelete" :color="color">mdi-delete</v-icon>
                  <v-icon v-else-if="isAborted && isShootMarkedForDeletion" :color="color">mdi-delete-clock</v-icon>
                  <v-icon v-else-if="isAborted && isTypeCreate" :color="color">mdi-plus</v-icon>
                  <v-icon v-else-if="isError" :color="color">mdi-alert-outline</v-icon>
                  <v-progress-circular v-else-if="isPending" :size="27" :width="3" indeterminate :color="color"></v-progress-circular>
                  <v-icon v-else color="success" class="status-icon-check">mdi-check-circle-outline</v-icon>
                </v-btn>
              </template>
              <div>
                <span class="font-weight-bold">{{tooltip.title}}</span>
                <span v-if="tooltip.progress" class="ml-1">({{tooltip.progress}}%)</span>
                <div v-for="({ shortDescription, userError }) in tooltip.errorCodeObjects" :key="shortDescription">
                  <v-icon v-if="userError" class="mr-1" color="white" size="small">{{ userError ? 'mdi-account-alert' : 'mdi-alert' }}</v-icon>
                  <span class="font-weight-bold text--lighten-2">{{shortDescription}}</span>
                </div>
              </div>
            </v-tooltip>
          </div>
        </template>
        <template v-slot:card>
          <shoot-message-details
            :status-title="statusTitle"
            :last-message="lastMessage"
            :error-descriptions="errorDescriptions"
            :last-update-time="shootLastOperation.lastUpdateTime"
            :secret-binding-name="shootSecretBindingName"
            :namespace="shootNamespace"
          />
        </template>
      </g-popper>
      <div>
        <retry-operation :shoot-item="shootItem"></retry-operation>
      </div>
      <span v-if="showStatusText" class="ml-2">{{statusTitle}}</span>
    </div>
    <template v-if="showStatusText">
      <div v-for="({ description, link }) in tooltip.errorCodeObjects" :key="description">
        <div class="font-weight-bold text-error wrap-text">{{description}}</div>
        <div v-if="link"><external-link :url="link.url" class="font-weight-bold text-error">{{link.text}}</external-link></div>
      </div>
    </template>
  </div>
</template>

<script>
import join from 'lodash/join'
import map from 'lodash/map'

import GPopper from '@/components/GPopper.vue'
import RetryOperation from '@/components/RetryOperation.vue'
import ShootMessageDetails from '@/components/ShootMessageDetails.vue'
import ExternalLink from '@/components/ExternalLink.vue'

import { isUserError, objectsFromErrorCodes, errorCodesFromArray } from '@/utils/errorCodes'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GPopper,
    RetryOperation,
    ShootMessageDetails,
    ExternalLink
  },
  props: {
    popperKey: {
      type: String,
      required: true
    },
    popperPlacement: {
      type: String
    },
    showStatusText: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      retryingOperation: false
    }
  },
  mixins: [shootItem],
  computed: {
    showProgress () {
      return this.operationState === 'Processing'
    },
    isError () {
      return this.operationState === 'Failed' || this.operationState === 'Error' || this.shootLastErrors.length
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
      return errorCodesFromArray(this.shootLastErrors)
    },
    popperKeyWithType () {
      return `shootStatus_${this.popperKey}`
    },
    toolbarTitle () {
      if (this.isStaleShoot) {
        return 'Last Status'
      }
      return this.statusTitle
    },
    statusTitle () {
      const statusTitle = []
      if (this.isShootStatusHibernationProgressing) {
        if (this.isShootStatusHibernated) {
          statusTitle.push('Waking up')
        } else {
          statusTitle.push('Hibernating')
        }
      } else if (this.isShootStatusHibernated) {
        statusTitle.push('Hibernated')
      }
      if (this.isShootReconciliationDeactivated) {
        statusTitle.push('Reconciliation Deactivated')
      } else {
        statusTitle.push(`${this.operationType} ${this.operationState}`)
      }

      if (this.isShootMarkedForDeletion) {
        statusTitle.push('Cluster marked for deletion')
      }

      return join(statusTitle, ', ')
    },
    tooltip () {
      return {
        title: this.statusTitle,
        progress: this.showProgress ? this.shootLastOperation.progress : undefined,
        errorCodeObjects: objectsFromErrorCodes(this.allErrorCodes)
      }
    },
    operationType () {
      return this.shootLastOperation.type || 'Create'
    },
    operationState () {
      return this.shootLastOperation.state || 'Pending'
    },
    color () {
      if (this.isAborted || this.isStaleShoot) {
        return 'grey'
      } else if (this.isError) {
        return 'error'
      } else {
        return 'primary'
      }
    },
    errorDescriptions () {
      return map(this.shootLastErrors, lastError => ({
        description: lastError.description,
        errorCodeObjects: objectsFromErrorCodes(lastError.codes)
      }))
    },
    lastMessage () {
      let message = this.shootLastOperation.description
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
  .status-icon-check {
    font-size: 30px !important;
  }
</style>
