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
    confirm-button-text="Delete"
    confirm-required
    width="600"
  >
    <v-list>
      <v-list-item-subtitle>
        Created By
      </v-list-item-subtitle>
      <v-list-item-title>
        <g-account-avatar
          :account-name="shootCreatedBy"
          :size="22"
        />
      </v-list-item-title>
    </v-list>
    <p>
      Type <span class="font-weight-bold">{{ shootName }}</span> below and confirm the deletion of the cluster and all of its content.
    </p>
    <p class="mt-2 text-error font-weight-bold">
      This action cannot be undone.
    </p>
    <p v-if="isShootReconciliationDeactivated">
      <v-row class="fill-height">
        <v-icon
          color="warning"
          class="mr-1"
        >
          mdi-alert-box
        </v-icon>
        <span>The cluster will not be deleted as long as reconciliation is deactivated.</span>
      </v-row>
    </p>
  </g-shoot-action-dialog>
  <g-shoot-action-button
    v-if="button"
    ref="actionButton"
    :shoot-item="shootItem"
    icon="mdi-delete"
    :text="buttonText"
    :caption="caption"
    @click="internalValue = true"
  />
</template>

<script>
import { mapActions } from 'pinia'

import { useShootStore } from '@/store'
import GShootActionButton from '@/components/GShootActionButton.vue'
import GShootActionDialog from '@/components/GShootActionDialog.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
    GAccountAvatar,
  },
  mixins: [shootItem],
  inject: ['logger'],
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
    small: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'update:modelValue',
  ],
  data () {
    return {
      renderDialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
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
    icon () {
      return 'mdi-delete'
    },
    caption () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : this.buttonTitle
    },
    buttonTitle () {
      return 'Delete Cluster'
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
  },
  methods: {
    ...mapActions(useShootStore, [
      'deleteShoot',
    ]),
    waitForConfirmation () {
      this.$nextTick(async () => {
        const actionDialog = this.$refs.actionDialog
        try {
          if (await actionDialog.waitForDialogClosed()) {
            this.deleteCluster()
          }
        } catch (err) {
          /* ignore error */
        } finally {
          this.internalValue = false
        }
      })
    },
    async deleteCluster () {
      try {
        await this.deleteShoot({ name: this.shootName, namespace: this.shootNamespace })
      } catch (err) {
        const errorMessage = 'Cluster deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },

  },
}
</script>

<style lang="scss" scoped>
  p {
    margin-bottom: 0
  }
</style>
