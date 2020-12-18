<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-toolbar flat dense class="accent accentTitle--text">
            <v-toolbar-title>Details</v-toolbar-title>
          </v-toolbar>
          <v-list dense>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="primary">{{icon}}</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label pb-2">User</v-list-item-title>
                <v-list-item-subtitle class="content pb-2">
                  <account-avatar :account-name="username" mail-to :size="32"/>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-list-item v-if="!!fullDisplayName">
              <v-list-item-avatar>
                &nbsp;
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Name</v-list-item-title>
                <v-list-item-subtitle class="content pb-2">
                  {{fullDisplayName}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-avatar>
                &nbsp;
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Groups</v-list-item-title>
                <v-list-item-subtitle class="content">
                  <div class="py-1">
                    <v-chip v-for="(group, index) in groups" :key="index" label small class="mr-2">{{group}}</v-chip>
                  </div>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-divider inset/>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="primary">mdi-timelapse</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="label">Session</v-list-item-title>
                <v-list-item-subtitle class="content">
                   Expires {{expiresAt}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-toolbar flat dense class="accent accentTitle--text">
            <v-toolbar-title>Access</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-item>
              <v-list-item-avatar>
                <v-icon color="primary">mdi-key</v-icon>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title>Token</v-list-item-title>
                <v-list-item-subtitle>Personal bearer token for API authentication</v-list-item-subtitle>
              </v-list-item-content>
              <v-list-item-action>
                <copy-btn :clipboard-text="idToken"></copy-btn>
              </v-list-item-action>
            </v-list-item>
            <template v-if="isKubeconfigEnabled">
              <v-divider inset class="my-2"/>
              <v-list-item>
                <v-list-item-avatar>
                  <v-icon color="primary">mdi-file</v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>Kubeconfig</v-list-item-title>
                  <v-list-item-subtitle class="line-clamp-2">Personalized command line interface access (requires <tt>kubelogin</tt> kubectl plugin)</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action class="mx-0">
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn v-on="on" icon @click.native.stop="onDownload" color="actionButton">
                        <v-icon>mdi-download</v-icon>
                      </v-btn>
                    </template>
                    <span>Download kubeconfig</span>
                  </v-tooltip>
                </v-list-item-action>
                <v-list-item-action class="mx-0">
                  <copy-btn :clipboard-text="kubeconfigYaml" tooltipText="Copy kubeconfig to clipboard"></copy-btn>
                </v-list-item-action>
                <v-list-item-action class="mx-0">
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn v-on="on" icon @click.native.stop="expansionPanel = !expansionPanel" color="actionButton">
                        <v-icon>{{expansionPanelIcon}}</v-icon>
                      </v-btn>
                    </template>
                    <span>{{expansionPanelTooltip}}</span>
                  </v-tooltip>
                </v-list-item-action>
              </v-list-item>
              <v-expand-transition>
                <v-card v-if="expansionPanel" flat class="mx-2 mt-2">
                  <v-card-text class="pt-0">
                    <div>
                      The downloaded <tt>kubeconfig</tt> will initiate
                      <external-link url="https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens">
                        OIDC
                      </external-link>
                      authentication via <tt>kubelogin</tt>.
                      If not already done, please install <tt>kubelogin</tt>
                      according to the
                      <external-link url="https://github.com/int128/kubelogin#setup">
                        setup instructions
                      </external-link>.
                      For more information please refer to the <tt>kubelogin</tt> documentation.
                      <br>
                      Below you can configure and preview the <tt>kubeconfig</tt> file before download.
                    </div>
                    <v-tabs slider-color="grey lighten-1" class="mt-2 elevation-1">
                      <v-tab>Configure</v-tab>
                      <v-tab>Preview</v-tab>
                      <v-tab-item class="pa-4">
                        <v-row>
                          <v-col cols="12">
                            <v-select
                              color="primary"
                              item-color="primary"
                              v-model="projectName"
                              :items="projectNames"
                              label="Project"
                              hint="The namespace of the selected project will be the default namespace in the kubeconfig"
                              persistent-hint
                            ></v-select>
                          </v-col>
                          <v-col cols="12">
                            <v-select
                              color="primary"
                              item-color="primary"
                              v-model="grantType"
                              :items="grantTypes"
                              label="Grant Type"
                              hint="The authorization grant type to use"
                              persistent-hint
                            ></v-select>
                          </v-col>
                          <v-col cols="12">
                            <v-switch
                              color="primary"
                              v-model="skipOpenBrowser"
                              label="Skip Open Browser"
                              hint="If true, it does not open the browser on authentication"
                              persistent-hint
                            ></v-switch>
                          </v-col>
                        </v-row>
                      </v-tab-item>
                      <v-tab-item>
                        <code-block lang="yaml" :content="kubeconfigYaml" :show-copy-button="false"></code-block>
                      </v-tab-item>
                    </v-tabs>
                  </v-card-text>
                </v-card>
              </v-expand-transition>
            </template>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import ExternalLink from '@/components/ExternalLink'
import download from 'downloadjs'
import AccountAvatar from '@/components/AccountAvatar'
import { getToken } from '@/utils/api'
import { mapState, mapGetters } from 'vuex'
import moment from 'moment-timezone'
import map from 'lodash/map'
import find from 'lodash/find'
import get from 'lodash/get'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    ExternalLink,
    AccountAvatar
  },
  name: 'profile',
  data () {
    return {
      expansionPanel: false,
      projectName: undefined,
      skipOpenBrowser: false,
      grantType: 'auto',
      grantTypes: ['auto', 'authcode', 'authcode-keyboard'],
      idToken: undefined,
      showToken: false,
      floatingButton: false,
      showMessage: false,
      kubeconfigYaml: ''
    }
  },

  computed: {
    ...mapState([
      'user',
      'namespace',
      'cfg',
      'kubeconfigData'
    ]),
    ...mapGetters([
      'username',
      'projectList',
      'fullDisplayName',
      'isAdmin',
      'canCreateProject',
      'isKubeconfigEnabled'
    ]),
    expansionPanelIcon () {
      return this.expansionPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    expansionPanelTooltip () {
      return this.expansionPanel ? 'Hide advanced options' : 'Show advanced options'
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
      return moment.duration(this.user.exp - Math.floor(Date.now() / 1000), 'seconds').humanize(true)
    },
    projectNames () {
      const names = map(this.projectList, 'metadata.name').sort()
      names.unshift('')
      return names
    },
    kubeconfigFilename () {
      if (this.projectName) {
        return `kubeconfig-garden-${this.projectName}.yaml`
      }
      return 'kubeconfig-garden.yaml'
    },
    kubeconfig () {
      const project = find(this.projectList, ['metadata.name', this.projectName])
      const name = 'garden-' + get(project, 'metadata.name', 'none')
      const namespace = get(project, 'metadata.namespace')
      const {
        server,
        certificateAuthorityData,
        insecureSkipTlsVerify,
        oidc = {}
      } = this.kubeconfigData || {}
      const cluster = {
        server
      }
      if (certificateAuthorityData) {
        cluster['certificate-authority-data'] = certificateAuthorityData
      } else if (insecureSkipTlsVerify) {
        cluster['insecure-skip-tls-verify'] = true
      }
      const context = {
        cluster: name,
        user: 'oidc-login'
      }
      if (namespace) {
        context.namespace = namespace
      }
      const args = [
        'oidc-login',
        'get-token',
        '--oidc-issuer-url=' + oidc.issuerUrl,
        '--oidc-client-id=' + oidc.clientId,
        '--oidc-client-secret=' + oidc.clientSecret
      ]
      if (Array.isArray(oidc.extraScopes)) {
        for (const scope of oidc.extraScopes) {
          args.push('--oidc-extra-scope=' + scope)
        }
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
          args
        }
      }
      return {
        kind: 'Config',
        apiVersion: 'v1',
        clusters: [{
          name,
          cluster
        }],
        contexts: [{
          context,
          name
        }],
        'current-context': name,
        users: [{
          name: 'oidc-login',
          user
        }],
        preferences: {}
      }
    }
  },
  methods: {
    async onDownload () {
      const kubeconfig = this.kubeconfigYaml
      const filename = this.kubeconfigFilename
      download(kubeconfig, filename, 'text/yaml')
    },
    async updateKubeconfigYaml (value) {
      this.kubeconfigYaml = await this.$yaml.safeDump(value)
    }
  },
  async mounted () {
    try {
      const project = find(this.projectList, ['metadata.namespace', this.namespace])
      this.projectName = get(project, 'metadata.name', '')
      const { data } = await getToken()
      this.idToken = data.token
      this.updateKubeconfigYaml(this.kubeconfig)
    } catch (err) {
      console.error(err.message)
    }
  },
  watch: {
    kubeconfig (value) {
      this.updateKubeconfigYaml(value)
    }
  }
}
</script>

<style lang="scss" scoped>
  .label {
    font-size: 14px !important;
    font-weight: 400 !important;
  }
  .content {
    font-size: 16px !important;
    font-weight: 400 !important;
    color: inherit !important;
  }
  .line-clamp-2 {
    white-space: initial;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
</style>
