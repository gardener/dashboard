//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import CodeMirror from 'codemirror'
import forEach from 'lodash/forEach'
import join from 'lodash/join'
import map from 'lodash/map'
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
import escape from 'lodash/escape'

export class ShootEditorCompletions {
  constructor (shootProperties, editorIndent) {
    this.shootCompletions = shootProperties
    this.indentUnit = editorIndent
    this.arrayBulletIndent = 2 // -[space]
  }

  // Callback function for CodeMirror autocomplete plugin
  yamlHint (cm) {
    const cur = cm.getCursor()
    const token = this._getYamlToken(cm, cur)
    const list = this._getYamlCompletions(token, cur, cm)

    return {
      list,
      from: CodeMirror.Pos(cur.line, token.start),
      to: CodeMirror.Pos(cur.line, token.end)
    }
  }

  // Callback function for CodeMirror tooltip
  editorTooltip (e, cm) {
    const pos = cm.coordsChar({
      left: e.clientX,
      top: e.clientY
    })
    const lineTokens = cm.getLineTokens(pos.line)
    const lineString = join(map(lineTokens, 'string'), '')
    const result = lineString.match(/^(\s*)([^\s]+?):.*$/)

    if (result) {
      const indent = result[1]
      const tokenString = result[2]
      const start = indent.length
      const end = start + tokenString.length
      const string = tokenString.toLowerCase()
      const token = {
        start,
        end,
        string
      }
      if (token.start <= pos.ch && pos.ch <= token.end) {
        // Ensure that mouse pointer is on propety and not somewhere else on this line
        const completions = this._getYamlCompletions(token, pos, cm, true)
        if (completions.length === 1) {
          return first(completions)
        }
      }
    }
  }

  // callback function for cm editor enter function
  editorEnter (cm) {
    const cur = cm.getCursor()

    const { lineString, lineTokens } = this._getTokenLine(cm, cur)
    const [, indent, firstArrayItem] = lineString.match(/^(\s*)(-\s)?(.*?)?$/) || []
    let extraIntent = ''
    if (firstArrayItem) {
      extraIntent = `${repeat(' ', this.arrayBulletIndent)}`
    } else if (this._isTokenLineStartingObject(lineTokens)) {
      extraIntent = `${repeat(' ', this.indentUnit)}`
    }
    cm.replaceSelection(`\n${indent}${extraIntent}`)
  }

