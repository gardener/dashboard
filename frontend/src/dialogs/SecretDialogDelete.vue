<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-card>
      <v-img
        class="white--text"
        height="130px"
        :src="backgroundSrc"
      >
        <v-container fill-height>
          <v-layout align-center justify-start row fill-height>
            <v-flex xs1>
              <v-icon x-large class="white--text icon">mdi-alert-outline</v-icon>
            </v-flex>
            <v-flex>
              <div class="credential_title">Confirm Delete</div>
            </v-flex>
          </v-layout>
        </v-container>
      </v-img>

      <v-card-text>
        <v-container fluid>
          <div slot="message">
            Are you sure to delete the secret <b>{{name}}</b>? <br /><span class="red--text text--darken-2">The operation
            can not be undone.</span>
          </div>
        </v-container>
        <alert color="error" :message.sync="errorMessage" :detailedMessage.sync="detailedErrorMessage"></alert>
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
  import get from 'lodash/get'
  import Alert from '@/components/Alert'
  import { errorDetailsFromError } from '@/utils/error'

  export default {
    name: 'secret-dialog-delete',
    components: {
      Alert
    },
    props: {
      value: {
        type: Boolean,
        required: true
      },
      secret: {
        type: Object,
        required: true
      },
      backgroundSrc: {
        type: String,
        required: true
      }
    },
    data () {
      return {
        errorMessage: undefined,
        detailedErrorMessage: undefined
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
        return get(this.secret, 'metadata.name', '')
      }
    },
    methods: {
      ...mapActions({
        deleteSecret: 'deleteInfrastructureSecret'
      }),
      hide () {
        this.visible = false
      },
      onDeleteSecret () {
        const bindingName = get(this.secret, 'metadata.bindingName')
        this
          .deleteSecret(bindingName)
          .then(() => this.hide())
          .catch(err => {
            this.errorMessage = 'Failed to delete Infrastructure Secret.'

            const errorDetails = errorDetailsFromError(err)
            console.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
            this.detailedErrorMessage = errorDetails.detailedMessage
          })
      },
      reset () {
        this.errorMessage = undefined
        this.detailedMessage = undefined
      }
    },
    watch: {
      value: function (value) {
        if (value) {
          this.reset()
        }
      }
    }
  }
</script>


<style lang="styl" scoped>
  .icon {
    font-size:90px
  }

  .credential_title {
    font-size:30px
    font-weight:400
  }
</style>
