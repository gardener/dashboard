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

'use strict'

import CodeMirror from 'codemirror'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
import reverse from 'lodash/reverse'
import trim from 'lodash/trim'
import nth from 'lodash/nth'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import last from 'lodash/last'
import words from 'lodash/words'
import repeat from 'lodash/repeat'
import upperFirst from 'lodash/upperFirst'
import flatMap from 'lodash/flatMap'
import get from 'lodash/get'
import forIn from 'lodash/forIn'
import isEqual from 'lodash/isEqual'
import first from 'lodash/first'

export class ShootEditorCompletions {
  constructor (allShootCompletions, editorIndent) {
    this.shootCompletions = allShootCompletions
    this.indentUnit = editorIndent
  }

  yamlHint (editor, options) {
    const cur = editor.getCursor()
    const token = this.getYamlToken(editor, cur)
    const list = this.getYamlCompletions(token, cur, editor)

    options.completeSingle = false

    return {
      list,
      from: CodeMirror.Pos(cur.line, token.start),
      to: CodeMirror.Pos(cur.line, token.end)
    }
  }

  editorTooltip (e, cm) {
    let pos = cm.coordsChar({
      left: e.clientX,
      top: e.clientY
    })
    const lineTokens = cm.getLineTokens(pos.line)
    const lineString = join(map(lineTokens, 'string'), '')
    const result = lineString.match(/^(\s*)(.*?)([^\s]+):.*$/)
    if (result) {
      const start = result[1].length + result[2].length
      const end = start + result[3].length
      const string = result[3].toLowerCase()
      const token = {
        start,
        end,
        string
      }
      if (token.start <= pos.ch && pos.ch <= token.end) {
        const completions = this.getYamlCompletions(token, pos, cm, true)
        if (completions.length === 1) {
          return first(completions)
        }
      }
    }
  }

  getYamlCompletions (token, cur, editor, exactMatch = false) {
    let tprop = token
    let line = cur.line
    let context = []
    while (line > 0 && !(tprop.type === 'property' && tprop.indent === 0)) {
      tprop = this.getYamlToken(editor, CodeMirror.Pos(line, 0))
      if (tprop.indent < token.start &&
          (context.length === 0 || context[context.length - 1].indent > tprop.indent)) {
        if (tprop.type === 'property') {
          context.push(tprop)
        } else if (tprop.type === 'arrayStart') {
          context.push(tprop)
        }
      }
      line--
    }

    return this.getCompletions(token, context, exactMatch)
  }

  getYamlToken (editor, cur) {
    let token
    let lineTokens = editor.getLineTokens(cur.line)
    const lineString = join(map(lineTokens, 'string'), '')
    forEach(lineTokens, lineToken => {
      let result = lineToken.string.match(/^(\s*)-\s(.*)?$/)
      if (result) {
        token = lineToken
        token.type = 'arrayStart'
        token.string = trim(last(words(lineString.substring(0, cur.ch).toLowerCase())))
        token.indent = token.start = result[1].length
        token.end = token.start + token.string.length + 2
        if (lineTokens.length >= 2 && lineTokens[lineTokens.length - 1].string === ':') {
          // arrayStart line can also start new object
          let result = lineTokens[lineTokens.length - 2].string.match(/^(\s*)(.+?)$/)
          token.propertyName = result[2]
        }
      }
    })
    if (!token) {
      if (lineTokens.length >= 2 && lineTokens[lineTokens.length - 1].string === ':') {
        token = lineTokens[lineTokens.length - 2]
        let result = token.string.match(/^(\s*)(.+?)$/)
        token.indent = token.start = result[1].length
        token.propertyName = result[2]
        token.type = 'property'
      }
    }
    if (!token) {
      token = editor.getTokenAt(cur, true)
      token.string = trim(last(words(lineString.substring(0, cur.ch).toLowerCase())))
      token.start = token.end - token.string.length
    }
    return token
  }

  getCompletions (token, context, exactMatch) {
    const completionPath = flatMap(reverse(context), (pathToken, index, revContext) => {
      if (pathToken.type === 'property') {
        if (get(nth(revContext, index + 1), 'type') === 'arrayStart') {
          // next item is array, so don't append 'properties'
          return pathToken.propertyName
        }
        if (index === revContext.length - 1 && token.type === 'arrayStart') {
          // current token is array, so list properties of its items
          return [pathToken.propertyName, 'items', 'properties']
        }
        // normal property token
        return [pathToken.propertyName, 'properties']
      } else if (pathToken.type === 'arrayStart') {
        if (pathToken.propertyName !== undefined && token.start === pathToken.indent + (this.indentUnit * 2)) {
          // arrayStart line can also start new object, so list properties of specific item
          return ['items', 'properties', pathToken.propertyName, 'properties']
        }
        // path token is array, so list properties of its items
        return ['items', 'properties']
      } else {
        return []
      }
    })

    let completions
    if (completionPath.length > 0) {
      completions = get(this.shootCompletions, completionPath)
    } else {
      completions = this.shootCompletions
    }

    let completionArray = []
    const generateCompletionText = (key, type) => {
      const completionIndentStr = `${repeat(' ', token.start)}${repeat(' ', this.indentUnit)}`
      if (type === 'array') {
        return `${key}:\n${completionIndentStr}- `
      } else if (type === 'object') {
        return `${key}:\n${completionIndentStr}`
      } else {
        return `${key}: `
      }
    }
    forIn(completions, (value, key) => {
      const text = `${token.type === 'arrayStart' ? '- ' : ''}${generateCompletionText(key, value.type)}`
      const string = key.toLowerCase()
      completionArray.push({
        text,
        string,
        property: key,
        type: upperFirst(value.type),
        description: value.description,
        render: (el, self, data) => {
          const propertyWrapper = document.createElement('div')
          propertyWrapper.innerHTML = `<span class="property">${key}</span><span class="type">${upperFirst(value.type)}</span>`
          propertyWrapper.className = 'ghint-type'
          el.appendChild(propertyWrapper)

          const descWrapper = document.createElement('div')
          descWrapper.innerHTML = `<span class="description">${value.description}</span>`
          descWrapper.className = 'ghint-desc'
          el.appendChild(descWrapper)
        }
      })
    })
    if (trim(token.string).length > 0) {
      completionArray = filter(completionArray, completion => {
        if (exactMatch) {
          return isEqual(completion.string, token.string)
        }
        return includes(completion.string, token.string)
      })
    }
    return completionArray
  }
}
