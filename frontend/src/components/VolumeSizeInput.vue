<!--
Copyright 2018 by The Gardener Authors.

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
  <v-text-field
    :min="min"
    :color="color"
    v-model="innerValue"
    suffix="Gi"
    :label="label"
    type="number"
    @blur="emitBlur"
    :error-messages="errorMessages"
    >
  </v-text-field>
</template>

<script>
  import { parseSize } from '@/utils'

  export default {
    props: ['value', 'label', 'color', 'errorMessages', 'min'],
    computed: {
      innerValue: {
        get () {
          return parseSize(this.value)
        },
        set (value) {
          this.$emit('input', this.format(value))
        }
      }
    },
    methods: {
      format (value) {
        return parseSize(value) + 'Gi'
      },
      emitBlur (e) {
        this.$emit('blur', e)
      }
    }
  }
</script>
