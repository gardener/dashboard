<template>
  <v-container fluid fill-height class="cm-container">
    <v-dialog v-model="visible" @keydown.esc="close" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-toolbar dense dark>
        <v-toolbar-title>Cluster Editor</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon flat @click="onCancel">
          <v-icon>close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-alert type="warning" color="cyan darken-2" :value="warning" @input="dismissWarning" dismissible class="modification--warning">
        By modifying the resource directly you may cause serious problems in your cluster.
        We cannot guarantee that you can solve problems that result from using Cluster Editor incorrectly.
      </v-alert>
      <codemirror ref="editor" :options="cmOptions"></codemirror>
      <v-snackbar
        bottom
        :timeout="0"
        color="error"
        :multi-line="true"
        v-model="snackbar"
        class="modification--error-message">
       {{errorMessage}}
       <v-btn dark flat @click.native="snackbar = false">Close</v-btn>
     </v-snackbar>
      <v-footer fixed height="56">
        <div class="px-3">
          <v-btn @click="onSave" dark color="cyan darken-2" >Save</v-btn>
          <v-btn @click="onCancel">Cancel</v-btn>
        </div>
      </v-footer>
    </v-dialog>
  </v-container>
</template>

<script>
import { codemirror } from 'vue-codemirror'
import { replaceShootSpec } from '@/utils/api'
import { safeLoad } from 'js-yaml'

import 'codemirror/lib/codemirror.css'

import 'codemirror/mode/yaml/yaml.js'

export default {
  components: {
    codemirror
  },
  props: {
    content: {
      type: String,
      required: true
    }
  },
  data () {
    const vm = this
    return {
      visible: false,
      warning: true,
      snackbar: false,
      errorMessage: null,
      cmOptions: {
        tabSize: 4,
        mode: 'text/x-yaml',
        scrollbarStyle: 'native',
        lineNumbers: true,
        line: true,
        extraKeys: {
          'Ctrl-S' (cm) {
            vm.save(cm.getValue())
          },
          'Cmd-S' (cm) {
            vm.save(cm.getValue())
          },
          'Esc' () {
            vm.close()
          }
        }
      }
    }
  },
  mounted () {
    const value = this.$localStorage.getItem('showShootEditorWarning')
    this.warning = value === null || value === 'true'
  },
  updated () {
    const editor = this.$refs.editor
    if (editor) {
      editor.refresh()
    }
  },
  methods: {
    open () {
      this.setValue(this.content)
      this.snackbar = false
      this.visible = true
    },
    close () {
      this.visible = false
      this.snackbar = false
      this.errorMessage = null
      this.$emit('close')
    },
    save (value) {
      const user = this.$store.state.user
      const { metadata: {namespace, name} } = safeLoad(this.content)
      const { spec } = safeLoad(value)
      return replaceShootSpec({namespace, name, user, data: spec})
        .then(() => {
          this.close()
        })
        .catch(err => {
          this.snackbar = true
          this.errorMessage = err.response.data.message
        })
    },
    dismissWarning () {
      this.warning = false
      this.$localStorage.setItem('showShootEditorWarning', 'false')
    },
    setValue (content) {
      const editor = this.$refs.editor
      if (editor) {
        editor.cminstance.setValue(content)
      }
    },
    getValue () {
      const editor = this.$refs.editor
      if (editor) {
        return editor.cminstance.getValue()
      }
      return this.content
    },
    onSave (event) {
      this.save(this.getValue())
    },
    onCancel () {
      this.close()
    }
  },
  name: 'ShootEditor'
}
</script>

<style>
.modification--warning {
  margin-top: 0;
  width: 100%;
  z-index: 13;
  opacity: 0.95;
}
.modification--error-message {
  margin-bottom: 10px;
  z-index: 14
}
.dialog--fullscreen {
  border-radius: 0;
}
.CodeMirror {
  position: fixed;
  top: 48px; left: 0; right: 0; bottom: 56px;
  height: auto;
}
</style>