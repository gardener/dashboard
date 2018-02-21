<!--
Copyright 2018 by The Gardener Authors.

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
  <confirm-dialog
    :value="value"
    @confirmed="onDeleteProject"
    @aborted="hide">
    <div slot="caption">
      Confirm Delete
    </div>
    <div slot="message">
      Are you sure to delete the project <b>{{name}}</b>?
      <br />
      <i class="red--text text--darken-2">The operation can not be undone.</i>
    </div>
  </confirm-dialog>
</template>


<script>
  import { mapActions, mapGetters } from 'vuex'
  import ConfirmDialog from '@/dialogs/ConfirmDialog'

  export default {
    components: {
      ConfirmDialog
    },
    props: {
      value: {
        type: Boolean,
        required: true
      },
      project: {
        type: Object,
        required: true
      }
    },
    data () {
      return {
      }
    },
    computed: {
      ...mapGetters([
        'shootList',
        'projectList'
      ]),
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      name () {
        return this.project.metadata ? this.project.metadata.name : ''
      }
    },
    methods: {
      ...mapActions([
        'deleteProject'
      ]),
      hide () {
        this.visible = false
      },
      onDeleteProject () {
        this
          .deleteProject(this.project)
          .then(() => {
            this.hide()
            if (this.projectList.length > 0) {
              const p1 = this.projectList[0]
              this.$router.push({name: 'Administration', params: { namespace: p1.metadata.namespace }})
            } else {
              this.$router.push({name: 'Home', params: { }})
            }
            this.$bus.$emit('toast', 'Project deleted successfully')
          })
      }
    }
  }
</script>

