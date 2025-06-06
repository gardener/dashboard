<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-dialog
    v-model="visible"
    max-width="850"
    scrollable
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-account-plus"
        :title="title"
      >
        <template #append>
          <v-btn
            variant="text"
            size="small"
            icon="mdi-help"
            :class="helpVisible ? 'toolbar-title text-toolbar' : 'toolbar text-toolbar-title'"
            @click="helpVisible = !helpVisible"
          />
        </template>
      </g-toolbar>
      <v-card-text>
        <div class="d-flex flex-row pa-3">
          <div
            ref="secretDetails"
            class="d-flex flex-column flex-grow-1"
          >
            <div>
              <template v-if="isCreateMode">
                <v-text-field
                  ref="name"
                  v-model.trim="name"
                  color="primary"
                  label="Secret Name"
                  :error-messages="getErrorMessages(v$.name)"
                  variant="underlined"
                  @update:model-value="v$.name.$touch()"
                  @blur="v$.name.$touch()"
                />
              </template>
              <template v-else>
                <div class="text-h6 pb-4">
                  {{ name }} ({{ binding.kind }})
                </div>
              </template>
            </div>
            <slot name="secret-slot" />
            <g-message
              v-model:message="errorMessage"
              v-model:detailed-message="detailedErrorMessage"
              color="error"
            />
          </div>
          <v-slide-x-reverse-transition>
            <div
              v-if="helpVisible"
              class="ml-6 help-container"
              :style="helpContainerStyles"
            >
              <g-scroll-container class="help-content">
                <slot name="help-slot" />
              </g-scroll-container>
            </div>
          </v-slide-x-reverse-transition>
        </div>
      </v-card-text>
      <div>
        <v-alert
          v-if="!isCreateMode && isOrphanedCredential"
          :value="true"
          type="info"
          color="primary"
          variant="tonal"
        >
          The Secret <code>{{ credentialName }}</code> for this <code>Binding</code> does not exist anymore and will be re-created if you update the data.
        </v-alert>
        <v-alert
          :model-value="!isCreateMode && credentialUsageCount > 0"
          type="warning"
          rounded="0"
          class="mb-2"
        >
          <div>This <code>Secret</code> is used by {{ credentialUsageCount }} {{ credentialUsageCount === 1 ? 'cluster' : 'clusters' }}. The new <code>Secret</code> should be part of the same account as the one that gets replaced.</div>
          <div>Clusters will only start using the new <code>Secret</code> after they are reconciled. Therefore, wait until all clusters using the <code>Secret</code> are reconciled before you disable the old <code>Secret</code> in your infrastructure account. Otherwise the clusters will no longer function.</div>
        </v-alert>
        <v-alert
          :model-value="!isCreateMode && bindingsWithSameCredential.length > 0"
          type="info"
          rounded="0"
          class="mb-2 list-style"
        >
          This <code>Secret</code> is also referenced by
          <ul>
            <li
              v-for="referencedBinding in bindingsWithSameCredential"
              :key="referencedBinding.metadata.uid"
            >
              <pre>{{ referencedBinding.metadata.name }} ({{ (referencedBinding.kind) }})</pre>
            </li>
          </ul>
          Updating <code>Secret</code> data for this <code>{{ binding.kind }}</code> will also affect the other <code>Bindings</code> that reference this <code>Secret</code>.
        </v-alert>
      </div>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="text"
          color="primary"
          @click="submit"
        >
          {{ submitButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import {
  mapActions,
  mapState,
} from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  maxLength,
} from '@vuelidate/validators'
import { toRef } from 'vue'

import { useCredentialStore } from '@/store/credential'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useShootStore } from '@/store/shoot'

import GToolbar from '@/components/GToolbar.vue'
import GMessage from '@/components/GMessage'
import GScrollContainer from '@/components/GScrollContainer'

import { useSecretContext } from '@/composables/credential/useSecretContext'
import { useSecretBindingContext } from '@/composables/credential/useSecretBindingContext'
import { useCredentialsBindingContext } from '@/composables/credential/useCredentialsBindingContext'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import {
  messageFromErrors,
  withFieldName,
  unique,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
} from '@/utils/validators'
import {
  errorDetailsFromError,
  isConflict,
} from '@/utils/error'
import {
  getErrorMessages,
  setDelayedInputFocus,
  setInputFocus,
} from '@/utils'

