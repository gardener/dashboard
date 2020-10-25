<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <div class="fill-height">
    <shoot-editor
      :modificationWarning="modificationWarning"
      @dismissModificationWarning="onDismissModificationWarning"
      :errorMessage.sync="errorMessage"
      :detailedErrorMessage.sync="detailedErrorMessage"
      :shootContent="shootContent"
      :extraKeys="extraKeys"
      @clean="onClean"
      @conflictPath="onConflictPath"
      ref="shootEditor"
      v-on="$shootEditor.hooks"
    >
      <template v-slot:modificationWarning>
        By modifying the resource directly you may cause serious problems in your cluster.
        We cannot guarantee that you can solve problems that result from using Cluster Editor incorrectly.
      </template>
      <template v-slot:toolbarItemsRight>
        <v-btn text @click.native.stop="save()" :disabled="clean" color="cyan darken-2">Save</v-btn>
      </template>
    </shoot-editor>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </div>
</template>

<script>
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import { mapGetters, mapState } from 'vuex'
import { replaceShoot } from '@/utils/api'

import asyncRef from '@/mixins/asyncRef'

// lodash
import get from 'lodash/get'
import pick from 'lodash/pick'

const ShootEditor = () => import('@/components/ShootEditor')

export default {
  name: 'shoot-item-editor',
  components: {
    ShootEditor,
    ConfirmDialog
  },
  mixins: [
    asyncRef('shootEditor')
  ],
  data () {
    const vm = this
    return {
      modificationWarning: true,
      clean: true,
      hasConflict: false,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
      extraKeys: {
        'Ctrl-S': (instance) => {
          vm.save()
        },
        'Cmd-S': (instance) => {
          vm.save()
        }
      }
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'shootByNamespaceAndName'
    ]),
    shootContent () {
      return this.shootByNamespaceAndName(this.$route.params)
    }
  },
  methods: {
    onDismissModificationWarning () {
      this.modificationWarning = false
      this.$localStorage.setItem('showShootEditorWarning', 'false')
    },
    onClean (clean) {
      this.clean = clean
    },
    onConflictPath (conflictPath) {
      this.hasConflict = !!conflictPath
    },
    async save () {
      try {
        if (this.untouched) {
          return
        }
        if (this.clean) {
          return this.$shootEditor.dispatch('clearHistory')
        }
        if (this.hasConflict && !(await this.confirmOverwrite())) {
          return
        }

        const paths = ['spec', 'metadata.labels', 'metadata.annotations']
        const content = await this.$shootEditor.dispatch('getContent')
        const shootResource = await this.$yaml.safeLoad(content)
        const data = pick(shootResource, paths)
        const { metadata: { namespace, name } } = this.shootContent
        const { data: value } = await replaceShoot({ namespace, name, data })
        await this.$shootEditor.dispatch('update', value)

        this.snackbarColor = 'success'
        this.snackbarText = 'Cluster specification has been successfully updated'
        this.snackbar = true
      } catch (err) {
        this.errorMessage = get(err, 'response.data.message', err.message)
      }
    },
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        captionText: 'Leave Editor?',
        messageHtml: 'Your changes have not been saved.<br/>Are you sure you want to leave the editor?'
      })
    },
    confirmOverwrite () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Save',
        captionText: 'Confirm Overwrite',
        messageHtml: 'Meanwhile another user or process has changed the cluster resource.<br/>Are you sure you want to overwrite it?'
      })
    },
    focus () {
      this.$shootEditor.dispatch('focus')
    }
  },
  mounted () {
    const modificationWarning = this.$localStorage.getItem('showShootEditorWarning')
    this.modificationWarning = modificationWarning === null || modificationWarning === 'true'
  },
  async beforeRouteLeave (to, from, next) {
    if (this.clean) {
      return next()
    }
    try {
      if (await this.confirmEditorNavigation()) {
        next()
      } else {
        this.focus()
        next(false)
      }
    } catch (err) {
      next(err)
    }
  }
}
</script>
