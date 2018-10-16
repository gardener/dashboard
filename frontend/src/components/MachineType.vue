<template>
  <v-select
    color="cyan darken-2"
    :items="machineTypes"
    item-text="name"
    item-value="name"
    :error-messages="getErrorMessages('worker.machineType')"
    @input="$v.worker.machineType.$touch()"
    @blur="$v.worker.machineType.$touch()"
    v-model="worker.machineType"
    label="Machine Type"
  >
    <template slot="item" slot-scope="data">
      <v-list-tile-content>
        <v-list-tile-title>{{data.item.name}}</v-list-tile-title>
        <v-list-tile-sub-title>CPU: {{data.item.cpu}} | GPU: {{data.item.gpu}} | Memory: {{data.item.memory}}</v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
  </v-select>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'

const validationErrors = {
  worker: {
    machineType: {
      required: 'Machine Type is required'
    }
  }
}

const validations = {
  worker: {
    machineType: {
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
    machineTypes: {
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
