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
      Type <span class="font-weight-bold">{{ shootName }}</span> below to confirm the forceful deletion of the cluster.
    </p>
    <g-expand-transition-group>
      <v-alert
        v-if="!confirmed"
        class="mt-2"
        type="warning"
        variant="tonal"
      >
        You <span class="font-weight-bold">MUST</span> ensure that all the resources created in the IaaS account
        <code>
          <g-shoot-secret-name
            :namespace="shootNamespace"
            :secret-binding-name="shootSecretBindingName"
          />
        </code>
        are cleaned
        up to prevent orphaned resources. Gardener will <span class="font-weight-bold">NOT</span> delete any resources in the underlying infrastructure account.
        Hence, use the force delete option at your own risk and only if you are fully aware of these consequences.
        <p class="font-weight-bold">
          This action cannot be undone.
        </p>
      </v-alert>
    </g-expand-transition-group>
    <g-countdown-checkbox
      v-model="confirmed"
      :seconds="0"
    >
      <span>
        I confirm that I read the message above and deleted all resources in the underlying infrastructure account
        <code>
          <g-shoot-secret-name
            :namespace="shootNamespace"
            :secret-binding-name="shootSecretBindingName"
          />
        </code>
      </span>
    </g-countdown-checkbox>
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
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'
import GCountdownCheckbox from '@/components/GCountdownCheckbox'
import GShootSecretName from '@/components/GShootSecretName'

import { shootItem } from '@/mixins/shootItem'
import { errorDetailsFromError } from '@/utils/error'

export default {
  components: {
    GShootActionButton,
    GShootActionDialog,
    GAccountAvatar,
    GExpandTransitionGroup,
    GCountdownCheckbox,
    GShootSecretName,
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
      confirmed: false,
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
          this.confirmed = false
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

<style lang="scss" scoped>
p {
  margin-bottom: 0
}

</style>
