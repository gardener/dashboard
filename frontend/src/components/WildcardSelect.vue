<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      class="selectClass"
      :class="selectClass"
      color="cyan darken-2"
      item-color="cyan darken-2"
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
import trim from 'lodash/trim'
import filter from 'lodash/filter'
import head from 'lodash/head'
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
      return map(this.wildcardSelectItems, item => {
        let startsWithWildcard = false
        let endsWithWildcard = false
        let customWildcard = false
        const value = trim(item, '*')
        let pattern = value

        if (item === '*') {
          customWildcard = true
          pattern = '.*'
        } else if (startsWith(item, '*')) {
          startsWithWildcard = true
          pattern = '.*' + pattern
        } else if (endsWith(item, '*')) {
          endsWithWildcard = true
          pattern = pattern + '.*'
        }

        return {
          value,
          startsWithWildcard,
          endsWithWildcard,
          customWildcard,
          isWildcard: startsWithWildcard || endsWithWildcard || customWildcard,
          regex: new RegExp('^' + pattern + '$')
        }
      })
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
      const matches = filter(this.wildcardSelectItemObjects, (item) => {
        return item.regex.test(newValue)
      })
      matches.sort(function (a, b) {
        return b.value.length - a.value.length
      })
      matches.sort(function (a, b) {
        if (a.isWildcard && !b.isWildcard) {
          return 1
        }
        if (b.isWildcard && !a.isWildcard) {
          return -1
        }
        if (a.customWildcard && !b.customWildcard) {
          return 1
        }
        if (b.customWildcard && !a.customWildcard) {
          return -1
        }
        return 0
      })

      const bestMatch = head(matches)
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
