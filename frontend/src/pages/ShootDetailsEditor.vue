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
     <shoot-item-editor
       :modificationWarning="modificationWarning"
       @dismissModificationWarning="onDismissModificationWarning"
       :errorMessage.sync="errorMessage"
       :detailedErrorMessage.sync="detailedErrorMessage"
       :shootContent="shootContent"
       :extraKeys="extraKeys"
       @clean="onClean"
       @conflictPath="onConflictPath"
       ref="shootEditor">
       <template slot="modificationWarning">
         By modifying the resource directly you may cause serious problems in your cluster.
         We cannot guarantee that you can solve problems that result from using Cluster Editor incorrectly.
       </template>
       <template slot="toolbarItemsLeft">
         <v-tooltip top>
           <v-btn icon slot="activator" :disabled="clean" @click="save">
             <v-icon small>mdi-content-save</v-icon>
           </v-btn>
           <span>Save</span>
         </v-tooltip>
       </template>
       <template slot="toolbarItemsRight">
         <v-tooltip top :color="hasConflict ? 'error' : ''">
           <div slot="activator" class="px-3 py-2">
           <v-icon :class="hasConflict ? 'error--text' : 'success--text'">
             {{hasConflict ? 'mdi-alert-circle' : 'mdi-check-circle'}}
           </v-icon>
           </div>
           <span v-if="hasConflict">Cluster resource has been modified<br>by another user or process</span>
           <span v-else>Cluster resource can be saved<br>without any conflicts</span>
         </v-tooltip>
       </template>
    </shoot-item-editor>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-layout>
</template>

<script>
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import ShootItemEditor from '@/components/ShootItemEditor'
import { mapGetters, mapState } from 'vuex'
import { replaceShoot } from '@/utils/api'

// lodash
import get from 'lodash/get'
import pick from 'lodash/pick'

// js-yaml
import jsyaml from 'js-yaml'

let vm

export default {
  components: {
    ShootItemEditor,
    ConfirmDialog
  },
  name: 'shoot-details-editor',
  data () {
    return {
      modificationWarning: true,
      clean: true,
      hasConflict: false,
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      isShootCreated: false,
      extraKeys: {
        'Ctrl-S' (instance) {
          vm.save()
        },
        'Cmd-S' (instance) {
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
          return this.$refs.shootEditor.clearHistory()
        }
        if (this.hasConflict && !(await this.confirmOverwrite())) {
          return
        }

        const paths = ['spec', 'metadata.labels', 'metadata.annotations']
        const data = pick(jsyaml.safeLoad(this.$refs.shootEditor.getContent()), paths)
        const { metadata: { namespace, name } } = this.shootContent
        const { data: value } = await replaceShoot({ namespace, name, data })
        this.$refs.shootEditor.update(value)

        this.snackbarColor = 'success'
        this.snackbarText = `Cluster specification has been successfully updated`
        this.snackbar = true
      } catch (err) {
        this.errorMessage = get(err, 'response.data.message', err.message)
      }
    },
    confirmEditorNavigation () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Leave',
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
    }
  },
  mounted () {
    const modificationWarning = this.$localStorage.getItem('showShootEditorWarning')
    this.modificationWarning = modificationWarning === null || modificationWarning === 'true'
    vm = this
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
