<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container
    fluid
    class="px-6"
  >
    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <g-toolbar title="Details" />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon
                  color="primary"
                  :icon="icon"
                />
              </template>
              <div class="label text-medium-emphasis">
                User
              </div>
              <div class="content">
                <g-account-avatar
                  :account-name="username"
                  mail-to
                  :size="32"
                />
              </div>
            </g-list-item>
            <g-list-item v-if="!!fullDisplayName">
              <div class="label text-medium-emphasis">
                Name
              </div>
              <div class="content">
                {{ fullDisplayName }}
              </div>
            </g-list-item>
            <g-list-item>
              <div class="label text-medium-emphasis">
                Groups
              </div>
              <div class="content py-1">
                <v-chip
                  v-for="(group, index) in groups"
                  :key="index"
                  label
                  size="small"
                  class="mr-2"
                >
                  {{ group }}
                </v-chip>
              </div>
            </g-list-item>
          </g-list>
          <v-divider inset />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon
                  color="primary"
                  icon="mdi-timelapse"
                />
              </template>
              <div class="label text-medium-emphasis">
                Session
              </div>
              <div class="content">
                Expires
                <g-time-string
                  mode="future"
                  :date-time="expiresAt"
                />
              </div>
            </g-list-item>
          </g-list>
        </v-card>
      </v-col>
      <v-col
        v-if="isKubeconfigEnabled"
        cols="12"
        md="6"
      >
        <v-card>
          <g-toolbar title="Access" />
          <g-list>
            <g-list-item>
              <template #prepend>
                <v-icon
                  color="primary"
                  icon="mdi-file"
                />
              </template>
              <div class="text-body-1">
                Kubeconfig
              </div>
              <div class="text-body-2 text-medium-emphasis line-clamp-2">
                Personalized command line interface access (requires <span class="font-family-monospace">kubelogin</span> kubectl plugin)
              </div>
              <template #append>
                <g-action-button
                  icon="mdi-download"
                  @click="onDownload"
                >
                  <template #tooltip>
                    <span>Download kubeconfig</span>
                  </template>
                </g-action-button>
                <g-copy-btn
                  :clipboard-text="kubeconfigYaml"
                  tooltip-text="Copy kubeconfig to clipboard"
                />
                <g-action-button
                  :icon="kubeconfigExpansionPanelIcon"
                  @click="kubeconfigExpansionPanel = !kubeconfigExpansionPanel"
                >
                  <template #tooltip>
                    <span>{{ kubeconfigExpansionPanelTooltip }}</span>
                  </template>
                </g-action-button>
              </template>
            </g-list-item>
            <v-expand-transition>
              <v-card
                v-if="kubeconfigExpansionPanel"
                flat
                class="mx-2 mt-2"
              >
                <v-card-text class="pt-0">
                  <div>
                    The downloaded <span class="font-family-monospace">kubeconfig</span> will initiate
                    <g-external-link url="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens">
                      OIDC
                    </g-external-link>
                    authentication via <span class="font-family-monospace">kubelogin</span>.
                    If not already done, please install <span class="font-family-monospace">kubelogin</span>
                    according to the
                    <g-external-link url="https://github.com/int128/kubelogin#setup">
                      setup instructions
                    </g-external-link>.
                    For more information please refer to the <span class="font-family-monospace">kubelogin</span> documentation.
                    <br>
                    Below you can configure and preview the <span class="font-family-monospace">kubeconfig</span> file before download.
                  </div>
                  <v-sheet
                    elevation="1"
                    class="mt-3"
                  >
                    <v-tabs
                      v-model="kubeconfigTab"
                      color="primary"
                      slider-color="primary"
                    >
                      <v-tab :value="'configure'">
                        Configure
                      </v-tab>
                      <v-tab :value="'preview'">
                        Preview
                      </v-tab>
                    </v-tabs>
                    <v-window v-model="kubeconfigTab">
                      <v-window-item
                        :value="'configure'"
                        class="pa-4"
                      >
                        <v-row>
                          <v-col cols="12">
                            <v-select
                              v-model="internalProjectName"
                              color="primary"
                              :items="sortedProjectNamesWithEmpty"
                              variant="underlined"
                              label="Project"
                              hint="The namespace of the selected project will be the default namespace in the kubeconfig"
                              persistent-hint
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-select
                              v-model="grantType"
                              color="primary"
                              :items="grantTypes"
                              variant="underlined"
                              label="Grant Type"
                              hint="The authorization grant type to use"
                              persistent-hint
                            />
                          </v-col>
                          <v-col cols="12">
                            <v-switch
                              v-model="skipOpenBrowser"
                              color="primary"
                              variant="underlined"
                              label="Skip Open Browser"
                              hint="If selected, it will not open the browser for authentication."
                              persistent-hint
                            />
                          </v-col>
                        </v-row>
                      </v-window-item>
                      <v-window-item :value="'preview'">
                        <g-code-block
                          lang="yaml"
                          :content="kubeconfigYaml"
                          :show-copy-button="false"
                        />
                      </v-window-item>
                    </v-window>
                  </v-sheet>
                </v-card-text>
              </v-card>
            </v-expand-transition>
          </g-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import {
  ref,
  toRef,
} from 'vue'
import download from 'downloadjs'
import {
  mapState,
  storeToRefs,
} from 'pinia'
import yaml from 'js-yaml'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'
import { useKubeconfigStore } from '@/store/kubeconfig'

