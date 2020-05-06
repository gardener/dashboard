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
  <div class="d-flex flex-row">
    <v-select
      class="selectClass"
      color="cyan darken-2"
      item-color="cyan darken-2"
      :label="wildcardSelectLabel"
      :items="wildcardSelectItemObjects"
      return-object
      v-model="wildcardSelectedValue"
      :error-messages="getErrorMessages('wildcardSelectedValue')"
       @input="onInput"
      @blur="$v.wildcardSelectedValue.$touch()"
    >
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>{{item.text}}</v-list-item-title>
          <v-list-item-subtitle v-if="item.isWildcard">
            Wildcard
          </v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-select>
    <v-text-field
      v-if="wildcardSelectedValue.isWildcard"
      :class="textFieldClass"
      color="cyan darken-2"
      :label="wildcardTextFieldLabel"
      v-model="wildcardVariablePart"
      :error-messages="getErrorMessages('wildcardVariablePart')"
      @input="onInput"
      @blur="$v.wildcardVariablePart.$touch()"
      ></v-text-field>
  </div>
</template>

<script>
import startsWith from 'lodash/startsWith'
import endsWith from 'lodash/endsWith'
import map from 'lodash/map'
import forEach from 'lodash/forEach'
import trim from 'lodash/trim'
import { getValidationErrors } from '@/utils'
import { required, requiredIf } from 'vuelidate/lib/validators'

const validations = {
  wildcardVariablePart: {
    required: requiredIf(function () {
      return this.wildcardSelectedValue.isWildcard
    })
  },
  wildcardSelectedValue: {
    required
  }
}

export default {
  name: 'wildcard-select',
  props: {
    wildcardSelectItems: {
      type: Array
    },
    wildcardSelectLabel: {
      type: String
    },
    wildcardTextFieldLabel: {
      type: String,
      default: 'Name'
    },
    value: {
      type: String
    }
  },
  data () {
    return {
      wildcardVariablePart: undefined,
      wildcardSelectedValue: {},
      valid: undefined
    }
  },
  computed: {
    validationErrors () {
      return {
        wildcardVariablePart: {
          required: `${this.wildcardTextFieldLabel} is required`
        },
        wildcardSelectedValue: {
          required: `${this.wildcardSelectLabel} is required`
        }
      }
    },
    textFieldClass () {
      return this.wildcardSelectedValue.startsWithWildcard ? 'textFieldStartClass' : 'textFieldEndClass'
    },
    wildcardSelectItemObjects () {
      return map(this.wildcardSelectItems, item => {
        let startsWithWildcard = false
        let endsWithWildcard = false

        let selectedValue = item
        if (startsWith(item, '*')) {
          startsWithWildcard = true
        }
        if (endsWith(item, '*')) {
          endsWithWildcard = true
        }
        selectedValue = trim(item, '*')

        return {
          text: selectedValue,
          value: selectedValue,
          startsWithWildcard,
          endsWithWildcard,
          isWildcard: startsWithWildcard | endsWithWildcard
        }
      })
    },
    internalValue () {
      if (this.wildcardSelectedValue.startsWithWildcard) {
        return `${this.wildcardVariablePart}${this.wildcardSelectedValue.value}`
      }
      if (this.wildcardSelectedValue.endsWithWildcard) {
        return `${this.wildcardSelectedValue.value}${this.wildcardVariablePart}`
      }
      return this.wildcardSelectedValue.value
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput () {
      this.$v.wildcardVariablePart.$touch()
      this.$v.wildcardSelectedValue.$touch()
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', this.valid)
      }
      this.$emit('input', this.internalValue)
    },
    setInternalValue (value) {
      const rawValue = trim(value, '*')
      if (!rawValue) {
        return
      }
      const valueLength = rawValue.length
      let smallestVariablePartLength = valueLength
      forEach(this.wildcardSelectItemObjects, itemObject => {
        if (rawValue.includes(itemObject.value)) {
          const variablePartLength = valueLength - itemObject.value.length
          if (variablePartLength < smallestVariablePartLength) {
            smallestVariablePartLength = variablePartLength
            this.wildcardSelectedValue = itemObject
            if (smallestVariablePartLength > 0) {
              this.wildcardVariablePart = rawValue.replace(itemObject.value, '')
            } else {
              this.wildcardVariablePart = ''
            }
          }
        }
      })
      this.$emit('valid', this.valid)
      this.$v.wildcardVariablePart.$touch()
    }
  },
  validations,
  watch: {
    value (value) {
      this.setInternalValue(value)
    }
  },
  mounted () {
    this.setInternalValue(this.value)
  }
}
</script>

<style lang="scss" scoped>
  .textFieldStartClass {
    order: 1;
    margin-right: 5px;
  }
  .selectClass {
    order: 2;
  }
  .textFieldEndClass {
    order: 2;
    margin-left: 5px;
  }
</style>
