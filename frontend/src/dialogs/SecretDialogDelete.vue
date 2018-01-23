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
    <v-card class="delete_credential">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-alert-outline</v-icon><span>Confirm Delete</span>
      </v-card-title>

      <v-card-text>
        <v-container fluid>

          <div slot="message">
            Are you sure to delete the secret <b>{{name}}</b>? <span class="red--text">The operation
            can not be undone.</span>
          </div>

        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.native="hide">Cancel</v-btn>
        <v-btn flat @click.native="onDeleteSecret" class="blue--text">Delete Secret</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
  import { mapActions } from 'vuex'

  export default {
    props: {
      value: {
        type: Boolean,
        required: true
      },
      secret: {
        type: Object,
        required: true
      }
    },
    data () {
      return {
      }
    },
    computed: {
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      name () {
        return this.secret.metadata ? this.secret.metadata.name : ''
      }
    },
    methods: {
      ...mapActions('infrastructureSecrets', {
        deleteSecret: 'delete'
      }),
      hide () {
        this.visible = false
      },
      onDeleteSecret () {
        this
          .deleteSecret(this.name)
          .then(() => this.hide())
          .catch(err => console.error(err))
      }
    }
  }
</script>


<style lang="styl">
  .delete_credential {
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
