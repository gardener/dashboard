<template>
  <v-select
    color="cyan darken-2"
    :items="volumeTypeItems"
    item-text="name"
    item-value="name"
    v-model="worker.volume.type"
    :error-messages="getErrorMessages('worker.volume.type')"
    @input="onInputVolumeType"
    @blur="$v.worker.volume.type.$touch()"
    label="Volume Type">
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title v-if="data.item.class">Class: {{data.item.class}}</v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import find from 'lodash/find'

const validationErrors = {
  worker: {
    volume: {
      type: {
        required: 'Volume Type is required'
      }
    }
  }
}
const validations = {
  worker: {
    volume: {
      type: {
        required
      }
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
  computed: {
    volumeTypeItems () {
      const volumeTypes = this.volumeTypes.slice()
      if (this.unsupported) {
        volumeTypes.push({
          name: this.worker.volume.type
        })
      }
      this.onInputVolumeType()
      return volumeTypes
    },
    unsupported () {
      return !find(this.volumeTypes, ['name', this.worker.volume.type])
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputVolumeType () {
      this.$v.worker.volume.type.$touch()
      this.$emit('updateVolumeType', this.worker.volume.type)
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
  }
}
</script>
