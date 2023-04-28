<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <action-button-dialog
    :shoot-item="shootItem"
    @dialog-opened="onConfigurationDialogOpened"
    ref="actionDialog"
    :caption="caption"
    :icon="icon"
    :confirm-button-text="confirmText"
    :confirm-required="confirmRequired"
    :disabled="!isHibernationPossible && !isShootSettingHibernated"
    :button-text="buttonText"
     width="600">
    <template v-slot:actionComponent>
      <template v-if="!isShootSettingHibernated">
        This will scale the worker nodes of your cluster down to zero.<br /><br />
        Type <strong>{{shootName}}</strong> below and confirm to hibernate your cluster.<br /><br />
      </template>
      <template v-else>
        This will wake up your cluster and scale the worker nodes up to their previous count.<br /><br />
      </template>
    </template>
  </action-button-dialog>
</template>

<script>
import ActionButtonDialog from '@/components/dialogs/ActionButtonDialog.vue'
import { updateShootHibernation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'
import { mapActions } from 'vuex'

export default {
  components: {
    ActionButtonDialog
  },
  props: {
    text: {
      type: Boolean
    }
  },
  mixins: [shootItem],
  data () {
    return {
      hibernationChanged: false
    }
  },
  computed: {
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
    }
  },
  methods: {
    ...mapActions([
      'setAlert'
    ]),
    async onConfigurationDialogOpened () {
      const confirmed = await this.$refs.actionDialog.waitForDialogClosed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      this.hibernationChanged = true
      try {
        await updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: !this.isShootSettingHibernated
          }
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
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
        this.hibernationChanged = false
      }
    }
  },
  watch: {
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

      const message = this.isShootStatusHibernated
        ? `Cluster ${this.shootName} successfully hibernated`
        : `Cluster ${this.shootName} successfully started`
      this.setAlert({
        message,
        type: 'success'
      })
    }
  }
}
</script>