import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GAccountAvatar from '@/components/GAccountAvatar.vue'
import GTimeString from '@/components/GTimeString.vue'

import { useProjectMetadata } from '@/composables/useProjectMetadata/index.js'
import { useProjectNamespace } from '@/composables/useProjectItem'

import head from 'lodash/head'

export default {
  components: {
    GCopyBtn,
    GCodeBlock,
    GAccountAvatar,
    GTimeString,
  },
  inject: ['logger'],
  setup () {
    const projectStore = useProjectStore()
    const configStore = useConfigStore()

    const {
      project,
      projectNames,
    } = storeToRefs(projectStore)

    const projectNamespace = useProjectNamespace(project)
    const {
      projectName,
    } = useProjectMetadata(project)

    const grantTypes = toRef(configStore, 'grantTypes')
    const grantType = ref(head(grantTypes.value))

    return {
      projectName,
      projectNames,
      projectNamespace,
      grantTypes,
      grantType,
    }
  },
  data () {
    return {
      internalProjectName: this.projectName,
      kubeconfigExpansionPanel: false,
      kubeconfigTab: 'configure',
      skipOpenBrowser: false,
      showToken: false,
      showMessage: false,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'user',
      'username',
      'fullDisplayName',
      'isAdmin',
    ]),
    ...mapState(useAuthzStore, [
      'namespace',
      'canCreateProject',
    ]),
    ...mapState(useKubeconfigStore, [
      'kubeconfigData',
      'isKubeconfigEnabled',
    ]),
    kubeconfigExpansionPanelIcon () {
      return this.expansionPanelIcon(this.kubeconfigExpansionPanel)
    },
    kubeconfigExpansionPanelTooltip () {
      return this.expansionPanelTooltip(this.kubeconfigExpansionPanel)
    },
    icon () {
      return this.isAdmin ? 'mdi-account-supervisor' : 'mdi-account'
    },
    id () {
      return this.user.id
    },
    groups () {
      return this.user.groups
    },
    expiresAt () {
      return this.user.exp * 1000
    },
    sortedProjectNamesWithEmpty () {
      const names = this.projectNames.toSorted()
      names.unshift('')
      return names
    },
    kubeconfigFilename () {
      if (this.internalProjectName) {
        return `kubeconfig-garden-${this.internalProjectName}.yaml`
      }
      return 'kubeconfig-garden.yaml'
    },
    kubeconfig () {
      const projectName = this.internalProjectName || 'none'
      const name = 'garden-' + projectName
      const namespace = this.projectNamespace
      const {
        server,
        certificateAuthorityData,
        insecureSkipTlsVerify,
        oidc = {},
      } = this.kubeconfigData || {}
      const cluster = {
        server,
      }
      if (certificateAuthorityData) {
        cluster['certificate-authority-data'] = certificateAuthorityData
      } else if (insecureSkipTlsVerify) {
        cluster['insecure-skip-tls-verify'] = true
      }
      const context = {
        cluster: name,
        user: 'oidc-login',
      }
      if (namespace) {
        context.namespace = namespace
      }
      const args = [
        'oidc-login',
        'get-token',
        '--oidc-issuer-url=' + oidc.issuerUrl,
        '--oidc-client-id=' + oidc.clientId,
      ]
      if (oidc.clientSecret) {
        args.push('--oidc-client-secret=' + oidc.clientSecret)
      }
      if (Array.isArray(oidc.extraScopes)) {
        for (const scope of oidc.extraScopes) {
          args.push('--oidc-extra-scope=' + scope)
        }
      }
      if (oidc.usePKCE || !oidc.clientSecret) {
        args.push('--oidc-pkce-method=S256')
      }
      if (oidc.certificateAuthorityData) {
        args.push('--certificate-authority-data=' + oidc.certificateAuthorityData)
      } else if (oidc.insecureSkipTlsVerify) {
        args.push('--insecure-skip-tls-verify')
      }
      args.push('--grant-type=' + this.grantType)
      if (this.skipOpenBrowser) {
        args.push('--skip-open-browser')
      }
      const user = {
        exec: {
          apiVersion: 'client.authentication.k8s.io/v1beta1',
          command: 'kubectl',
          args,
        },
      }
      return {
        kind: 'Config',
        apiVersion: 'v1',
        clusters: [{
          name,
          cluster,
        }],
        contexts: [{
          context,
          name,
        }],
        'current-context': name,
        users: [{
          name: 'oidc-login',
          user,
        }],
        preferences: {},
      }
    },
    kubeconfigYaml () {
      return yaml.dump(this.kubeconfig)
    },
  },
  watch: {
    projectName (value) {
      this.internalProjectName = value
    },
  },
  methods: {
    async onDownload () {
      const kubeconfig = this.kubeconfigYaml
      const filename = this.kubeconfigFilename
      download(kubeconfig, filename, 'text/yaml')
    },
    expansionPanelIcon (value) {
      return value ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    expansionPanelTooltip (value) {
      return value ? 'Hide advanced options' : 'Show advanced options'
    },
  },
}
</script>

<style lang="scss" scoped>
  .label {
    font-size: 14px !important;
    font-weight: 400 !important;
    padding-bottom: 4px !important;
  }
  .content {
    font-size: 16px !important;
    font-weight: 400 !important;
    color: inherit !important;
    padding-bottom: 4px !important;
  }
  .line-clamp-2 {
    white-space: initial;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
</style>
