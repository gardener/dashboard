<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div class="fill-height">
    <shoot-editor
      alert-banner-identifier="newShootEditorWarning"
      v-model:error-message="errorMessage"
      v-model:detailed-error-message="detailedErrorMessage"
      :shoot-item="newShootResource"
      ref="shootEditor"
      v-on="$shootEditor.hooks"
    >
      <template v-slot:modificationWarning>
        By modifying the resource directly you may create an invalid cluster resource.
        If the resource is invalid, you may lose data when switching back to the overview page.
      </template>
      <template v-slot:toolbarItemsRight>
        <v-divider vertical></v-divider>
        <v-col class="d-flex fill-height align-center" >
          <v-btn variant="text" @click.stop="createClicked()" class="text-primary">Create</v-btn>
        </v-col>
      </template>
    </shoot-editor>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import { mapGetters, mapState, mapActions } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'

import asyncRef from '@/mixins/asyncRef'

// lodash
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

const ShootEditor = () => import('@/components/ShootEditor.vue')

export default {
  name: 'shoot-create-editor',
  components: {
    ShootEditor,
    ConfirmDialog
  },
  mixins: [
    asyncRef('shootEditor')
  ],
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'newShootResource',
      'initialNewShootResource'
    ])
  },
  methods: {
    ...mapActions([
      'setNewShootResource',
      'createShoot'
    ]),
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Leave',
        captionText: 'Leave Create Cluster Page?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your changes?'
      })
    },
    async getShootResource () {
      const content = await this.$shootEditor.dispatch('getContent')
      return this.$yaml.load(content)
    },
    async createClicked () {
      try {
        const shootResource = await this.getShootResource()
        await this.createShoot(shootResource)
        this.isShootCreated = true
        this.$router.push({
          name: 'ShootItem',
          params: {
            namespace: this.namespace,
            name: shootResource.metadata.name
          }
        })
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        this.errorMessage = 'Failed to create cluster.'
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async isShootContentDirty () {
      const shootResource = await this.getShootResource()
      return !isEqual(this.initialNewShootResource, shootResource)
    }
  },
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShoot') {
      try {
        const shootResource = await this.getShootResource()
        this.setNewShootResource(shootResource)
        return next()
      } catch (err) {
        this.errorMessage = get(err, 'response.data.message', err.message)
        return next(false)
      }
    }
    if (this.isShootCreated) {
      return next()
    }
    if (!this.isShootCreated && await this.isShootContentDirty()) {
      if (!await this.confirmEditorNavigation()) {
        this.$shootEditor.dispatch('focus')
        return next(false)
      }
    }
    return next()
  }
}
</script>
