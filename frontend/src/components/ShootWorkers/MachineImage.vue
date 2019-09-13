<template>
  <v-select
    color="cyan darken-2"
    :items="machineImageItems"
    return-object
    item-text="name"
    item-value="name"
    :error-messages="getErrorMessages('worker.machineImage')"
    @input="onInputMachineImage"
    @blur="$v.worker.machineImage.$touch()"
    v-model="machineImage"
    label="Machine Image"
  >
    <template slot="item" slot-scope="data">
      <v-list-tile-action>
        <vendor-icon v-model="data.item.icon"></vendor-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title>Name: {{data.item.name}} | Version: {{data.item.version}}</v-list-tile-title>
        <v-list-tile-sub-title v-if="data.item.expirationDate">
          <span>Expiration Date: {{data.item.expirationDateString}}</span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </template>
    <template slot="selection" slot-scope="data">
      <vendor-icon v-model="data.item.icon"></vendor-icon>
      <span class="black--text ml-2">
       {{data.item.name}} [{{data.item.version}}]
      </span>
    </template>
  </v-select>
</template>

<script>
import VendorIcon from '@/components/VendorIcon'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, getTimestampFormatted } from '@/utils'
import includes from 'lodash/includes'
import map from 'lodash/map'
import lowerCase from 'lodash/lowerCase'
import pick from 'lodash/pick'

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
    machineImageItems () {
      return map(this.machineImages, machineImage => {
        machineImage.icon = this.iconForImageName(machineImage.name)
        machineImage.expirationDateString = getTimestampFormatted(machineImage.expirationDate)
        return machineImage
      })
    },
    machineImage: {
      get: function () {
        return this.worker.machineImage
      },
      set: function (machineImage) {
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
    },
    iconForImageName (imageName) {
      const lowerCaseName = lowerCase(imageName)
      if (lowerCaseName.includes('coreos')) {
        return 'coreos'
      } else if (lowerCaseName.includes('ubuntu')) {
        return 'ubuntu'
      } else if (lowerCaseName.includes('suse')) {
        return 'suse'
      }
      return 'mdi-blur-radial'
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
