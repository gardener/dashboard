<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex align-center">
    <div
      ref="statusRef"
      class="d-flex align-center"
    >
      <v-btn
        v-if="isUserError"
        density="comfortable"
        variant="text"
        icon="mdi-account-alert"
        color="error"
      />
      <v-btn
        density="comfortable"
        variant="text"
        :icon="true"
      >
        <v-progress-circular
          v-if="showProgress"
          :size="27"
          :width="3"
          :model-value="shootLastOperation.progress"
          :color="color"
        >
          <v-icon
            v-if="isShootStatusHibernated"
            size="small"
            :color="color"
          >
            mdi-sleep
          </v-icon>
          <v-icon
            v-else-if="isShootLastOperationTypeDelete"
            size="small"
            :color="color"
          >
            mdi-delete
          </v-icon>
          <v-icon
            v-else-if="isShootMarkedForDeletion"
            size="small"
            :color="color"
          >
            mdi-delete-clock
          </v-icon>
          <v-icon
            v-else-if="isTypeCreate"
            size="small"
            :color="color"
          >
            mdi-plus
          </v-icon>
          <v-icon
            v-else-if="isTypeReconcile && !isError"
            size="small"
            :color="color"
          >
            mdi-check
          </v-icon>
          <span v-else-if="isError">!</span>
          <template v-else>
            {{ shootLastOperation.progress }}
          </template>
        </v-progress-circular>
        <v-icon
          v-else-if="isShootStatusHibernated"
          :color="color"
        >
          mdi-sleep
        </v-icon>
        <v-icon
          v-else-if="isShootReconciliationDeactivated"
          :color="color"
        >
          mdi-block-helper
        </v-icon>
        <v-icon
          v-else-if="isAborted && isShootLastOperationTypeDelete"
          :color="color"
        >
          mdi-delete
        </v-icon>
        <v-icon
          v-else-if="isAborted && isShootMarkedForDeletion"
          :color="color"
        >
          mdi-delete-clock
        </v-icon>
        <v-icon
          v-else-if="isAborted && isTypeCreate"
          :color="color"
        >
          mdi-plus
        </v-icon>
        <v-icon
          v-else-if="isError"
          :color="color"
        >
          mdi-alert-outline
        </v-icon>
        <v-progress-circular
          v-else-if="isPending"
          :size="27"
          :width="3"
          indeterminate
          :color="color"
        />
        <v-icon
          v-else
          color="success"
          class="status-icon-check"
        >
          mdi-check-circle-outline
        </v-icon>
      </v-btn>
    </div>
    <v-tooltip
      location="top"
      :disabled="internalValue"
      :activator="$refs.statusRef"
    >
      <div>
        <span class="font-weight-bold">{{ tooltip.title }}</span>
        <span
          v-if="tooltip.progress"
          class="ml-1"
        >({{ tooltip.progress }}%)</span>
        <div
          v-for="({ shortDescription, userError }) in tooltip.errorCodeObjects"
          :key="shortDescription"
        >
          <v-icon
            v-if="userError"
            color="white"
            size="small"
            :icon="userError ? 'mdi-account-alert' : 'mdi-alert'"
            class="mr-1"
          />
          <span class="font-weight-bold text--lighten-2">{{ shortDescription }}</span>
        </div>
      </div>
    </v-tooltip>
    <g-popover
      v-model="internalValue"
      :toolbar-title="toolbarTitle"
      :toolbar-color="color"
      :placement="popperPlacement"
      :activator="$refs.statusRef"
    >
      <g-shoot-message-details
        :status-title="statusTitle"
        :last-message="lastMessage"
        :error-descriptions="errorDescriptions"
        :last-update-time="shootLastOperation.lastUpdateTime"
        :secret-binding-name="shootSecretBindingName"
        :namespace="shootNamespace"
      />
    </g-popover>
    <div class="d-flex">
      <g-retry-operation />
    </div>
    <span
      v-if="showStatusText"
      class="ml-2"
    >{{ statusTitle }}</span>
  </div>
  <template v-if="showStatusText">
    <div
      v-for="({ description, link }) in tooltip.errorCodeObjects"
      :key="description"
    >
      <div class="font-weight-bold text-error wrap-text">
        {{ description }}
      </div>
      <div v-if="link">
        <g-external-link
          :url="link.url"
          class="font-weight-bold text-error"
        >
          {{ link.text }}
        </g-external-link>
      </div>
    </div>
  </template>
</template>

<script>
import { mapActions } from 'pinia'

import { useShootStore } from '@/store/shoot'

import { useShootItem } from '@/composables/useShootItem'

import {
  isUserError,
  objectsFromErrorCodes,
  errorCodesFromArray,
} from '@/utils/errorCodes'

import GShootMessageDetails from './GShootMessageDetails.vue'
import GRetryOperation from './GRetryOperation.vue'

import {
  join,
  map,
} from '@/lodash'

export default {
  components: {
    GRetryOperation,
    GShootMessageDetails,
  },
  inject: [
    'mergeProps',
    'activePopoverKey',
  ],
  props: {
    popperKey: {
      type: String,
      required: true,
    },
    popperPlacement: {
      type: String,
    },
    showStatusText: {
      type: Boolean,
      default: false,
    },
  },
  setup () {
    const {
      shootNamespace,
      shootSecretBindingName,
      shootLastOperation,
      isShootMarkedForDeletion,
      isShootLastOperationTypeDelete,
      isShootStatusHibernated,
      isShootReconciliationDeactivated,
      shootMetadata,
      shootLastErrors,
      isShootStatusHibernationProgressing,
    } = useShootItem()

    return {
      shootNamespace,
      shootSecretBindingName,
      shootLastOperation,
      isShootMarkedForDeletion,
      isShootLastOperationTypeDelete,
      isShootStatusHibernated,
      isShootReconciliationDeactivated,
      shootMetadata,
      shootLastErrors,
      isShootStatusHibernationProgressing,
    }
  },
  data () {
    return {
      retryingOperation: false,
    }
  },
  computed: {
    popoverKey () {
      return `g-shoot-status:${this.shootMetadata.uid}`
    },
    internalValue: {
      get () {
        return this.activePopoverKey === this.popoverKey
      },
      set (value) {
        this.activePopoverKey = value ? this.popoverKey : ''
      },
    },
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
        errorCodeObjects: objectsFromErrorCodes(this.allErrorCodes),
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
        errorCodeObjects: objectsFromErrorCodes(lastError.codes),
      }))
    },
    lastMessage () {
      const message = this.shootLastOperation.description || 'No description'
      if (map(this.errorDescriptions, 'description').includes(message)) {
        return undefined
      }
      return message
    },
    isStaleShoot () {
      return !this.isShootActive(this.shootMetadata.uid)
    },
  },
  methods: {
    ...mapActions(useShootStore, [
      'isShootActive',
    ]),
  },
}
</script>

<style lang="scss" scoped>
  .status-icon-check {
    font-size: 30px !important;
  }
</style>
