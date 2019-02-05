//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import includes from 'lodash/includes'

import 'vuetify/dist/vuetify.min.css'

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
      import('vue-snotify'),
      import('./utils/auth')
    ])
    .then(([
      { default: Vue },
      Vuetify,
      { default: Vuelidate },
      { default: App },
      { default: store },
      { default: router },
      { default: axios },
      { default: Snotify },
      { UserManager }
    ]) => axios
      .get('/config.json')
      .then(({ data }) => store.dispatch('setConfiguration', data))
      .then(cfg => {
        const userManager = new UserManager({
          origin: cfg.apiServerUrl
        })
        const bus = new Vue({})
        Storage.prototype.setObject = function (key, value) {
          this.setItem(key, JSON.stringify(value))
        }
        Storage.prototype.getObject = function (key) {
          const value = this.getItem(key)
          if (value) {
            try {
              return JSON.parse(value)
            } catch (err) { /* ignore error */ }
          }
        }
        Object.defineProperties(Vue.prototype, {
          $http: { value: axios },
          $userManager: { value: userManager },
          $bus: { value: bus },
          $localStorage: { value: window.localStorage }
        })
        return {
          Vue,
          Vuetify,
          Vuelidate,
          Snotify,
          App,
          store,
          router: router({ store, userManager })
        }
      })
    )
    .then(start)
    .catch(error => {
      renderServerError(error)
      throw error
    })
} else {
  renderNotSupportedBrowser(version)
}

function start ({ Vue, Vuetify, Vuelidate, Snotify, App, store, router }) {
  /* eslint-disable no-new */
  Vue.use(Vuetify, {
    iconfont: 'md'
  })
  Vue.use(Vuelidate)
  Vue.use(Snotify)

  Vue.config.productionTip = false

  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app')
}

function renderServerError (error) {
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
    However, the backend is currently unable to process your request.
  </p>
  <p>
    The backend returned this error message:<br />
    <code style="color: red">${error.message}</code>
  </p>
  <br>
  <p>
    Sorry for the inconvenience,
  </p>
  <p>
    Your Gardener Dashboard Team
  </p>`
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
