<template>
  <v-select
    color="cyan darken-2"
    :items="volumeTypes"
    item-text="name"
    item-value="name"
    v-model="worker.volumeType"
    :error-messages="getErrorMessages('worker.volumeType')"
    @input="onInputVolumeType"
    @blur="$v.worker.volumeType.$touch()"
    label="Volume Type">
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>Class: {{data.item.class}}</v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import includes from 'lodash/includes'
import map from 'lodash/map'

const validationErrors = {
  worker: {
    volumeType: {
      required: 'Volume Type is required'
    }
  }
}
const validations = {
  worker: {
    volumeType: {
      required
    }
  }
}

export default {
  props: {
    worker: {
      type: Object,
      required: true
    },
    volumeTypes: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      validationErrors,
      valid: undefined
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputVolumeType () {
      this.$v.worker.volumeType.$touch()
      this.$emit('updateVolumeType', this.worker.volumeType)
      this.validateInput()
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', { id: this.worker.id, valid: this.valid })
      }
    }
  },
  mounted () {
    this.$v.$touch()
    this.validateInput()
  },
  watch: {
    volumeTypes (updatedVolumeTypes) {
      if (!includes(map(updatedVolumeTypes, 'name'), this.worker.volumeType)) {
        this.worker.volumeType = undefined
        this.onInputVolumeType()
      }
    }
  }
}
</script>
