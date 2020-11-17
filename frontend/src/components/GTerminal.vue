<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div v-resize="onResize" :class="backgroundClass" class="d-flex flex-column fill-height position-relative" :id="`boundary_${uuid}`">
    <v-snackbar
      v-model="snackbarTop"
      :timeout="-1"
      :absolute="true"
      :top="true"
      multi-line
    >
      <div>{{ snackbarText }}</div>
      <g-popper
        v-if="snackbarDetailsText"
        title="Details"
        toolbarColor="cyan darken-2"
        :popperKey="`popper_snackbar_${uuid}`"
        placement="bottom"
        :boundariesSelector="`#boundary_${uuid}`"
      >
        {{snackbarDetailsText}}
        <template v-slot:popperRef>
          <v-btn text small color="cyan darken-2">
            Details
          </v-btn>
        </template>
      </g-popper>
      <v-btn text color="cyan darken-2" @click="retry">
        Retry
      </v-btn>
      <v-btn text color="cyan darken-2" @click="hideSnackbarAndClose">
        Close
      </v-btn>
    </v-snackbar>
    <v-snackbar
      v-model="errorSnackbarBottom"
      :timeout="-1"
      :absolute="true"
      :bottom="true"
      color="red"
    >
      {{ snackbarText }}
      <v-btn text @click="hideSnackbarAndClose">
        Close
      </v-btn>
    </v-snackbar>
    <drag-n-droppable-component :uuid="uuid">
      <template v-slot:handle>
        <v-system-bar dark class="systemBarTop" :class="backgroundClass" @click.native="focus">
          <v-btn icon small color="grey lighten-1" class="text-none systemBarButton mx-1 g-ignore-drag" @click="deleteTerminal">
            <v-icon class="mr-0" small>mdi-close</v-icon>
          </v-btn>
          <v-spacer></v-spacer>
          <v-icon class="pr-2">mdi-console</v-icon>
          <span>{{terminalTitle}}</span>
          <v-spacer></v-spacer>
          <v-tooltip v-if="terminalSession.imageHelpText" top class="g-ignore-drag">
            <template v-slot:activator="{ on: tooltip }">
              <!-- g-popper boundaries-selector: The id must not start with a digit. QuerySelector method uses CSS3 selectors for querying the DOM and CSS3 doesn't support ID selectors that start with a digit -->
              <g-popper
                :title="`${imageShortText} Help`"
                toolbar-color="cyan darken-2"
                :popper-key="`popper_${uuid}`"
                placement="bottom"
                :boundaries-selector="`#boundary_${uuid}`"
              >
                <span v-html="imageHelpHtml"></span>
                <template v-slot:popperRef>
                  <v-btn v-on="tooltip" v-if="terminalSession.imageHelpText" icon small color="grey lighten-1" class="text-none systemBarButton mx-1 g-ignore-drag">
                    <v-icon class="mr-0" small>mdi-help-circle-outline</v-icon>
                  </v-btn>
                </template>
              </g-popper>
            </template>
            Help
          </v-tooltip>
          <v-menu
            bottom
            offset-y
            dark
            min-width="400px"
          >
            <template v-slot:activator="{ on: menu }">
              <v-btn v-on="menu" icon small color="grey lighten-1" class="text-none systemBarButton mx-1 g-ignore-drag">
                <v-icon class="mr-0" small>mdi-menu</v-icon>
              </v-btn>
            </template>
            <v-card tile>
              <v-card-actions>
                <v-btn small block text class="justify-start" @click="split('horizontal')">
                  <icon-base width="16" height="16" viewBox="0 -2 20 20" class="mr-2">
                    <split-vertically></split-vertically>
                  </icon-base>
                  <span>Split Pane Vertically</span>
                  <v-spacer></v-spacer>
                  <span>(ctrl + shift + v)</span>
                </v-btn>
              </v-card-actions>
              <v-card-actions>
                <v-btn small block text class="justify-start" @click="split('vertical')">
                  <icon-base width="16" height="16" viewBox="0 -2 20 20" class="mr-2">
                    <split-horizontally></split-horizontally>
                  </icon-base>
                  <span>Split Pane Horizontally</span>
                  <v-spacer></v-spacer>
                  <span>(ctrl + shift + h)</span>
                </v-btn>
              </v-card-actions>
              <v-divider class="mt-1 mb-1"></v-divider>
              <v-card-actions>
                <v-btn small block text class="justify-start" @click="configure('settingsBtn')" :loading="loading.settingsBtn">
                  <v-icon small class="mr-2">mdi-cog</v-icon>
                  Settings
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-system-bar>
      </template>
      <template v-slot:component>
        <div ref="container" class="terminal-container"></div>
        <v-system-bar dark class="systemBarBottom" :class="backgroundClass">
          <v-menu
            v-model="connectionMenu"
            top
            offset-y
            dark
          >
            <template v-slot:activator="{ on: menu }">
              <v-tooltip :disabled="connectionMenu" top style="min-width: 110px">
                <template v-slot:activator="{ on: tooltip }">
                  <v-btn v-on="{ ...tooltip, ...menu }" small text color="grey lighten-1" class="text-none systemBarButton">
                    <icon-base width="18" height="18" viewBox="-2 -2 30 30" iconColor="#bdbdbd" class="mr-2">
                      <connected v-if="terminalSession.connectionState === TerminalSession.CONNECTED"></connected>
                      <disconnected v-else></disconnected>
                    </icon-base>
                    <span class="text-none grey--text text--lighten-1" style="font-size: 13px">{{connectionStateText}}</span>
                  </v-btn>
                </template>
                {{terminalSession.detailedConnectionStateText || connectionStateText}}
              </v-tooltip>
            </template>
            <v-card tile>
              <v-card-actions v-if="terminalSession.connectionState === TerminalSession.DISCONNECTED">
                <v-btn small text class="actionButton" @click="retry()">
                  <v-icon small left>mdi-reload</v-icon>
                  Reconnect
                </v-btn>
              </v-card-actions>
              <v-card-text v-else class="ml-2 mr-2">
                {{terminalSession.detailedConnectionStateText || connectionStateText}}
              </v-card-text>
            </v-card>
          </v-menu>

          <v-tooltip v-if="imageShortText" top>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn v-on="tooltip" text @click="configure('imageBtn')" :loading="loading.imageBtn" color="grey lighten-1" class="text-none systemBarButton">
                <v-icon class="mr-2">mdi-layers-triple-outline</v-icon>
                <span>{{imageShortText}}</span>
              </v-btn>
            </template>
            Image: {{terminalSession.container.image}}
          </v-tooltip>

          <v-tooltip v-if="privilegedMode !== undefined && target === 'shoot'" top>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn v-on="tooltip" small text @click="configure('secContextBtn')" :loading="loading.secContextBtn" color="grey lighten-1" class="text-none systemBarButton">
                <v-icon class="mr-2">mdi-shield-account</v-icon>
                <span>{{privilegedModeText}}</span>
              </v-btn>
            </template>
            <strong>Privileged:</strong> {{terminalSession.privileged}}<br/>
            <strong>Host PID:</strong> {{terminalSession.hostPID}}<br/>
            <strong>Host Network:</strong> {{terminalSession.hostNetwork}}
          </v-tooltip>

          <v-tooltip v-if="terminalSession.node && target === 'shoot'" top>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn v-on="tooltip" small text @click="configure('nodeBtn')" :loading="loading.nodeBtn" color="grey lighten-1" class="text-none systemBarButton">
                <v-icon :size="14" class="mr-2">mdi-server</v-icon>
                <span>{{terminalSession.node}}</span>
              </v-btn>
            </template>
            Node: {{terminalSession.node}}
          </v-tooltip>
        </v-system-bar>
      </template>
    </drag-n-droppable-component>
    <terminal-settings-dialog
      ref="settings"
      :target="target"
    ></terminal-settings-dialog>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import ora from 'ora'
