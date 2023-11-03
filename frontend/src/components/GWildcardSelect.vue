<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-row">
    <v-select
      v-model="wildcardSelectedValue"
      color="primary"
      item-color="primary"
      :label="wildcardSelectLabel"
      :items="wildcardSelectItemObjects"
      return-object
      :error-messages="errors.wildcardSelectedValue"
      :hint="wildcardSelectHint"
      persistent-hint
      variant="underlined"
      @update:model-value="onInput"
      @blur="v$.wildcardSelectedValue.$touch()"
    >
      <template #selection="{ item }">
        <div class="d-flex align-center">
          <v-text-field
            v-if="wildcardSelectedValue.startsWithWildcard || wildcardSelectedValue.customWildcard"
            ref="wildCardStart"
            v-model="wildcardVariablePartPrefix"
            density="compact"
            class="mb-1 mr-1 selection-text-field"
            flat
            variant="outlined"
            color="primary"
            hide-details
            @click.stop="$refs.wildCardStart.focus()"
            @mousedown.stop="$refs.wildCardStart.focus()"
            @input="onInput"
          />
          <span>{{ item.raw.value }}</span>
          <v-text-field
            v-if="wildcardSelectedValue.endsWithWildcard"
            ref="wildCardEnd"
            v-model="wildcardVariablePartSuffix"
            density="compact"
            class="mb-1 ml-1 selection-text-field"
            flat
            variant="outlined"
            color="primary"
            hide-details
            @click.stop="$refs.wildCardEnd.focus()"
            @mousedown.stop="$refs.wildCardEnd.focus()"
            @input="onInput"
          />
        </div>
      </template>
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
        >
          <template v-if="item.raw.value.length">
            <span v-if="item.raw.startsWithWildcard">&lt;prefix&gt;</span>
            <span>{{ item.raw.value }}</span>
            <span v-if="item.raw.endsWithWildcard">&lt;suffix&gt;</span>
          </template>
          <template v-else>
            Custom {{ wildcardSelectLabel }}
          </template>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import { getVuelidateErrors } from '@/utils'
import {
  wildcardObjectsFromStrings,
  bestMatchForString,
} from '@/utils/wildcard'

import { trim } from '@/lodash'

export default {
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
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      wildcardVariablePartPrefix: undefined,
      wildcardVariablePartSuffix: undefined,
      wildcardSelectedValue: {},
    }
  },
  computed: {
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
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  watch: {
    modelValue (value) {
      this.setInternalValue(value)
    },
  },
  mounted () {
    this.setInternalValue(this.modelValue)
  },
  methods: {
    onInput () {
      this.v$.wildcardSelectedValue.$touch()
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
    return {
      wildcardSelectedValue: withFieldName(() => this.wildcardSelectLabel, {
        required: withMessage(`${this.wildcardSelectLabel} is required`, required),
        prefixRequired: withMessage('Prefix is required', () => {
          return this.wildcardVariablePartPrefix || !this.wildcardSelectedValue.startsWithWildcard
        }),
        suffixRequired: withMessage('Suffix is required', () => {
          return this.wildcardVariablePartSuffix || !this.wildcardSelectedValue.endsWithWildcard
        }),
        customRequired: withMessage('Custom value is required', () => {
          return this.wildcardVariablePartPrefix || !this.wildcardSelectedValue.customWildcard
        }),
      }),
    }
  },
}
</script>

<style lang="scss" scoped>
.selection-text-field {
  width: 100px;

  /* vuetify hides textfields inside v-select selection slot */
  :deep(input) {
    opacity: 1 !important;
    pointer-events: all !important;
    caret-color: auto !important;
  }
}

</style>
