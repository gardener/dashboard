<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

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
      @update:modelValue="onInput"
      @blur="v$.wildcardSelectedValue.$touch()"
      :hint="wildcardSelectHint"
      persistent-hint
      variant="underlined"
    >
      <template #selection="{ item }">
        <div class="d-flex align-center">
          <v-text-field
            v-if="wildcardSelectedValue.startsWithWildcard || wildcardSelectedValue.customWildcard"
            @click.stop="$refs.wildCardStart.focus()"
            outlined
            density="compact"
            class="mb-1 mr-1 text-field"
            flat
            variant="outlined"
            color="primary"
            hide-details
            v-model="wildcardVariablePartPrefix"
            ref="wildCardStart"
            >
          </v-text-field>
          <span>{{item.raw.value}}</span>
          <v-text-field
            v-if="wildcardSelectedValue.endsWithWildcard"
            @click.stop="$refs.wildCardEnd.focus()"
            @input="onInput"
            outlined
            density="compact"
            class="mb-1 ml-1 text-field"
            flat
            variant="outlined"
            color="primary"
            hide-details
            v-model="wildcardVariablePartSuffix"
            ref="wildCardEnd"
            >
          </v-text-field>
        </div>
      </template>
      <template #item="{ item, props }">
        <v-list-item v-bind="omit(props, 'title')">
          <template v-if="item.raw.value.length">
            <span v-if="item.raw.startsWithWildcard">&lt;prefix&gt;</span>
            <span>{{item.raw.value}}</span>
            <span v-if="item.raw.endsWithWildcard">&lt;suffix&gt;</span>
          </template>
          <template v-else>
            Custom {{wildcardSelectLabel}}
          </template>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import trim from 'lodash/trim'
import { getValidationErrors } from '@/utils'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { wildcardObjectsFromStrings, bestMatchForString } from '@/utils/wildcard'
import omit from 'lodash/omit'

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  props: {
    wildcardSelectItems: {
      type: Array,
    },
    wildcardSelectLabel: {
      type: String,
    },
    modelValue: {
      type: String,
    },
  },
  emits: [
    'valid',
    'update:modelValue',
  ],
  data () {
    return {
      wildcardVariablePartPrefix: undefined,
      wildcardVariablePartSuffix: undefined,
      wildcardSelectedValue: {},
      valid: undefined,
    }
  },
  computed: {
    validationErrors () {
      return {
        wildcardSelectedValue: {
          required: `${this.wildcardSelectLabel} is required`,
          prefixRequired: 'Prefix is required',
          suffixRequired: 'Suffix is required',
          customRequired: 'Custom value is required',
        },
      }
    },
    wildcardSelectItemObjects () {
      return wildcardObjectsFromStrings(this.wildcardSelectItems)
    },
    wildcardSelectHint () {
      return `Selected ${this.wildcardSelectLabel}: ${this.internalValue}`
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
        return this.wildcardVariablePartPrefix
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
          },
          customRequired: () => {
            return this.wildcardVariablePartPrefix || !this.wildcardSelectedValue.customWildcard
          },
        },
      }
    },
  },
  methods: {
    omit,
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInput () {
      this.v$.wildcardSelectedValue.$touch()
      if (this.valid !== !this.v$.$invalid) {
        this.valid = !this.v$.$invalid
        this.$emit('valid', this.valid)
      }
      this.$emit('update:modelValue', this.internalValue)
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
    },
  },
  validations () {
    return this.validators
  },
  watch: {
    modelValue (value) {
      this.setInternalValue(value)
    },
  },
  mounted () {
    this.setInternalValue(this.modelValue)
  },
})
</script>

<style lang="scss" scoped>
.text-field {
  width: 100px;
}

</style>
