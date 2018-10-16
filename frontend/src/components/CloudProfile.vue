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
  <div>
    <template v-if="isCreateMode">
      <v-select
      :items="cloudProfiles"
      :value="value"
      item-value="metadata.name"
      item-text="metadata.displayName"
      label="Cloud Profile"
      :error-messages="getErrorMessages('value')"
      :color="color"
      @input="onInput"
      @blur="$v.value.$touch()"
      ></v-select>
    </template>
    <template v-else>
      <v-text-field
        v-model="value"
        :disabled="true"
        label="Cloud Profile"
      ></v-text-field>
    </template>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  value: {
    required: 'You can\'t leave this empty.'
  }
}

export default {
  name: 'CloudProfile',
  props: {
    value: {
      type: String
    },
    isCreateMode: {
      type: Boolean,
      required: true
    },
    cloudProfiles: {
      type: Array,
      required: true
    },
    color: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      validationErrors
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    validators () {
      return {
        value: {
          required
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput (value) {
      this.$v.value.$touch()

      this.$emit('input', value)
    }
  }
}
</script>
