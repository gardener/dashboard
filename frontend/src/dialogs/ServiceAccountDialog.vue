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

<template >
  <v-dialog v-model="visible" max-width="650">
    <v-card class="add_user_to_project">
      <v-card-title>
        <v-icon x-large class="white--text">mdi-account-plus</v-icon><span>Add Service Account to Project</span>
      </v-card-title>

      <v-card-text>

          <v-text-field
            color="green"
            ref="serviceaccountName"
            label="Service Account"
            v-model="serviceaccountName"
            :error-messages="serviceaccountNameErrors"
            @input="$v.serviceaccountName.$touch()"
            @blur="$v.serviceaccountName.$touch()"
            required
            tabindex="1"
          ></v-text-field>

      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat @click.stop="cancel" tabindex="3">Cancel</v-btn>
        <v-btn flat @click.stop="submit" :disabled="!valid" class="green--text" tabindex="2">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import toLower from 'lodash/toLower'
  import { mapActions, mapState } from 'vuex'
  import { required } from 'vuelidate/lib/validators'
  import { resourceName } from '@/utils/validators'

  const defaultName = 'robot'
  export default {
    name: 'service-account-dialog',
    props: {
      value: {
        type: Boolean,
        required: true
      }
    },
    data () {
      return {
        serviceaccountName: defaultName
      }
    },
    validations: {
      serviceaccountName: {
        required,
        resourceName
      }
    },
    computed: {
      ...mapState([
        'namespace'
      ]),
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      },
      serviceaccountNameErrors () {
        const errors = []
        if (!this.$v.serviceaccountName.$dirty) {
          return errors
        }
        if (!this.$v.serviceaccountName.required) {
          errors.push('Service Account is required')
        }
        if (!this.$v.serviceaccountName.resourceName) {
          errors.push('Must contain only alphanumeric characters or hypen')
        }
        return errors
      },
      valid () {
        return !this.$v.$invalid
      }
    },
    methods: {
      ...mapActions([
        'addMember'
      ]),
      hide () {
        this.visible = false
      },
      submit () {
        this.$v.$touch()
        const hide = () => this.hide()
        if (this.valid) {
          this.save()
            .then(hide)
            .catch(hide)
        }
      },
      cancel () {
        this.hide()
      },
      reset () {
        this.$v.$reset()
        this.serviceaccountName = defaultName

        this.setFocus()
      },
      setFocus () {
        const textField = this.$refs.serviceaccount
        if (textField) {
          const input = textField.$refs.input
          this.$nextTick(() => {
            input.focus()
            input.setSelectionRange(0, 5)
          })
        }
      },
      save () {
        const namespace = this.namespace
        const name = toLower(this.serviceaccountName)
        return this.addMember(`system:serviceaccount:${namespace}:${name}`)
      }
    },
    watch: {
      value: function (value) {
        if (value) {
          this.reset()
        }
      }
    },
    mounted () {
      const textField = this.$refs.serviceaccountName
      if (textField) {
        const input = textField.$refs.input
        input.style.textTransform = 'lowercase'
      }
    }
  }
</script>

<style lang="styl">
  .add_user_to_project {
    .card__title{
      background-image: url(../assets/add_user_background.svg);
      background-size: cover;
      color:white;
      height:130px;
      span{
        font-size:25px !important
        padding-left:30px
        font-weight:400 !important
        padding-top:15px !important
      }
      .icon {
        font-size: 50px !important;
      }
    }
  }
</style>
