<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-dialog
    v-model="visible"
    persistent
    scrollable
    max-width="600"
  >
    <v-card>
      <g-toolbar
        prepend-icon="mdi-cube"
        title="Create Project"
      />
      <v-card-text class="dialog-content">
        <v-row>
          <v-col cols="12">
            <v-text-field
              ref="refProjectName"
              v-model.trim="v$.projectName.$model"
              variant="underlined"
              color="primary"
              label="Name"
              counter="10"
              :error-messages="getErrorMessages(v$.projectName)"
            />
          </v-col>
        </v-row>

        <v-row v-if="costObjectSettingEnabled">
          <v-col cols="12">
            <v-text-field
              v-model="v$.costObject.$model"
              variant="underlined"
              color="primary"
              :label="costObjectTitle"
              :error-messages="getErrorMessages(v$.costObject)"
            />
            <v-alert
              v-if="!!costObjectDescriptionHtml"
              density="compact"
              type="info"
              variant="tonal"
              color="primary"
            >
              <!-- eslint-disable vue/no-v-html -->
              <div
                class="alert-banner-message"
                v-html="costObjectDescriptionHtml"
              />
              <!-- eslint-enable vue/no-v-html -->
            </v-alert>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="description"
              variant="underlined"
              color="primary"
              label="Description"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="purpose"
              variant="underlined"
              color="primary"
              label="Purpose"
            />
          </v-col>
        </v-row>
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
        />
        <v-snackbar
          :model-value="loading"
          location="bottom right"
          absolute
          :timeout="-1"
        >
          <span>Creating project ...</span>
        </v-snackbar>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="loading"
          @click="hide"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="text"
          :loading="loading"
          :disabled="loading"
          @click="submit"
        >
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  toRef,
} from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  maxLength,
  required,
} from '@vuelidate/validators'
import { useRouter } from 'vue-router'

import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GMessage from '@/components/GMessage.vue'
import GToolbar from '@/components/GToolbar.vue'

import { useLogger } from '@/composables/useLogger'

import {
  messageFromErrors,
  lowerCaseAlphaNumHyphen,
  noStartEndHyphen,
  noConsecutiveHyphen,
  withMessage,
} from '@/utils/validators'
import {
  getErrorMessages,
  setInputFocus,
  setDelayedInputFocus,
  transformHtml,
} from '@/utils'
import {
  errorDetailsFromError,
  isConflict,
  isGatewayTimeout,
} from '@/utils/error'

import {
  get,
  set,
  isEmpty,
} from '@/lodash'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  'update:modelValue',
])

const logger = useLogger()
const configStore = useConfigStore()
const projectStore = useProjectStore()
const router = useRouter()

const costObjectSettings = toRef(configStore, 'costObjectSettings')
const projectNames = toRef(projectStore, 'projectNames')

const visible = computed({
  get () {
    return props.modelValue
  },
  set (value) {
    return emit('update:modelValue', value)
  },
})

const projectName = ref('')
const description = ref('')
const purpose = ref('')
const costObject = ref('')
const errorMessage = ref('')
const detailedErrorMessage = ref('')
const loading = ref(false)

const refProjectName = ref(null)

const costObjectSettingEnabled = computed(() => !isEmpty(costObjectSettings.value))
const costObjectTitle = computed(() => get(costObjectSettings.value, 'title'))
const costObjectDescriptionHtml = computed(() => {
  const description = get(costObjectSettings.value, 'description')
  return transformHtml(description)
})
const costObjectRegex = computed(() => get(costObjectSettings.value, 'regex'))
const costObjectErrorMessage = computed(() => get(costObjectSettings.value, 'errorMessage'))

const isUniqueProjectName = withMessage(
  'A project with this name already exists',
  value => !value ? true : !projectNames.value.includes(value),
)

const isValidCostObject = withMessage(
  costObjectErrorMessage.value,
  value => !costObjectRegex.value ? true : RegExp(costObjectRegex.value).test(value ?? ''),
)

const rules = {
  costObject: {
    isValidCostObject,
  },
  projectName: {
    required,
    maxLength: maxLength(10),
    noConsecutiveHyphen,
    noStartEndHyphen,
    lowerCaseAlphaNumHyphen,
    isUniqueProjectName,
  },
}

const v$ = useVuelidate(rules, { projectName, costObject })

watch(visible, value => {
  if (value) {
    reset()
  }
})

function hide () {
  visible.value = false
}

async function submit () {
  if (v$.value.$invalid) {
    await v$.value.$validate()
    const message = messageFromErrors(v$.value.$errors)
    errorMessage.value = 'There are input errors that you need to resolve'
    detailedErrorMessage.value = message
    return
  }

  try {
    loading.value = true
    const project = await save()
    loading.value = false
    hide()
    router.push({
      name: 'Secrets',
      params: {
        namespace: project.metadata.namespace,
      },
    })
  } catch (err) {
    loading.value = false
    if (isConflict(err)) {
      errorMessage.value = `Project name '${projectName.value}' is already taken. Please try a different name.`
      setInputFocus(refProjectName)
    } else if (isGatewayTimeout(err)) {
      errorMessage.value = 'Project has been created but initialization is still pending.'
    } else {
      errorMessage.value = 'Failed to create project.'
    }
    const { errorCode, detailedMessage } = errorDetailsFromError(err)
    detailedErrorMessage.value = detailedMessage
    logger.error(errorMessage.value, errorCode, detailedMessage, err)
  }
}

function save () {
  const name = projectName.value
  const metadata = { name }
  if (costObjectSettingEnabled.value) {
    set(metadata, ['annotations', 'billing.gardener.cloud/costObject'], costObject.value)
  }

  const data = {
    description: description.value,
    purpose: purpose.value,
  }

  return projectStore.createProject({ metadata, data })
}

function reset () {
  v$.value.$reset()
  errorMessage.value = undefined
  detailedErrorMessage.value = undefined

  projectName.value = ''
  description.value = undefined
  purpose.value = undefined
  costObject.value = undefined

  setDelayedInputFocus(refProjectName)
}
</script>

<style lang="scss" scoped>
.dialog-content {
  height: auto;
}
</style>