import get from 'lodash/get'
import assign from 'lodash/assign'
import find from 'lodash/find'
import head from 'lodash/head'

import 'xterm/css/xterm.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

import { TerminalSession } from '@/lib/terminal'
import { FocusAddon } from '@/lib/xterm-addon-focus'
import GPopper from '@/components/GPopper'

import DragNDroppableComponent from '@/components/DragNDroppableComponent'
import { targetText, transformHtml } from '@/utils'
import { terminalConfig } from '@/utils/api'
import TerminalSettingsDialog from '@/components/dialogs/TerminalSettingsDialog'
import IconBase from '@/components/icons/IconBase'
import Connected from '@/components/icons/Connected'
import Disconnected from '@/components/icons/Disconnected'
import SplitVertically from '@/components/icons/SplitVertically'
import SplitHorizontally from '@/components/icons/SplitHorizontally'

export default {
  name: 'g-terminal',
  components: {
    TerminalSettingsDialog,
    IconBase,
    Connected,
    Disconnected,
    GPopper,
    SplitVertically,
    SplitHorizontally,
    DragNDroppableComponent
  },
  props: {
    uuid: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      hasFocus: true,
      snackbarTop: false,
      errorSnackbarBottom: false,
      snackbarText: '',
      snackbarDetailsText: undefined,
      spinner: undefined,
      loading: {
        imageBtn: false,
        secContextBtn: false,
        nodeBtn: false,
        settingsBtn: false
      },
      connectionMenu: false,
      config: {
        container: {
          image: undefined
        },
        nodes: []
      },
      selectedConfig: {},
      terminalSession: {},
      TerminalSession,
      showMenu: false
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'focusedElementId',
      'splitpaneResize'
    ]),
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
    backgroundClass () {
      return this.hasFocus ? 'background' : 'brightBackground'
    },
    isTerminalSessionCreated () {
      return this.terminalSession && this.terminalSession.isCreated
    },
    defaultImage () {
      return this.terminalSession.container.image || this.config.container.image
    },
    defaultNode () {
      const defaultNode = find(this.config.nodes, ['data.kubernetesHostname', this.terminalSession.node])
      return get(defaultNode, 'data.kubernetesHostname') || get(head(this.config.nodes), 'data.kubernetesHostname')
    },
    defaultPrivilegedMode () {
      return this.privilegedMode || false
    },
    privilegedMode () {
      return this.terminalSession.privileged || this.terminalSession.hostPID || this.terminalSession.hostNetwork
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
      return get(this.cfg, 'terminal.heartbeatIntervalSeconds', 60)
    },
    privilegedModeText () {
      return this.privilegedMode ? 'Privileged' : 'Unprivileged'
    },
    imageShortText () {
      const image = get(this.terminalSession, 'container.image', '')
      return image.substring(image.lastIndexOf('/') + 1)
    },
    imageHelpHtml () {
      return transformHtml(get(this.terminalSession, 'imageHelpText', ''))
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
    }
  },
  methods: {
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
      this.loading[refName] = true
      const { namespace, name, target } = this.data
      try {
        const { data: config } = await terminalConfig({ name, namespace, target })

        assign(this.config, config)
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
      } finally {
        this.loading[refName] = false
      }

      const initialState = {
        container: {
          image: this.defaultImage
        },
        defaultNode: this.defaultNode,
        currentNode: this.terminalSession.node,
        privilegedMode: this.defaultPrivilegedMode,
        nodes: this.config.nodes
      }
      const selectedConfig = await this.$refs.settings.promptForConfigurationChange(initialState)
      if (selectedConfig) {
        try {
          await this.terminalSession.deleteTerminal()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('failed to cleanup terminal session on configuration change')
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
      const terminalSession = this.terminalSession = new TerminalSession(this)

      this.spinner.start()
      this.spinner.text = 'Preparing terminal session'

      try {
        await terminalSession.open()
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
        terminalSession.setDisconnectedState()
      }
    },
    split (orientation) {
      this.$emit('split', orientation)
    }
  },
  mounted () {
    const term = this.term = new Terminal()
    const fitAddon = this.fitAddon = new FitAddon()
    const focusAddon = new FocusAddon(this.uuid)
    focusAddon.onFocus = () => {
      term.setOption('theme', { background: '#000' })
      this.hasFocus = true
    }
    focusAddon.onBlur = () => {
      term.setOption('theme', { background: '#333' })
      this.hasFocus = false
    }

    term.open(this.$refs.container)
    term.loadAddon(focusAddon) // must be called after open, otherwise the terminal.textarea is not initialized
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    term.focus()
    this.$nextTick(() => {
      // use $nextTick as xterm needs to be finished with rendering because fitAddon relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
      fitAddon.fit()
    })

    this.spinner = ora({
      stream: {
        write: chunk => this.term.write(chunk.toString()),
        isTTY: () => true,
        clearLine: () => this.term.write('\x1bc'), // TODO reset line only
        cursorTo: to => {}
      },
      spinner: 'dots'
    })

    this.connect()
  },
  beforeDestroy () {
    this.cancelConnectAndClose()
    if (this.term) {
      this.term.dispose()
    }
  },
  watch: {
    splitpaneResize () {
      this.onResize()
    }
  }
}
</script>

<style lang="scss" scoped>
  .position-relative {
    position: relative !important
  }
  .terminal-container {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
    margin-top: 4px;
    margin-left: 4px;
    margin-bottom: 0;
    margin-right: 0;
    max-height: calc(100% - 52px);
    /* Change stacking order so that PositionalDropzone is in front. See also https://philipwalton.com/articles/what-no-one-told-you-about-z-index/ */
    opacity: .99;
  }
  .terminal {
    font-family: "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols";
    height: 100%;
    width: 100%;
  }
  .systemBarTop .systemBarBottom {
    min-height: 25px;
  }
  .background {
    background: #000;
  }
  .brightBackground {
    background: #333;
  }
  .systemBarButton {
    min-width: 20px;
    max-height: 25px;
    letter-spacing: normal;
  }

</style>
