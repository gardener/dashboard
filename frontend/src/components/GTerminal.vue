<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div
    :id="`boundary_${uuid}`"
    v-resize="onResize"
    :class="backgroundClass"
    class="d-flex flex-column fill-height"
  >
    <v-snackbar
      v-model="snackbarTop"
      :timeout="-1"
      :absolute="true"
      location="top"
      multi-line
    >
      <div>{{ snackbarText }}</div>
      <div
        class="d-flex flex-nowrap align-center justify-center"
      >
        <g-popover
          v-if="snackbarDetailsText"
          toolbar-title="Details"
          placement="bottom"
          :boundary="`#boundary_${uuid}`"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              color="primary"
            >
              Details
            </v-btn>
          </template>
          <template #text>
            {{ snackbarDetailsText }}
          </template>
        </g-popover>
        <v-btn
          variant="text"
          color="primary"
          @click="retry"
        >
          Retry
        </v-btn>
        <v-btn
          variant="text"
          color="primary"
          @click="hideSnackbarAndClose"
        >
          Close
        </v-btn>
      </div>
    </v-snackbar>
    <v-snackbar
      v-model="errorSnackbarBottom"
      :timeout="-1"
      :absolute="true"
      location="bottom"
      color="error"
    >
      {{ snackbarText }}
      <v-btn
        variant="text"
        @click="hideSnackbarAndClose"
      >
        Close
      </v-btn>
    </v-snackbar>
    <g-drag-n-droppable-component :uuid="uuid">
      <template #handle>
        <div
          class="g-system-bar d-flex"
          :class="backgroundClass"
          @click="focus"
        >
          <v-btn
            icon="mdi-close"
            size="small"
            color="on-surface"
            variant="text"
            class="text-none g-system-bar-button g-ignore-drag"
            @click="deleteTerminal"
          />
          <v-spacer />
          <v-icon
            class="pr-2"
            color="on-surface"
          >
            mdi-console
          </v-icon>
          <span class="text-high-emphasis">{{ terminalTitle }}</span>
          <v-spacer />
          <v-tooltip
            v-if="terminalSession.imageHelpText"
            location="top"
            class="g-ignore-drag"
          >
            <template #activator="{ props: tooltipProps }">
              <!-- g-popover boundary: The id must not start with a digit. QuerySelector method uses CSS3 selectors for querying the DOM and CSS3 doesn't support ID selectors that start with a digit -->
              <g-popover
                :toolbar-title="`${imageShortText} Help`"
                placement="bottom"
                :boundary="`#boundary_${uuid}`"
              >
                <template #activator="{ props: activatorProps }">
                  <v-btn
                    v-if="terminalSession.imageHelpText"
                    v-bind="mergeProps(activatorProps, tooltipProps)"
                    icon="mdi-help-circle-outline"
                    size="small"
                    color="on-surface"
                    variant="text"
                    class="text-none g-system-bar-button mx-1 g-ignore-drag"
                  />
                </template>
                <template #text>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span v-html="imageHelpHtml" />
                </template>
              </g-popover>
            </template>
            Help
          </v-tooltip>
          <v-menu
            location="bottom"
            offset-y
            min-width="400px"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-menu"
                size="small"
                color="on-surface"
                variant="text"
                class="text-none g-system-bar-button mx-1 g-ignore-drag"
              />
            </template>
            <v-list density="compact">
              <v-list-item @click="split('horizontal')">
                <template #prepend>
                  <g-icon-base
                    width="16"
                    height="16"
                    view-box="0 -2 20 20"
                    class="mr-2"
                    icon-color="on-surface"
                    icon-name="split-vertically"
                  >
                    <g-split-vertically />
                  </g-icon-base>
                </template>
                <v-list-item-title>Split Pane Vertically</v-list-item-title>
                <template #append>
                  <span class="text-medium-emphasis text-caption">(ctrl + shift + v)</span>
                </template>
              </v-list-item>
              <v-list-item @click="split('vertical')">
                <template #prepend>
                  <g-icon-base
                    width="16"
                    height="16"
                    view-box="0 -2 20 20"
                    class="mr-2"
                    icon-color="on-surface"
                    icon-name="split-horizontally"
                  >
                    <g-split-horizontally />
                  </g-icon-base>
                </template>
                <v-list-item-title>Split Pane Horizontally</v-list-item-title>
                <template #append>
                  <span class="text-medium-emphasis text-caption">(ctrl + shift + h)</span>
                </template>
              </v-list-item>
              <v-divider />
              <v-list-item
                prepend-icon="mdi-cog"
                title="Settings"
                :disabled="loading.settingsBtn"
                @click="configure('settingsBtn')"
              >
                <template
                  v-if="loading.settingsBtn"
                  #prepend
                >
                  <v-progress-circular
                    indeterminate
                    size="16"
                    width="2"
                    class="mr-2"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
      <template #component>
        <div
          ref="container"
          class="terminal-container"
        />
        <div
          class="g-system-bar"
          :class="backgroundClass"
        >
          <v-menu
            v-model="connectionMenu"
            location="top"
            offset-y
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-tooltip:top="{
                  text: terminalSession.detailedConnectionStateText || connectionStateText,
                  disabled: connectionMenu,
                  style: { minWidth: '110px' }
                }"
                v-bind="menuProps"
                size="small"
                variant="text"
                color="on-surface"
                class="text-none g-system-bar-button"
              >
                <g-icon-base
                  width="18"
                  height="18"
                  view-box="-2 -2 30 30"
                  icon-color="on-surface"
                  class="mr-2"
                  :icon-name="connectionIconName"
                >
                  <component :is="resolveComponent(connectionIconName)" />
                </g-icon-base>
                <span class="text-none text-high-emphasis">{{ connectionStateText }}</span>
              </v-btn>
            </template>
            <v-card rounded="0">
              <v-card-actions v-if="terminalSession.connectionState === TerminalSession.DISCONNECTED">
                <v-btn
                  size="small"
                  variant="text"
                  class="action-button"
                  @click="retry()"
                >
                  <v-icon
                    size="small"
                    start
                  >
                    mdi-reload
                  </v-icon>
                  Reconnect
                </v-btn>
              </v-card-actions>
              <v-card-text
                v-else
                class="ml-2 mr-2"
              >
                {{ terminalSession.detailedConnectionStateText || connectionStateText }}
              </v-card-text>
            </v-card>
          </v-menu>

          <v-btn
            v-if="imageShortText"
            v-tooltip:top="`Image: ${terminalSession.container.image}`"
            size="small"
            variant="text"
            :loading="loading.imageBtn"
            color="on-surface"
            class="text-none g-system-bar-button"
            @click="configure('imageBtn')"
          >
            <v-icon class="mr-2">
              mdi-layers-triple-outline
            </v-icon>
            <span>{{ imageShortText }}</span>
          </v-btn>

          <v-tooltip
            v-if="privilegedMode !== undefined && target === 'shoot'"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                size="small"
                variant="text"
                :loading="loading.secContextBtn"
                color="on-surface"
                class="text-none g-system-bar-button"
                @click="configure('secContextBtn')"
              >
                <v-icon class="mr-2">
                  mdi-shield-account
                </v-icon>
                <span>{{ privilegedModeText }}</span>
              </v-btn>
            </template>
            <strong>Privileged:</strong> {{ terminalSession.container.privileged }}<br>
            <strong>Host PID:</strong> {{ terminalSession.hostPID }}<br>
            <strong>Host Network:</strong> {{ terminalSession.hostNetwork }}
          </v-tooltip>

          <v-btn
            v-if="terminalSession.node && target === 'shoot'"
            v-tooltip:top="`Node: ${terminalSession.node}`"
            size="small"
            variant="text"
            :loading="loading.nodeBtn"
            color="on-surface"
            class="text-none g-system-bar-button"
            @click="configure('nodeBtn')"
          >
            <v-icon
              :size="14"
              class="mr-2"
            >
              mdi-server
            </v-icon>
            <span>{{ terminalSession.node }}</span>
          </v-btn>
        </div>
      </template>
    </g-drag-n-droppable-component>
    <g-terminal-settings-dialog
      ref="settings"
      :runtime-settings-hidden="runtimeSettingsHidden"
    />
  </div>
