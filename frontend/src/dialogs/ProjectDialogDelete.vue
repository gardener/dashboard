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
  <v-dialog v-model="visible" max-width="800">
    <v-card class="delete_project">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-alert-outline</v-icon><span>Confirm Delete</span>
      </v-card-title>

      <v-card-text>
        <v-container fluid>

          <div slot="message">
            Are you sure to delete the project <b>{{name}}</b>? <span class="red--text">The operation
            can not be undone.</span>
          </div>

        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="hide">Cancel</v-btn>
        <v-btn flat @click.native="onDeleteProject" class="blue--text">Delete Project</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions, mapGetters } from 'vuex'

  export default {
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


<style lang="styl">
  .delete_project {
    .card__title{
      background-image: url(../assets/aws_background.svg);
      background-size: cover;
      color:white;
      height:130px;
    span{
      font-size:30px !important
      padding-left:30px
      font-weight:400 !important
      padding-top:30px !important
    }
    .icon {
      font-size:90px !important;
    }

    }
  }
</style>