  // Get completions for token, exact match is used for tooltip function
  _getYamlCompletions (token, cur, cm, exactMatch = false) {
    const completionPath = this._getTokenCompletionPath(token, cur, cm)

    let completions
    if (completionPath.length > 0) {
      completions = get(this.shootCompletions, completionPath)
    } else {
      completions = this.shootCompletions
    }

    let completionArray = []
    const generateCompletionText = (propertyName, yamlType, tokenType) => {
      const numberOfSpaces = token.start + this.indentUnit + (tokenType === 'firstArrayItem' ? this.arrayBulletIndent : 0)
      const completionIndentStr = repeat(' ', numberOfSpaces)
      if (yamlType === 'array') {
        return `${propertyName}:\n${completionIndentStr}- `
      }
      if (yamlType === 'object') {
        return `${propertyName}:\n${completionIndentStr}`
      }
      return `${propertyName}: `
    }

    forIn(completions, (completion, propertyName) => {
      let text = generateCompletionText(propertyName, completion.type, token.type)
      if (token.type === 'firstArrayItem') {
        text = '- ' + text
      }
      const string = propertyName.toLowerCase()
      completionArray.push({
        text,
        string,
        property: propertyName,
        type: upperFirst(completion.type),
        description: completion.description,
        render: (el, self, data) => {
          const propertyWrapper = document.createElement('div')
          propertyWrapper.innerHTML = [
            '<span class="property">',
            escape(propertyName),
            '</span>',
            '<span class="type">',
            escape(upperFirst(completion.type)),
            '</span>'
          ].join('')
          propertyWrapper.className = 'ghint-type'
          el.appendChild(propertyWrapper)

          const descWrapper = document.createElement('div')
          descWrapper.innerHTML = [
            '<span class="description">',
            escape(completion.description),
            '</span>'
          ].join('')
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
        if (includes(words(token.string), completion.string)) {
          // filter completion if already in this line - avoid duplicate completions
          return false
        }
        // filter completions that to not match text already in line
        return includes(completion.string, token.string)
      })
    }
    return completionArray
  }

  // get token at cursor position in editor with yaml content
  _getYamlToken (cm, cur) {
    let token
    const { lineTokens, lineString } = this._getTokenLine(cm, cur)
    forEach(lineTokens, lineToken => {
      const result = lineToken.string.match(/^(\s*)-\s(.*)?$/)
      if (result) {
        const indent = result[1]
        token = lineToken
        token.type = 'firstArrayItem'
        token.string = this._getTokenStringFromLine(lineString, cur.ch)
        token.indent = token.start = indent.length
        token.end = token.start + token.string.length + this.arrayBulletIndent
        token.propertyName = trim(token.string)

        const objectToken = this._returnObjectTokenFromTokenLine(lineTokens)
        if (objectToken) {
          // firstArrayItem line can also start new object
          token.propertyName = objectToken.propertyName
        }
      }
    })
    if (!token) {
      token = this._returnObjectTokenFromTokenLine(lineTokens)
    }
    if (!token) {
      token = cm.getTokenAt(cur, true)
      token.string = this._getTokenStringFromLine(lineString, cur.ch)
      token.start = token.end - token.string.length
    }
    return token
  }

  // returns path to completions in shootCompletions object
  _getTokenCompletionPath (token, cur, cm) {
    let currentToken = token
    let line = cur.line
    const tokenContext = []

    while (line >= 0 && !this._isTopLevelProperty(currentToken)) {
      currentToken = this._getYamlToken(cm, CodeMirror.Pos(line, 0))
      if (this._isCurrentTokenParentOfToken(currentToken, token) &&
        this._isCurrentTokenIndentSmallerThanContextRoot(currentToken, tokenContext)) {
        if (currentToken.type === 'property') {
          tokenContext.unshift(currentToken)
        } else if (currentToken.type === 'firstArrayItem') {
          tokenContext.unshift(currentToken)
        }
      }
      line--
    }

    // token context contains all parent tokens of `token, except for the token itself
    const tokenPath = flatMap(tokenContext, (pathToken, index, tokenContext) => {
      const isLeafContextToken = pathToken === last(tokenContext)
      switch (pathToken.type) {
        case 'property': {
          const nextToken = nth(tokenContext, index + 1)
          if (nextToken && nextToken.type === 'firstArrayItem') {
            // next item is array, so don't append 'properties' to path
            return pathToken.propertyName
          }
          if (isLeafContextToken && token.type === 'firstArrayItem') {
            // leaf context token is array, so list properties of its items
            return [pathToken.propertyName, 'items', 'properties']
          }
          // regular property token
          return [pathToken.propertyName, 'properties']
        }
        case 'firstArrayItem': {
          const isTokenIndentIndicatingObjectStart = token.start === pathToken.indent + this.indentUnit + this.arrayBulletIndent
          if (pathToken.propertyName !== undefined && isLeafContextToken && isTokenIndentIndicatingObjectStart) {
            // firstArrayItem line can also start new object, so list properties of item object
            return ['items', 'properties', pathToken.propertyName, 'properties']
          }
          // path token is array, so list properties of its items
          return ['items', 'properties']
        }
      }
      return []
    })

    return tokenPath
  }

  // Utils
  _isTopLevelProperty (token) {
    return token.type === 'property' && token.indent === 0
  }

  _isCurrentTokenParentOfToken (currentToken, token) {
    return currentToken.indent < token.start
  }

  _isContextInitial (context) {
    return context.length === 0
  }

  _isCurrentTokenIndentSmallerThanContextRoot (currentToken, context) {
    return this._isContextInitial(context) || first(context).indent > currentToken.indent
  }

  _getTokenStringFromLine (lineString, cursorChar) {
    return trim(last(words(lineString.substring(0, cursorChar).toLowerCase())))
  }

  _isTokenLineStartingObject (lineTokens) {
    const lineEndToken = last(lineTokens)
    if (!lineEndToken) {
      return false
    }
    return lineEndToken.string === ':'
  }

  _returnObjectTokenFromTokenLine (lineTokens) {
    if (lineTokens.length < 2) {
      return
    }
    if (!this._isTokenLineStartingObject(lineTokens)) {
      return
    }

    const token = lineTokens[lineTokens.length - 2]
    const [, indent, propertyName] = token.string.match(/^(\s*)(.+?)$/)
    token.indent = token.start = indent.length
    token.propertyName = propertyName
    token.type = 'property'
    return token
  }

  _getTokenLine (cm, cur) {
    const lineTokens = cm.getLineTokens(cur.line)
    const lineString = join(map(lineTokens, 'string'), '')

    return { lineTokens, lineString }
  }
}