</template>

<script>
import { reactive } from 'vue'
import { mapState } from 'pinia'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import '@xterm/xterm/css/xterm.css'

import { useAppStore } from '@/store/app'
import { useConfigStore } from '@/store/config'

import GDragNDroppableComponent from '@/components/GDragNDroppableComponent.vue'
import GTerminalSettingsDialog from '@/components/dialogs/GTerminalSettingsDialog.vue'
import GIconBase from '@/components/icons/GIconBase.vue'
import GConnected from '@/components/icons/GConnected.vue'
import GDisconnected from '@/components/icons/GDisconnected.vue'
import GSplitVertically from '@/components/icons/GSplitVertically.vue'
import GSplitHorizontally from '@/components/icons/GSplitHorizontally.vue'

import {
  targetText,
  transformHtml,
} from '@/utils'

import { FocusAddon } from '@/lib/xterm-addon-focus'
import {
  TerminalSession,
  Spinner,
} from '@/lib/terminal'
import { getTerminalTheme } from '@/lib/terminal-themes'

import head from 'lodash/head'
import find from 'lodash/find'
import assign from 'lodash/assign'
import get from 'lodash/get'

const components = {
  'g-connected': GConnected,
  'g-disconnected': GDisconnected,
}

export default {
  components: {
    GTerminalSettingsDialog,
    GIconBase,
    GConnected,
    GDisconnected,
    GSplitVertically,
    GSplitHorizontally,
    GDragNDroppableComponent,
  },
  inject: ['api', 'logger', 'mergeProps'],
  props: {
    uuid: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
    runtimeSettingsHidden: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'terminated',
    'split',
  ],
  data () {
    return {
      snackbarTop: false,
      errorSnackbarBottom: false,
      snackbarText: '',
      snackbarDetailsText: undefined,
      loading: {
        imageBtn: false,
        secContextBtn: false,
        nodeBtn: false,
        settingsBtn: false,
      },
      connectionMenu: false,
      config: {
        container: {
          image: undefined,
        },
        nodes: [],
      },
      selectedConfig: {},
      terminalSession: {
        container: {},
      },
      TerminalSession,
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'terminal',
    ]),
    ...mapState(useAppStore, [
      'splitpaneResize',
    ]),
    connectionIconName () {
      return this.terminalSession.connectionState === TerminalSession.CONNECTED
        ? 'g-connected'
        : 'g-disconnected'
    },
    terminalTitle () {
      const title = [this.targetText]
      if (this.name) {
        title.push(this.name)
      }
      if (this.data.title) {
        title.push(this.data.title)
      }
      return title.join(' - ')
    },
    targetText () {
      return targetText(this.target) || 'UNKNOWN'
    },
    isDarkTheme () {
      return !!this.$vuetify.theme.current.dark
    },
    backgroundClass () {
      return this.isDarkTheme ? 'background-dark' : 'background-light'
    },
    isTerminalSessionCreated () {
      return this.terminalSession && this.terminalSession.isCreated
    },
    defaultImage () {
      return this.terminalSession.container.image || this.config.container.image
    },
    defaultNode () {
      const defaultNode = find(this.config.nodes, ['data.kubernetesHostname', this.terminalSession.node])
      return get(defaultNode, ['data', 'kubernetesHostname']) || get(head(this.config.nodes), ['data', 'kubernetesHostname'])
    },
    defaultPrivilegedMode () {
      return this.privilegedMode || false
    },
    privilegedMode () {
      return get(this.terminalSession, ['container', 'privileged']) || this.terminalSession.hostPID || this.terminalSession.hostNetwork
    },
    connectionStateText () {
      switch (this.terminalSession.connectionState) {
        case TerminalSession.DISCONNECTED:
          return 'Disconnected'
        case TerminalSession.CREATING:
        case TerminalSession.FETCHING:
          return 'Preparing'
        case TerminalSession.CONNECTING:
          return 'Connecting'
        case TerminalSession.CONNECTED:
          return 'Connected'
        default:
          return 'UNKNOWN'
      }
    },
    heartbeatIntervalSeconds () {
      return get(this.terminal, ['heartbeatIntervalSeconds'], 60)
    },
    privilegedModeText () {
      return this.privilegedMode ? 'Privileged' : 'Unprivileged'
    },
    imageShortText () {
      const image = get(this.terminalSession, ['container', 'image'], '')
      return image.substring(image.lastIndexOf('/') + 1)
    },
    imageHelpHtml () {
      return transformHtml(get(this.terminalSession, ['imageHelpText'], ''))
    },
    name () {
      // name is undefined in case of garden terminal
      return this.data.name
    },
    namespace () {
      return this.data.namespace
    },
    target () {
      return this.data.target
    },
  },
  watch: {
    splitpaneResize () {
      this.onResize()
    },
    isDarkTheme () {
      this.applyTerminalTheme()
    },
  },
  mounted () {
    const term = this.term = new Terminal({
      fontSize: 15,
      fontWeight: 600,
      fontFamily: '"DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols"',
      allowProposedApi: true,
      minimumContrastRatio: 4.5,
      theme: getTerminalTheme(this.isDarkTheme),
      macOptionClickForcesSelection: true,
    })
    const fitAddon = this.fitAddon = new FitAddon()
    const focusAddon = new FocusAddon(this.uuid)

    if (navigator.userAgent.includes('Windows')) {
      term.attachCustomKeyEventHandler(event => {
        if (event.type !== 'keydown') {
          return true
        }
        const onlyCtrlPressed = event.ctrlKey && !event.shiftKey && !event.altKey
        if (!onlyCtrlPressed) {
          return true
        }
        const hasSelection = term.getSelection().length > 0
        const isCtrlCopy = event.code === 'KeyC' && hasSelection
        const isCtrlPaste = event.code === 'KeyV'
        const shouldXtermJsProcessTheKeyEvent = !(isCtrlCopy || isCtrlPaste)
        return shouldXtermJsProcessTheKeyEvent
      })
    }

    term.open(this.$refs.container)
    term.loadAddon(focusAddon) // must be called after open, otherwise the terminal.textarea is not initialized
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    const unicodeAddon = new Unicode11Addon()
    term.loadAddon(unicodeAddon)
    term.unicode.activeVersion = '11'
    try {
      const webglAddon = new WebglAddon()
      term.loadAddon(webglAddon)
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
    } catch (err) {
      this.logger.warn('WebGL renderer not available, falling back to default renderer:', err)
    }

    term.focus()
    this.$nextTick(() => {
      // use nextTick as xterm needs to be finished with rendering because fitAddon relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
      fitAddon.fit()
    })

    this.spinner = new Spinner(term)
    this.connect()
  },
  beforeUnmount () {
    this.cancelConnectAndClose()
    if (this.term) {
      this.term.dispose()
    }
  },
  methods: {
    resolveComponent (name) {
      return get(components, [name])
    },
    applyTerminalTheme () {
      if (!this.term) {
        return
      }
      this.term.options.theme = getTerminalTheme(this.isDarkTheme)
    },
    focus () {
      this.term.focus()
    },
    async deleteTerminal () {
      if (!this.isTerminalSessionCreated) { // Either the terminal session is not yet established or there was an error
        this.$emit('terminated')
        return
      }

      try {
        await this.terminalSession.deleteTerminal()
      } catch (err) {
        // ignore error, the terminal will be cleaned up anyhow after the timeout
      }
      this.cancelConnectAndClose()

      this.$emit('terminated')
    },
    async configure (refName) {
      this.loading[refName] = true // eslint-disable-line security/detect-object-injection
      const { namespace, name, target } = this.data
      try {
        const { data: config } = await this.api.terminalConfig({ name, namespace, target })

        assign(this.config, config)
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, ['response', 'data', 'message'], err.message))
      } finally {
        this.loading[refName] = false // eslint-disable-line security/detect-object-injection
      }

      const initialState = {
        container: {
          image: this.defaultImage,
        },
        defaultNode: this.defaultNode,
        currentNode: this.terminalSession.node,
        privilegedMode: this.defaultPrivilegedMode,
        nodes: this.config.nodes,
      }
      const selectedConfig = await this.$refs.settings.promptForConfigurationChange(initialState)
      if (selectedConfig) {
        try {
          await this.terminalSession.deleteTerminal()
        } catch (err) {
          this.logger.error('failed to cleanup terminal session on configuration change', err)
        }
        this.cancelConnectAndClose()

        this.selectedConfig = selectedConfig
        this.retry()
      }
    },
    onResize () {
      if (this.fitAddon) {
        this.fitAddon.fit()
      }
    },
    hideSnackbarAndClose () {
      this.hideSnackbar()

      return this.deleteTerminal()
    },
    hideSnackbar () {
      this.snackbarTop = false
      this.errorSnackbarBottom = false
    },
    showSnackbarTop (text, detailsText) {
      this.snackbarTop = true
      this.setSnackbarTextAndStopSpinner(text, detailsText)
    },
    showErrorSnackbarBottom (text) {
      this.errorSnackbarBottom = true
      this.setSnackbarTextAndStopSpinner(text)
    },
    setSnackbarTextAndStopSpinner (text, detailsText) {
      if (this.spinner) {
        this.spinner.stop()
      }
      this.snackbarText = text
      this.snackbarDetailsText = detailsText
    },
    retry () {
      this.snackbarTop = false
      this.errorSnackbarBottom = false
      return this.connect()
    },
    cancelConnectAndClose () {
      this.terminalSession.cancelConnect = true
      this.terminalSession.close()
    },
    async connect () {
      const terminalSession = this.terminalSession = reactive(new TerminalSession(this))

      this.spinner.start()
      this.spinner.text = 'Preparing terminal session'

      try {
        await terminalSession.open()
      } catch (err) {
        const message = get(err, ['response', 'data', 'message'], err.message)
        this.showErrorSnackbarBottom(message)
        terminalSession.setDisconnectedState()
      }
    },
    split (orientation) {
      this.$emit('split', orientation)
    },
  },
}
</script>

<style lang="scss" scoped>
  .terminal-container {
    height: 100%;
    max-height: calc(100% - 49px);
  }

  .g-system-bar {
    height: 24px;
    font-size: .875rem;
    font-weight: 400;
  }
  .background-dark {
    background: #000;
  }
  .background-light {
    background: #fafafa;
  }
  .g-system-bar-button {
    max-height: 24px;
    letter-spacing: normal;
  }
</style>
