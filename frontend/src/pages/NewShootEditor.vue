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
  <v-layout fill-height>
    <shoot-editor
      :modificationWarning="modificationWarning"
      @dismissModificationWarning="onDismissModificationWarning"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      :shootContent="newShootResource"
      ref="shootEditor">
      <template slot="modificationWarning">
        By modifying the resource directly you may create an invalid cluster resource.
        If the resource is invalid, you may lose data when switching back to the overview page.
      </template>
      <template slot="toolbarItemsRight">
        <v-flex d-flex fill-height align-center class="divider-left">
          <v-btn flat @click.native.stop="createClicked()" class="cyan--text text--darken-2">Create Cluster</v-btn>
        </v-flex>
      </template>
    </shoot-editor>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-layout>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import ShootEditor from '@/components/ShootEditor'
import { mapGetters, mapState, mapActions } from 'vuex'
import { errorDetailsFromError } from '@/utils/error'

// lodash
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'

// js-yaml
import jsyaml from 'js-yaml'

export default {
  components: {
    ShootEditor,
    ConfirmDialog
  },
  name: 'shoot-create-editor',
  data () {
    return {
      modificationWarning: true,
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
    onDismissModificationWarning () {
      this.modificationWarning = false
      this.$localStorage.setItem('showNewShootEditorWarning', 'false')
    },
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Leave',
        captionText: 'Leave Create Cluster Page?',
        messageHtml: 'Your cluster has not been created.<br/>Do you want to cancel cluster creation and discard your changes?'
      })
    },
    async createClicked () {
      const shootResource = jsyaml.safeLoad(this.$refs.shootEditor.getContent())

      try {
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
        this.errorMessage = `Failed to create cluster.`
        this.detailedErrorMessage = errorDetails.detailedMessage
        console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    async isShootContentDirty () {
      const data = await jsyaml.safeLoad(this.$refs.shootEditor.getContent())
      return !isEqual(JSON.stringify(this.initialNewShootResource), JSON.stringify(data))
    }
  },
  mounted () {
    const modificationWarning = this.$localStorage.getItem('showNewShootEditorWarning')
    this.modificationWarning = modificationWarning === null || modificationWarning === 'true'
  },
  async beforeRouteLeave (to, from, next) {
    if (to.name === 'NewShoot') {
      try {
        const data = await jsyaml.safeLoad(this.$refs.shootEditor.getContent())
        this.setNewShootResource(data)
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
        this.$refs.shootEditor.focus()
        return next(false)
      }
    }
    return next()
  }
}
</script>
