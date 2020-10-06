//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License")
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

import Vue from 'vue'

const VueStorage = {
  install (Vue) {
    const localStorage = {
      setItem (key, value) {
        window.localStorage.setItem(key, value)
      },
      getItem (key) {
        window.localStorage.getItem(key)
      },
      removeItem (key) {
        window.localStorage.removeItem(key)
      },
      setObject  (key, value) {
        this.setItem(key, JSON.stringify(value))
      },
      getObject (key) {
        const value = this.getItem(key)
        if (value) {
          try {
            return JSON.parse(value)
          } catch (err) { /* ignore error */ }
        }
      }
    }
    Object.defineProperty(Vue, 'localStorage', { value: localStorage })
    Object.defineProperty(Vue.prototype, '$localStorage', { value: localStorage })
  }
}

Vue.use(VueStorage)
