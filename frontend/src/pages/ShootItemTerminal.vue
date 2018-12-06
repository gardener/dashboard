<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-layout v-resize="onResize" column fill-height class="position-relative">
    <v-flex ref="container" class="terminal-container" :style="containerStyles"></v-flex>
  </v-layout>
</template>

<script>
import 'xterm/dist/xterm.css'

import { mapGetters } from 'vuex'
import { Terminal } from 'xterm'
import * as attach from '@/lib/attach'
import * as fit from 'xterm/dist/addons/fit/fit'
import * as search from 'xterm/dist/addons/search/search'
import * as webLinks from 'xterm/dist/addons/webLinks/webLinks'
import * as winptyCompat from 'xterm/dist/addons/winptyCompat/winptyCompat'

Terminal.applyAddon(attach)
Terminal.applyAddon(fit)
Terminal.applyAddon(search)
Terminal.applyAddon(webLinks)
Terminal.applyAddon(winptyCompat)

const uri = 'wss://kubernetes:6443/api/v1/namespaces/default/pods/bash-68d67dd789-lswls/attach?container=bash&stdin=true&stdout=true&tty=true'

function encodeBase64 (input) {
  return Buffer.from(input, 'utf8').toString('base64')
}

function encodeBase64Url (input) {
  let output = encodeBase64(input)
  output = output.replace(/=/g, '')
  output = output.replace(/\+/g, '-')
  output = output.replace(/\//g, '_')
  return output
}

const protocols = [
  'v4.channel.k8s.io',
  'v3.channel.k8s.io',
  'v2.channel.k8s.io',
  'channel.k8s.io'
]

const dockerForDesktop = localStorage.getItem('docker-for-desktop')
if (dockerForDesktop) {
  const bearer = JSON.parse(dockerForDesktop).token
  protocols.unshift(`base64url.bearer.authorization.k8s.io.${encodeBase64Url(bearer)}`)
}

export default {
  name: 'shoot-item-terminal',
  data () {
    return {
      close: () => {}
    }
  },
  computed: {
    ...mapGetters([
      'projectList',
      'shootByNamespaceAndName'
    ]),
    value () {
      const data = this.shootByNamespaceAndName(this.$route.params)
      if (data) {
        const { info, ...value } = data
        return value
      }
    }
  },
  methods: {
    onResize (size) {
      if (this.term) {
        this.term.fit()
      }
    }
  },
  mounted () {
    // terminal
    const term = this.term = new Terminal({
      cols: 80,
      rows: 24
    })
    term.open(this.$refs.container)
    term.winptyCompatInit()
    term.webLinksInit()
    term.fit()
    term.focus()
    term.write('If you don\'t see a command prompt, try pressing enter.')
    this.$nextTick(() => {
      term.fit()
    })
    // websocket
    const ws = new WebSocket(uri, protocols)
    ws.binaryType = 'arraybuffer'
    ws.onopen = function () {
      term.attach(ws)
    }
    // close
    this.close = () => {
      term.detach(ws)
    }
  },
  beforeDestroy () {
    this.close()
  }
}
</script>

<style lang="styl" scoped>
  .position-relative
    position: relative !important
  .terminal-container {
      background: #212121;
      height: 100%;
      width: 100%;
      padding: 5px;
      margin: 0;
  }
  .terminal {
    font-family: "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols";
    height: 100%;
    width: 100%;
  }
</style>
