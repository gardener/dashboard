<template>
  <v-select
    color="cyan darken-2"
    :items="volumeTypes"
    item-text="name"
    item-value="name"
    v-model="worker.volumeType"
    :error-messages="getErrorMessages('worker.volumeType')"
    @input="$v.worker.volumeType.$touch()"
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
      validationErrors
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  mounted () {
    this.$v.$touch()
  }
}
</script>
