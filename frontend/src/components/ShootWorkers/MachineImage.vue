<template>
  <v-select
    color="cyan darken-2"
    :items="machineImages"
    return-object
    :error-messages="getErrorMessages('worker.machineImage')"
    @input="onInputMachineImage"
    @blur="$v.worker.machineImage.$touch()"
    v-model="machineImage"
    label="Machine Image"
  >
    <template v-slot:item="{ item }">
      <v-list-tile-action>
        <vendor-icon v-model="item.icon"></vendor-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title>Name: {{item.name}} | Version: {{item.version}}</v-list-tile-title>
        <v-list-tile-sub-title v-if="item.expirationDate">
          <span>Expiration Date: {{item.expirationDateString}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
    <template v-slot:selection="{ item }">
      <vendor-icon v-model="item.icon"></vendor-icon>
      <span class="black--text ml-2">
       {{item.name}} [{{item.version}}]
      </span>
    </template>
  </v-select>
</template>

<script>
import VendorIcon from '@/components/VendorIcon'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import includes from 'lodash/includes'
import map from 'lodash/map'
import pick from 'lodash/pick'
import find from 'lodash/find'

const validationErrors = {
  worker: {
    machineImage: {
      required: 'Machine Image is required'
    }
  }
}

const validations = {
  worker: {
    machineImage: {
      required
    }
  }
}

export default {
  components: {
    VendorIcon
  },
  props: {
    worker: {
      type: Object,
      required: true
    },
    machineImages: {
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
    machineImage: {
      get () {
        const { name, version } = this.worker.machineImage
        return find(this.machineImages, { name, version })
      },
      set (machineImage) {
        this.worker.machineImage = pick(machineImage, ['name', 'version'])
      }
    }
  },
  validations,
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputMachineImage () {
      this.$v.worker.machineImage.$touch()
      this.$emit('updateMachineImage', this.worker.machineImage)
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
    machineImages (updatedMachineImages) {
      if (!includes(map(updatedMachineImages, 'name'), this.worker.machineImages)) {
        this.worker.machineImage = undefined
        this.onInputMachineImage()
      }
    }
  }
}
</script>
