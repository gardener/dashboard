<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-select
    hint="Change seed cluster for this shoot's control plane"
    color="primary"
    item-color="primary"
    label="Seed Cluster"
    :items="seedClusters"
    v-model="seedCluster"
    persistent-hint
    :error-messages="getErrorMessages('seedCluster')"
    @blur="$v.seedCluster.$touch()">
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  seedCluster: {
    required: 'Seed is required.'
  }
}

export default {
  name: 'seed-select',
  props: {
    seedClusters: {
      type: Array
    },
    value: {
      type: String
    },
    valid: {
      type: Boolean
    }
  },
  data () {
    return {
      validationErrors
    }
  },
  validations: {
    seedCluster: {
      required
    }
  },
  computed: {
    seedCluster: {
      get () {
        return this.value
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    '$v.seedCluster.$invalid' (value) {
      this.$emit('update:valid', !value)
    }
  },
  mounted () {
    this.$v.seedCluster.$touch()
  }
}
</script>
