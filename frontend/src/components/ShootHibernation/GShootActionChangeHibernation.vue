<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-shoot-action-dialog
    v-if="dialog"
    ref="actionDialog"
    :shoot-item="shootItem"
    :caption="caption"
    :confirm-button-text="confirmText"
    :confirm-required="confirmRequired"
    width="600"
  >
    <template v-if="!isShootSettingHibernated">
      This will scale the worker nodes of your cluster down to zero.<br><br>
      Type <strong>{{ shootName }}</strong> below and confirm to hibernate your cluster.<br><br>
    </template>
    <template v-else-if="!isShootWorkerless">
      This will wake up your cluster and scale the worker nodes up to their previous count.<br><br>
    </template>
    <template v-else>
      This will wake up your cluster.<br><br>
    </template>
  </g-shoot-action-dialog>
  <g-shoot-action-button
    v-if="button"
    ref="actionButton"
    :shoot-item="shootItem"
    :disabled="!isHibernationPossible && !isShootSettingHibernated"
    :icon="icon"
    :text="buttonText"
    :caption="caption"
    @click="internalValue = true"
  />
</template>

<script>
import GShootActionButton from '@/components/GShootActionButton.vue'
import GShootActionDialog from '@/components/GShootActionDialog.vue'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
  },
  mixins: [shootItem],
  inject: ['api', 'notify', 'logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    text: {
      type: Boolean,
      default: false,
    },
    dialog: {
      type: Boolean,
      default: false,
    },
    button: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      hibernationChanged: false,
    }
  },
  computed: {
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    confirmRequired () {
      return !this.isShootSettingHibernated
    },
    confirmText () {
      if (!this.isShootSettingHibernated) {
        return 'Hibernate'
      } else {
        return 'Wake up'
      }
    },
    icon () {
      if (!this.isShootSettingHibernated) {
        return 'mdi-pause-circle-outline'
      } else {
        return 'mdi-play-circle-outline'
      }
    },
    buttonTitle () {
      if (!this.isShootSettingHibernated) {
        return 'Hibernate Cluster'
      } else {
        return 'Wake up Cluster'
      }
    },
    caption () {
      if (!this.isHibernationPossible && !this.isShootSettingHibernated) {
        return this.hibernationPossibleMessage
      }
      return this.buttonTitle
    },
    buttonText () {
      if (!this.text) {
        return
      }
      return this.buttonTitle
    },
  },
  watch: {
    modelValue (value) {
      if (this.dialog) {
        const actionDialog = this.$refs.actionDialog
        if (value) {
          actionDialog.showDialog()
          this.waitForConfirmation()
        } else {
          actionDialog.hideDialog()
        }
      }
    },
    isShootSettingHibernated (value) {
      // hide dialog if hibernation state changes
      if (this.$refs.actionDialog) {
        this.$refs.actionDialog.hideDialog()
      }
    },
    isShootStatusHibernationProgressing (hibernationProgressing) {
      if (hibernationProgressing || !this.hibernationChanged) {
        return
      }
      this.hibernationChanged = false

      if (!this.shootName) { // ensure that notification is not triggered by shoot resource being cleared (e.g. during navigation)
        return
      }

      const state = this.isShootStatusHibernated
        ? 'hibernated'
        : 'started'
      this.notify({
        text: `Cluster ${this.shootName} successfully ${state}`,
        type: 'success',
        position: 'bottom right',
        duration: 5000,
      })
    },
  },
  methods: {
    waitForConfirmation () {
      this.$nextTick(async () => {
        const actionDialog = this.$refs.actionDialog
        try {
          if (await actionDialog.waitForDialogClosed()) {
            this.updateConfiguration()
          }
        } catch (err) {
          /* ignore error */
        } finally {
          this.internalValue = false
        }
      })
    },
    async updateConfiguration () {
      this.hibernationChanged = true
      try {
        await this.api.updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: !this.isShootSettingHibernated,
          },
        })
      } catch (err) {
        let errorMessage
        if (!this.isShootSettingHibernated) {
          errorMessage = 'Could not hibernate cluster'
        } else {
          errorMessage = 'Could not wake up cluster from hibernation'
        }
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.hibernationChanged = false
      }
    },
  },
}
</script>
