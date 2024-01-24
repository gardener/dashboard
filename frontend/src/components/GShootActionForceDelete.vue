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
    <g-force-delete-cluster :shoot-item="shootItem" />
  </g-shoot-action-dialog>
  <g-shoot-action-button
    v-if="button"
    ref="actionButton"
    :shoot-item="shootItem"
    icon="mdi-delete-forever"
    :text="buttonText"
    :caption="caption"
    color="error"
    @click="internalValue = true"
  />
</template>

<script>
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useShootStore } from '@/store/shoot'

import GShootActionButton from '@/components/GShootActionButton.vue'
import GShootActionDialog from '@/components/GShootActionDialog.vue'
import GForceDeleteCluster from '@/components/GForceDeleteCluster.vue'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
    GForceDeleteCluster,
  },
  mixins: [shootItem],
  inject: ['logger', 'api'],
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
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
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
    caption () {
      return this.isShootMarkedForForceDeletion
        ? 'Cluster already marked for force deletion'
        : this.isShootMarkedForDeletion
          ? 'Cluster already marked for deletion'
          : this.buttonTitle
    },
    buttonTitle () {
      return 'Force Delete Cluster'
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
            this.forceDeleteCluster()
          }
        } catch (err) {
          /* ignore error */
        } finally {
          this.internalValue = false
        }
      })
    },
    async forceDeleteCluster () {
      const annotation = { 'confirmation.gardener.cloud/force-deletion': 'true' }
      try {
        await this.api.addShootAnnotation({ namespace: this.shootNamespace, name: this.shootName, data: annotation })
      } catch (err) {
        const errorMessage = 'Cluster force deletion failed'
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        this.logger.error(errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
  },
}
</script>
