<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      class="selectClass"
      :class="selectClass"
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
               <span v-if="item.isWildcard">Custom {{wildcardSelectLabel}}</span>
            </template>
          </v-list-item-title>
        </v-list-item-content>
      </template>
    </v-select>
    <v-text-field
      v-if="wildcardSelectedValue.isWildcard"
      :class="textFieldClass"
      color="primary"
      :label="wildcardTextFieldLabel"
      v-model="wildcardVariablePart"
      :error-messages="getErrorMessages('wildcardVariablePart')"
      @input="onInput"
      @blur="$v.wildcardVariablePart.$touch()"
      ></v-text-field>
  </div>
</template>

<script>

import trim from 'lodash/trim'
import { getValidationErrors } from '@/utils'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { wildcardObjectsFromStrings, bestMatchForString } from '@/utils/wildcard'

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
    selectClass () {
      if (this.wildcardSelectedValue.customWildcard) {
        return 'selectSmallClass'
      }
      return undefined
    },
    wildcardSelectItemObjects () {
      return wildcardObjectsFromStrings(this.wildcardSelectItems)
    },
    wildcardTextFieldLabel () {
      if (this.wildcardSelectedValue.startsWithWildcard) {
        return 'Prefix'
      }
      if (this.wildcardSelectedValue.endsWithWildcard) {
        return 'Suffix'
      }
      if (this.wildcardSelectedValue.customWildcard) {
        return `Custom ${this.wildcardSelectLabel}`
      }
      return undefined
    },
    wildcardSelectHint () {
      if (!this.wildcardSelectedValue.isWildcard) {
        return undefined
      }
      if (this.wildcardSelectedValue.customWildcard) {
        return `Specify custom ${this.wildcardSelectLabel}`
      } else {
        const label = this.wildcardSelectedValue.startsWithWildcard ? 'prefix' : 'suffix'
        return `Selected wildcard value requires a ${label} which needs to be specified`
      }
    },
    internalValue () {
      if (this.wildcardSelectedValue.startsWithWildcard) {
        return `${this.wildcardVariablePart}${this.wildcardSelectedValue.value}`
      }
      if (this.wildcardSelectedValue.endsWithWildcard) {
        return `${this.wildcardSelectedValue.value}${this.wildcardVariablePart}`
      }
      if (this.wildcardSelectedValue.customWildcard) {
        return this.wildcardVariablePart
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
    setInternalValue (newValue) {
      const bestMatch = bestMatchForString(this.wildcardSelectItemObjects, newValue)
      if (!bestMatch) {
        return
      }

      this.wildcardSelectedValue = bestMatch
      if (bestMatch.isWildcard) {
        const value = trim(newValue, '*')
        this.wildcardVariablePart = value.replace(bestMatch.value, '')
      } else {
        this.wildcardVariablePart = ''
      }

      this.onInput()
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
  .selectSmallClass {
    max-width: 120px;
  }
</style>