export default {
  components: {
    GMessage,
    GToolbar,
    GScrollContainer,
  },
  inject: ['logger'],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secretValidations: {
      // need to pass nested validation object which shares scope,
      // as v$ is part of secretValidations but not vice versa
      type: Object,
      required: true,
    },
    providerType: {
      type: String,
      required: true,
    },
    createTitle: {
      type: String,
      required: true,
    },
    updateTitle: {
      type: String,
      required: true,
    },
    binding: {
      type: Object,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const binding = toRef(props, 'binding')
    const {
      isOrphanedCredential,
      credentialUsageCount,
      credentialName,
      isSecretBinding,
      isCredentialsBinding,
      isDnsBinding,
      bindingsWithSameCredential,
      credential,
    } = useCloudProviderBinding(binding)

    let bindingContext
    if (!props.binding) {
      // New binding always created as type 'CredentialsBinding'
      bindingContext = useCredentialsBindingContext()
    } else if (isSecretBinding) {
      bindingContext = useSecretBindingContext()
    } else if (isCredentialsBinding) {
      bindingContext = useCredentialsBindingContext()
    }

    const {
      createBindingManifest,
      setBindingManifest,
      bindingManifest,
      bindingName,
      bindingProviderType,
      bindingRef,
    } = bindingContext

    const {
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName,
    } = useSecretContext()

    return {
      createBindingManifest,
      setBindingManifest,
      bindingManifest,
      bindingName,
      bindingProviderType,
      bindingRef,
      createSecretManifest,
      setSecretManifest,
      secretManifest,
      secretName,
      isOrphanedCredential,
      credentialUsageCount,
      credentialName,
      isDnsBinding,
      bindingsWithSameCredential,
      credential,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      errorMessage: undefined,
      detailedErrorMessage: undefined,
      helpVisible: false,
    }
  },
  validations () {
    const rules = {}
    if (!this.isCreateMode) {
      return rules
    }

    const nameRules = {
      required,
      maxLength: maxLength(128),
      lowerCaseAlphaNumHyphen,
      noStartEndHyphen,
      unique: unique(this.isDnsBinding ? 'dnsSecretNames' : 'infrastructureSecretNames'),
    }
    rules.name = withFieldName('Secret Name', nameRules)

    return rules
  },
  computed: {
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    ...mapState(useShootStore, ['shootList']),
    ...mapState(useCredentialStore, [
      'infrastructureBindingList',
      'dnsBindingList',
    ]),
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    infrastructureSecretNames () {
      return this.infrastructureBindingList.map(item => item.metadata.name)
    },
    dnsSecretNames () {
      return this.dnsBindingList.map(item => item.metadata.name)
    },
    isCreateMode () {
      return !this.binding
    },
    submitButtonText () {
      return this.isCreateMode ? 'Add Secret' : 'Update Secret'
    },
    title () {
      return this.isCreateMode ? this.createTitle : this.updateTitle
    },
    helpContainerStyles () {
      const detailsRef = this.$refs.secretDetails
      let detailsHeight = 0
      if (detailsRef) {
        detailsHeight = detailsRef.getBoundingClientRect().height
      }
      return {
        maxHeight: `${detailsHeight}px`,
        maxWidth: '50%',
      }
    },
    name: {
      get () {
        return this.bindingName
      },
      set (value) {
        this.bindingName = value
        this.secretName = value
        this.bindingRef.name = value
      },
    },
  },
  mounted () {
    this.reset()
  },
  methods: {
    ...mapActions(useCredentialStore, [
      'createCredential',
      'updateCredential',
    ]),
    hide () {
      this.visible = false
    },
    cancel () {
      this.hide()
    },
    async submit () {
      if (this.secretValidations.$invalid) {
        await this.secretValidations.$validate()
        const message = messageFromErrors(this.secretValidations.$errors)
        this.errorMessage = 'There are input errors that you need to resolve'
        this.detailedErrorMessage = message
        return
      }
      try {
        await this.save()
        this.hide()
      } catch (err) {
        const errorDetails = errorDetailsFromError(err)
        if (this.isCreateMode) {
          if (isConflict(err)) {
            this.errorMessage = `Infrastructure Secret name '${this.name}' is already taken. Please try a different name.`
            setInputFocus(this, 'name')
          } else {
            this.errorMessage = 'Failed to create Infrastructure Secret.'
          }
        } else {
          this.errorMessage = 'Failed to update Infrastructure Secret.'
        }
        this.detailedErrorMessage = errorDetails.detailedMessage
        this.logger.error(this.errorMessage, errorDetails.errorCode, errorDetails.detailedMessage, err)
      }
    },
    save () {
      if (this.isCreateMode) {
        return this.createCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      } else {
        return this.updateCredential({ secret: this.secretManifest, binding: this.bindingManifest })
      }
    },
    reset () {
      this.v$.$reset()

      if (this.isCreateMode) {
        this.createBindingManifest()
        this.createSecretManifest()
        this.name = `my-${this.providerType}-secret`
        this.bindingProviderType = this.providerType

        setDelayedInputFocus(this, 'name')
      } else {
        if (this.credential) {
          this.setBindingManifest(this.binding)
          this.setSecretManifest(this.credential)
        } else {
          this.setBindingManifest(this.binding)
          const name = this.credentialName

          // Manually add labels as secret resource does not get reconciled automatically
          // TODO: check if this is still needed after https://github.com/gardener/gardener/issues/11915
          const labels = {
            'reference.gardener.cloud/credentialsbinding': 'true',
          }
          this.createSecretManifest({ name, labels })
        }
      }

      this.errorMessage = undefined
      this.detailedMessage = undefined
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>

.help-container {
  position: relative;
  overflow: hidden;
}

.help-content {
  height: 100%;
  padding-right: 15px;
  box-sizing: content-box;
}

.list-style {
  ul {
    margin-left: 10px;
  }
  li {
    margin-left: 10px;
  }
}

</style>
