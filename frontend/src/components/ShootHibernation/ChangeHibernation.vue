<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <action-icon-dialog
    :shootItem="shootItem"
    @onDialogVisible="configurationDialogVisible"
    ref="actionDialog"
    :caption="caption"
    :icon="icon"
    :confirmButtonText="confirmText"
    :confirmRequired="confirmRequired"
    maxWidth="600">
    <template slot="actionComponent">
      <template v-if="!isShootHibernated">
        This will scale the worker nodes of your cluster down to zero.<br /><br />
        Type <b>{{shootName}}</b> below and confirm to hibernate your cluster.<br /><br />
      </template>
      <template v-else>
        This will wake-up your cluster and scale the worker nodes up to their previous count.<br /><br />
      </template>
    </template>
  </action-icon-dialog>
</template>

<script>
import ActionIconDialog from '@/dialogs/ActionIconDialog'
import { updateShootHibernation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    ActionIconDialog
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    confirmRequired () {
      return !this.isShootHibernated
    },
    confirmText () {
      if (!this.isShootHibernated) {
        return 'Hibernate'
      } else {
        return 'Wake-up'
      }
    },
    icon () {
      if (!this.isShootHibernated) {
        return 'mdi-pause-circle-outline'
      } else {
        return 'mdi-play-circle-outline'
      }
    },
    caption () {
      if (!this.isShootHibernated) {
        return 'Hibernate Cluster'
      } else {
        return 'Wake-up Cluster'
      }
    }
  },
  methods: {
    async configurationDialogVisible () {
      const confirmed = await this.$refs.actionDialog.waitForActionConfirmed()
      if (confirmed) {
        this.updateConfiguration()
      }
    },
    async updateConfiguration () {
      try {
        await updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: !this.isShootHibernated
          }
        })
      } catch (err) {
        let errorMessage
        if (!this.isShootHibernated) {
          errorMessage = 'Could not hibernate cluster'
        } else {
          errorMessage = 'Could not wake up cluster from hibernation'
        }
        const errorDetails = errorDetailsFromError(err)
        const detailedErrorMessage = errorDetails.detailedMessage
        this.$refs.actionDialog.setError({ errorMessage, detailedErrorMessage })
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    }
  },
  watch: {
    isShootHibernated (value) {
      // hide dialog if hibernation state changes
      this.$refs.actionDialog.hideDialog()
    }
  }
}
</script>
