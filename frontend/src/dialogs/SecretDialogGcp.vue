<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <secret-dialog
    :value=value
    :data="secretData"
    :dataValid="valid"
    :secret="secret"
    cloudProviderKind="gcp"
    color="green"
    infraIcon="gcp-white"
    backgroundSrc="/static/background_gcp.svg"
    createTitle="Add new Google Secret"
    replaceTitle="Replace Google Secret"
    @input="onInput">

    <template slot="data-slot">
      <v-layout column>
        <v-flex>
          <v-textarea
            ref="serviceAccountKey"
            color="green"
            box
            v-model="serviceAccountKey"
            :label="serviceAccountKeyLabel"
            :error-messages="getErrorMessages('serviceAccountKey')"
            @input="$v.serviceAccountKey.$touch()"
            @blur="$v.serviceAccountKey.$touch()"
            hint="Enter or drop a service account key in JSON format"
            persistent-hint
          ></v-textarea>
        </v-flex>
      </v-layout>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/dialogs/SecretDialog'
import { required } from 'vuelidate/lib/validators'
import { serviceAccountKey } from '@/utils/validators'
import { handleTextFieldDrop, getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  serviceAccountKey: {
    required: 'You can\'t leave this empty.',
    serviceAccountKey: 'Not a valid Service Account Key'
  }
}

export default {
  components: {
    SecretDialog
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    secret: {
      type: Object
    }
  },
  data () {
    return {
      serviceAccountKey: undefined,
      validationErrors
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    valid () {
      return !this.$v.$invalid
    },
    secretData () {
      return {
        'serviceaccount.json': this.serviceAccountKey
      }
    },
    validators () {
      const validators = {
        serviceAccountKey: {
          required,
          serviceAccountKey
        }
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    },
    serviceAccountKeyLabel () {
      return this.isCreateMode ? 'Service Account Key' : 'New Service Account Key'
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

      this.serviceAccountKey = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'serviceAccountKey')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    }
  },
  mounted () {
    const onDrop = (value) => {
      this.serviceAccountKey = value
    }
    handleTextFieldDrop(this.$refs.serviceAccountKey, /json/, onDrop)
  }
}
</script>

<style lang="styl" scoped>

  >>> .v-input__control textarea {
    font-family: monospace;
    font-size: 14px;
  }

</style>
