<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      :class="{ 'mt-5' : !wildcardSelectedValue.isWildcard}"
      class="selectClass"
      dense
      color="primary"
      item-color="primary"
      :label="wildcardSelectLabel"
      :items="wildcardSelectItemObjects"
      return-object
      v-model="wildcardSelectedValue"
      :error-messages="getErrorMessages('wildcardSelectedValue')"
      @input="onInput"
      @blur="$v.wildcardSelectedValue.$touch()"
      :hint="wildcardSelectHint"
      persistent-hint
    >
      <template v-slot:selection="{ item }">
        <span v-if="item.customWildcard">&lt;Custom&gt;</span>
        <span v-else>{{item.value}}</span>
      </template>
      <template v-slot:item="{ item }">
        <v-list-item-content>
          <v-list-item-title>
            <template v-if="item.value.length">
              <span v-if="item.startsWithWildcard">&lt;prefix&gt;</span>
              <span>{{item.value}}</span>
              <span v-if="item.endsWithWildcard">&lt;suffix&gt;</span>
            </template>
            <template v-else>
              Custom {{wildcardSelectLabel}}
            </template>
          </v-list-item-title>
        </v-list-item-content>
      </template>
      <template v-slot:prepend-inner v-if="wildcardSelectedValue.startsWithWildcard">
        <v-text-field
          style="width: 100px"
          @click.native.stop
          @input="onInput"
          outlined
          dense
          class="mb-1 mr-1"
          flat
          solo
          color="primary"
          hide-details
          v-model="wildcardVariablePartPrefix"
          ></v-text-field>
      </template>
      <template v-slot:append v-if="wildcardSelectedValue.endsWithWildcard || wildcardSelectedValue.customWildcard">
        <v-icon>mdi-menu-down</v-icon>
        <v-text-field
          style="width: 100px"
          @click.native.stop
          @input="onInput"
          outlined
          dense
          class="mb-1 ml-1"
          flat
          solo
          color="primary"
          hide-details
          v-model="wildcardVariablePartSuffix"
          ></v-text-field>
      </template>
    </v-select>
  </div>
</template>

<script>

import trim from 'lodash/trim'
import { getValidationErrors } from '@/utils'
import { required } from 'vuelidate/lib/validators'
import { wildcardObjectsFromStrings, bestMatchForString } from '@/utils/wildcard'

export default {
  name: 'wildcard-select',
  props: {
    wildcardSelectItems: {
      type: Array
    },
    wildcardSelectLabel: {
      type: String
    },
    value: {
      type: String
    }
  },
  data () {
    return {
      wildcardVariablePartPrefix: undefined,
      wildcardVariablePartSuffix: undefined,
      wildcardSelectedValue: {},
      valid: undefined
    }
  },
  computed: {
    validationErrors () {
      return {
        wildcardSelectedValue: {
          required: `${this.wildcardSelectLabel} is required`,
          prefixRequired: 'Prefix is required',
          suffixRequired: 'Suffix is required'
        }
      }
    },
    wildcardSelectItemObjects () {
      return wildcardObjectsFromStrings(this.wildcardSelectItems)
    },
    wildcardSelectHint () {
      return `Floating Pool Name: ${this.internalValue}`
    },
    internalValue () {
      if (this.wildcardSelectedValue.startsWithWildcard && this.wildcardSelectedValue.endsWithWildcard) {
        return `${this.wildcardVariablePartPrefix}${this.wildcardSelectedValue.value}${this.wildcardVariablePartSuffix}`
      }
      if (this.wildcardSelectedValue.startsWithWildcard) {
        return `${this.wildcardVariablePartPrefix}${this.wildcardSelectedValue.value}`
      }
      if (this.wildcardSelectedValue.endsWithWildcard) {
        return `${this.wildcardSelectedValue.value}${this.wildcardVariablePartSuffix}`
      }
      if (this.wildcardSelectedValue.customWildcard) {
        return this.wildcardVariablePartSuffix
      }
      return this.wildcardSelectedValue.value
    },
    validators () {
      return {
        wildcardSelectedValue: {
          required,
          prefixRequired: () => {
            return this.wildcardVariablePartPrefix || !this.wildcardSelectedValue.startsWithWildcard
          },
          suffixRequired: () => {
            return this.wildcardVariablePartSuffix || !this.wildcardSelectedValue.endsWithWildcard
          }
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput () {
      this.$v.wildcardSelectedValue.$touch()
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', this.valid)
      }
      this.$emit('input', this.internalValue)
    },
    setInternalValue (newValue) {
      const bestMatch = bestMatchForString(this.wildcardSelectItemObjects, newValue)
      if (!bestMatch) {
        return
      }

      this.wildcardSelectedValue = bestMatch
      const value = trim(newValue, '*')
      const index = value.indexOf(bestMatch.value)
      if (bestMatch.startsWithWildcard) {
        this.wildcardVariablePartPrefix = value.substring(0, index)
      } else {
        this.wildcardVariablePartPrefix = ''
      }
      if (bestMatch.endsWithWildcard || bestMatch.customWildcard) {
        const value = trim(newValue, '*')
        this.wildcardVariablePartSuffix = value.substring(index + bestMatch.value.length)
      } else {
        this.wildcardVariablePartSuffix = ''
      }

      this.onInput()
    }
  },
  validations () {
    return this.validators
  },
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
