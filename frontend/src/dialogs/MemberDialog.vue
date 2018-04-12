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
        <v-icon x-large class="white--text">mdi-account-plus</v-icon><span>Assign user to Project</span>
      </v-card-title>

      <v-card-text>

          <v-text-field
            color="green"
            ref="email"
            label="Email"
            v-model="email"
            :error-messages="emailErrors"
            @input="$v.email.$touch()"
            @blur="$v.email.$touch()"
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
  import { mapActions } from 'vuex'
  import { required, email } from 'vuelidate/lib/validators'

  const defaultEmail = 'john.doe@example.org'

  export default {
    name: 'member-dialog',
    props: {
      value: {
        type: Boolean,
        required: true
      }
    },
    data () {
      return {
        email: defaultEmail
      }
    },
    validations: {
      email: {
        required,
        email
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
      emailErrors () {
        const errors = []
        if (!this.$v.email.$dirty) {
          return errors
        }
        if (!this.$v.email.required) {
          errors.push('E-mail is required')
        }
        if (!this.$v.email.email) {
          errors.push('Must be valid e-mail')
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
        this.email = defaultEmail

        this.setFocusAndSelection()
      },
      setFocusAndSelection () {
        const textField = this.$refs.email
        if (textField) {
          const input = textField.$refs.input
          this.$nextTick(() => {
            input.focus()
            input.setSelectionRange(0, 8)
          })
        }
      },
      save () {
        const email = toLower(this.email)
        return this.addMember(email)
      }
    },
    watch: {
      value: function (value) {
        if (value) {
          this.reset()
        }
      }
    },
    created () {
      this.$bus.$on('esc-pressed', () => {
        this.cancel()
      })
    },
    mounted () {
      const textField = this.$refs.email
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
