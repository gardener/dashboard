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
  <div>
    <v-tooltip top>
      <v-btn slot="activator" icon @click="showDialog" :disabled="isShootMarkedForDeletion">
        <v-icon medium>{{icon}}</v-icon>
      </v-btn>
      {{caption}}
    </v-tooltip>
    <confirm-dialog
      :confirm="confirm"
      :confirmButtonText="confirmText"
      v-model="dialog"
      :cancel="hideDialog"
      :ok="updateShootHibernation"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      confirmColor="orange"
      defaultColor="orange"
      >
      <template slot="caption">{{caption}}</template>
      <template slot="affectedObjectName">{{shootName}}</template>
      <template slot="message">
        <template v-if="!isHibernated">
          This will scale the worker nodes of your cluster down to zero.<br /><br />
          Type <b>{{shootName}}</b> below and confirm to hibernate your cluster.<br /><br />
        </template>
        <template v-else>
          This will wake-up your cluster and scale the worker nodes up to their previous count.<br /><br />
        </template>
      </template>
    </confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import { isHibernated, isShootMarkedForDeletion } from '@/utils'
import { updateShootHibernation } from '@/utils/api'
import { errorDetailsFromError } from '@/utils/error'
import get from 'lodash/get'

export default {
  components: {
    ConfirmDialog
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      dialog: false,
      errorMessage: null,
      detailedErrorMessage: null,
      enableHibernation: false
    }
  },
  computed: {
    confirmRequired () {
      return !this.isHibernated
    },
    confirm () {
      return this.confirmRequired ? this.shootName : undefined
    },
    confirmText () {
      if (!this.isHibernated) {
        return 'Hibernate'
      } else {
        return 'Wake-up'
      }
    },
    icon () {
      if (!this.isHibernated) {
        return 'mdi-pause-circle-outline'
      } else {
        return 'mdi-play-circle-outline'
      }
    },
    caption () {
      if (!this.isHibernated) {
        return 'Hibernate Cluster'
      } else {
        return 'Wake-up Cluster'
      }
    },
    isHibernated () {
      return isHibernated(get(this.shootItem, 'spec'))
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    }
  },
  methods: {
    showDialog () {
      this.dialog = true
      this.enableHibernation = !this.isHibernated
    },
    hideDialog () {
      this.dialog = false
      this.errorMessage = null
      this.detailedErrorMessage = null
    },
    async updateShootHibernation () {
      try {
        await updateShootHibernation({
          namespace: this.shootNamespace,
          name: this.shootName,
          data: {
            enabled: this.enableHibernation
          }
        })
        this.hideDialog()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        if (!this.isHibernated) {
          this.errorMessage = 'Could not hibernate cluster'
        } else {
          this.errorMessage = 'Could not wake up cluster from hibernation'
        }
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    }
  },
  watch: {
    isHibernated (value) {
      // hide dialog if hibernation state changes
      this.hideDialog()
    }
  }
}
</script>
