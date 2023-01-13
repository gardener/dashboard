<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <div class="d-flex align-center">
      <g-popper :title="toolbarTitle" :toolbar-color="color" :popper-key="popperKeyWithType" :placement="popperPlacement">
        <template v-slot:popperRef>
          <div>
            <v-tooltip top>
              <template v-slot:activator="{ on }">
                <div v-on="on" class="d-flex align-center">
                  <div class="cursor-pointer" :class="{'showStatusText' : showStatusText}">
                    <v-icon v-if="isUserError" class="vertical-align-middle status-icon" color="error">mdi-account-alert</v-icon>
                  </div>
                  <div class="icon-slot cursor-pointer mx-1">
                    <v-progress-circular v-if="showProgress" class="vertical-align-middle" :size="27" :width="3" :value="shootLastOperation.progress" :color="color" :rotate="-90">
                      <v-icon v-if="isShootStatusHibernated" class="vertical-align-middle progress-icon" :color="color">mdi-sleep</v-icon>
                      <v-icon v-else-if="isShootLastOperationTypeDelete" class="vertical-align-middle progress-icon" :color="color">mdi-delete</v-icon>
                      <v-icon v-else-if="isShootMarkedForDeletion" class="vertical-align-middle progress-icon" :color="color">mdi-delete-clock</v-icon>
                      <v-icon v-else-if="isTypeCreate" class="vertical-align-middle progress-icon" :color="color">mdi-plus</v-icon>
                      <v-icon v-else-if="isTypeReconcile && !isError" class="vertical-align-middle progress-icon-check" :color="color">mdi-check</v-icon>
                      <span v-else-if="isError" class="vertical-align-middle error-exclamation-mark">!</span>
                      <template v-else>{{shootLastOperation.progress}}</template>
                    </v-progress-circular>
                    <v-icon v-else-if="isShootStatusHibernated" class="vertical-align-middle status-icon" :color="color">mdi-sleep</v-icon>
                    <v-icon v-else-if="isShootReconciliationDeactivated" class="vertical-align-middle status-icon" :color="color">mdi-block-helper</v-icon>
                    <v-icon v-else-if="isAborted && isShootLastOperationTypeDelete" class="vertical-align-middle status-icon" :color="color">mdi-delete</v-icon>
                    <v-icon v-else-if="isAborted && isShootMarkedForDeletion" class="vertical-align-middle progress-icon" :color="color">mdi-delete-clock</v-icon>
                    <v-icon v-else-if="isAborted && isTypeCreate" class="vertical-align-middle status-icon" :color="color">mdi-plus</v-icon>
                    <v-icon v-else-if="isError" class="vertical-align-middle status-icon" :color="color">mdi-alert-outline</v-icon>
                    <v-progress-circular v-else-if="isPending" class="vertical-align-middle" :size="27" :width="3" indeterminate :color="color"></v-progress-circular>
                    <v-icon v-else class="vertical-align-middle status-icon-check" color="success">mdi-check-circle-outline</v-icon>
                  </div>
                </div>
              </template>
              <div>
                <span class="font-weight-bold">{{tooltip.title}}</span>
                <span v-if="tooltip.progress" class="ml-1">({{tooltip.progress}}%)</span>
                <div v-for="({ shortDescription, userError }) in tooltip.errorCodeObjects" :key="shortDescription">
                  <v-icon v-if="userError" class="mr-1" color="white" small>{{ userError ? 'mdi-account-alert' : 'mdi-alert' }}</v-icon>
                  <span class="font-weight-bold text--lighten-2">{{shortDescription}}</span>
                </div>
              </div>
            </v-tooltip>
          </div>
        </template>
        <shoot-message-details
          :status-title="statusTitle"
          :last-message="lastMessage"
          :error-descriptions="errorDescriptions"
          :last-update-time="shootLastOperation.lastUpdateTime"
          :secret-binding-name="shootSecretBindingName"
          :namespace="shootNamespace"
        />
      </g-popper>
      <div :class="{'showStatusText' : showStatusText}">
        <retry-operation :shoot-item="shootItem"></retry-operation>
      </div>
      <span v-if="showStatusText" class="ml-2">{{statusTitle}}</span>
    </div>
    <template v-if="showStatusText">
      <div v-for="({ description, link }) in tooltip.errorCodeObjects" :key="description">
        <div class="font-weight-bold error--text wrap-text">{{description}}</div>
        <div v-if="link"><external-link :url="link.url" class="font-weight-bold error--text">{{link.text}}</external-link></div>
      </div>
    </template>
  </div>
</template>

<script>
import join from 'lodash/join'
import map from 'lodash/map'

import GPopper from '@/components/GPopper'
import RetryOperation from '@/components/RetryOperation'
import ShootMessageDetails from '@/components/ShootMessageDetails'
import ExternalLink from '@/components/ExternalLink'

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

  /* overwrite message class from g-popper child component */
  ::v-deep .message {
    max-height: 800px;
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

  .icon-slot {
    width: 30px;
    height: auto;
    text-align: center;
  }

  ::v-deep .v-card  {
    .v-card__text {
      padding: 0px;
      text-align: left;
    }
  }

</style>
