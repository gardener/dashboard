//
// Copyright 2018 by The Gardener Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/*
 * The Vue build version to load with the `import` command
 * (runtime-only or standalone) has been set in webpack.base.conf with an alias.
 */
import { parse as parseUrl } from 'url'
import includes from 'lodash/includes'

import 'mdi/css/materialdesignicons.css'

const version = isIE()

if (version === false) {
  Promise
    .all([
      import('vue'),
      import('vuetify'),
      import('vuelidate'),
      import('./App'),
      import('./store'),
      import('./router'),
      import('axios'),
      import('oidc-client')
    ])
    .then(([
      {default: Vue},
      {default: Vuetify},
      {default: Vuelidate},
      {default: App},
      {default: store},
      {default: router},
      {default: axios},
      {default: Oidc}
    ]) => axios
      .get('/config.json')
      .then(({data}) => store.dispatch('setConfiguration', data))
      .then(cfg => {
        Oidc.Log.logger = console
        Oidc.Log.level = Oidc.Log.ERROR
        const userStore = new Oidc.WebStorageStateStore()
        try {
          const redirectUri = parseUrl(cfg.oidc.redirect_uri)
          if (redirectUri) {
            cfg.oidc.redirect_uri = window.location.origin + redirectUri.path
          }
        } catch (err) {
          console.error('Invalid redirect URI in OIDC config', err)
        }
        const userManager = new Oidc.UserManager(Object.assign({userStore}, cfg.oidc))
        const bus = new Vue({})
        Storage.prototype.setObject = function (key, value) {
          this.setItem(key, JSON.stringify(value))
        }
        Storage.prototype.getObject = function (key) {
          const value = this.getItem(key)
          return value && JSON.parse(value)
        }
        Object.defineProperties(Vue.prototype, {
          $userManager: {value: userManager},
          $http: {value: axios},
          $bus: {value: bus},
          $localStorage: {value: window.localStorage}
        })
        return {
          Vue,
          Vuetify,
          Vuelidate,
          App,
          store,
          router: router({store, userManager})
        }
      })
    )
    .then(start)
} else {
  renderNotSupportedBrowser(version)
}

function start ({Vue, Vuetify, Vuelidate, App, store, router}) {
  /* eslint-disable no-new */
  Vue.use(Vuetify)
  Vue.use(Vuelidate)

  Vue.config.productionTip = false

  new Vue({
    el: '#app',
    router,
    store,
    template: '<App/>',
    components: {
      App
    }
  })
}

function renderNotSupportedBrowser (version) {
  const browser = version >= 12 ? 'Microsoft Edge' : 'Internet Explorer'
  const elem = document.getElementById('app')
  elem.style.fontFamily = `'Roboto', sans-serif`
  elem.style.fontSize = '14px'
  elem.style.fontWeight = '300'
  elem.style.lineHeight = '1.5'
  elem.style.padding = '30px'
  elem.style.border = '1px solid darkred'
  elem.style.whiteSpace = 'nowrap'
  elem.style.position = 'absolute'
  elem.style.top = '30%'
  elem.style.left = '30px'
  elem.innerHTML = `<strong>Dear user,</strong>
  <p>
    you reached the Kubernetes Clusters self-service
    powered by <a href="https://github.com/gardener">Gardener</a>.
    <br>
    However, we do not support the browser you are using "${browser} (${version})".
  </p>
  <p>
    Please use a modern browser like Firefox or Chrome.
  </p>
  <br>
  <p>
    Sorry for the inconvenience,
  </p>
  <p>
    Your Gardener Dashboard Team
  </p>`
}

function parseVersion (ua, pattern, index) {
  return parseInt(ua.substring(index + pattern.length, ua.indexOf('.', index)), 10)
}

function isIE () {
  const ua = window.navigator.userAgent
  let index, pattern
  pattern = 'MSIE '
  if ((index = ua.indexOf(pattern)) !== -1) {
    return parseVersion(ua, pattern, index)
  }
  pattern = 'rv:'
  if (includes(ua, 'Trident/') && (index = ua.indexOf(pattern)) !== -1) {
    return parseVersion(ua, pattern, index)
  }
  pattern = 'Edge/'
  if ((index = ua.indexOf(pattern)) !== -1) {
    return parseVersion(ua, pattern, index)
  }
  return false
}
