//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { EditorView } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'

import { useLogger } from '@/composables/useLogger'

import {
  forEach,
  join,
  map,
  trim,
  nth,
  filter,
  includes,
  last,
  words,
  repeat,
  upperFirst,
  flatMap,
  get,
  forIn,
  isEqual,
  first,
} from '@/lodash'

export async function createEditor (...args) {
  return new EditorView(...args)
}

export class EditorCompletions {
  constructor (shootProperties, options = {}) {
    const {
      cmView,
      supportedPaths = [],
      logger = useLogger(),
    } = options

    this._resolveSchemaArrays(shootProperties)
    this.shootCompletions = shootProperties

    this.logger = logger
    this.indentUnit = cmView.state.facet(indentUnit).length
    this.arrayBulletIndent = 2 // -[space]
    this.supportedPaths = supportedPaths
  }

  // Callback function for CodeMirror autocomplete plugin
  yamlHint (context) {
    const cmView = context.view
    const word = context.matchBefore(/\w*/)

    const cur = this._getCursor(cmView)
    const token = this._getYamlToken(cmView, cur)

    const lineString = cmView.state.doc.line(cur.line).text

    const lineContainsKeyValuePair = /\w:\s/.test(lineString)
    let list = []
    if (!lineContainsKeyValuePair) {
      list = this._getYamlCompletions(token, cur, cmView)
    }

    return {
      options: list,
      from: word.from,
      to: word.to,
      filter: false,
    }
  }

  // Callback function for CodeMirror tooltip
  editorTooltip (e, cmView) {
    const pos = cmView.posAtCoords({ x: e.clientX, y: e.clientY })
    const line = cmView.state.doc.lineAt(pos).number
    const lineChar = pos - cmView.state.doc.line(line).from

    const lineString = cmView.state.doc.line(line).text
    const result = lineString.match(/^(\s*-?\s*)([^\s]+?):.*$/)

    if (result) {
      const [, indent, tokenString] = result
      const start = indent.length
      const end = start + tokenString.length
      const string = tokenString.toLowerCase()
      const token = {
        start,
        end,
        string,
      }
      if (token.start <= lineChar && lineChar <= token.end) {
        // Ensure that mouse pointer is on propety and not somewhere else on this line
        const completions = this._getYamlCompletions(token, { ch: lineChar, line }, cmView, true)
        if (completions.length === 1) {
          return first(completions)
        }
      }
    }
  }

  // callback function for cm editor enter function
  editorEnter (cmView) {
    const cur = this._getCursor(cmView)

    const lineString = cmView.state.doc.line(cur.line).text
    const [, indent, firstArrayItem] = lineString.match(/^(\s*)(-\s)?(.*?)?$/) || []

    let extraIntent = ''
    if (firstArrayItem) {
      extraIntent = `${repeat(' ', this.arrayBulletIndent)}`
    } else if (this._isLineStartingObject(lineString)) {
      extraIntent = `${repeat(' ', this.indentUnit)}`
    }
    this._replaceSelection(cmView, `\n${indent}${extraIntent}`)
  }

  // Get completions for token, exact match is used for tooltip function
  _getYamlCompletions (token, cur, cmView, exactMatch = false) {
    const completionPath = this._getTokenCompletionPath(token, cur, cmView)
    if (this.supportedPaths?.length) {
      const currentPath = completionPath.join('.')
      if (!this.supportedPaths.some(path => currentPath.startsWith(path))) {
        return []
      }
    }

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

    const generateTypeText = (type, format) => {
      const formatTypeText = (type, format) => {
        return format ? `${upperFirst(type)} (${format})` : upperFirst(type)
      }
      if (Array.isArray(type)) {
        return type
          .map((type, i) => formatTypeText(type, format[i]))
          .join(' | ')
      }
      return formatTypeText(type, format)
    }

    forIn(completions, (completion, propertyName) => {
      const text = generateCompletionText(propertyName, completion.type, token.type)
      if (token.type === 'firstArrayItem') {
        // text = '- ' + text // TODO: Selection ccurently does not replace the bullet
      }
      const string = propertyName.toLowerCase()
      const typeText = generateTypeText(completion.type, completion.format)

      completionArray.push({
        label: string,
        displayLabel: text,
        detail: typeText,
        type: 'keyword', // TODO check weather we want to show diffrent icons
        info: completion.description,
        apply: text,
        property: propertyName,
      })
    })

    if (trim(token.string).length > 0) {
      completionArray = filter(completionArray, completion => {
        let tokenString = token.string
        if (token.type === 'firstArrayItem') {
          tokenString = tokenString.replace(/.*\s-\s/, '')
        }
        if (exactMatch) {
          return isEqual(completion.label, tokenString)
        }
        // filter completions that to not match text already in line
        return includes(completion.label, tokenString)
      })
    }

    return completionArray
  }

  // get token at cursor position in editor with yaml content
  _getYamlToken (cmView, cur) {
    let token
    const lineString = cmView.state.doc.line(cur.line).text

    const result = lineString.match(/^(\s*)-\s(.*)?$/)
    if (result) {
      const indent = result[1]
      token = { string: lineString }
      token.type = 'firstArrayItem'
      token.indent = token.start = indent.length
      token.end = token.start + token.string.length + this.arrayBulletIndent
      token.propertyName = trim(token.string)

      const objectToken = this._returnObjectTokenFromLine(lineString)
      if (objectToken) {
        // firstArrayItem line can also start new object
        token.propertyName = objectToken.propertyName
      }
    }
    if (!token) {
      token = this._returnObjectTokenFromLine(lineString)
    }
    if (!token) {
      const string = this._getTokenStringFromLine(lineString, cur.ch)
      token = {
        string,
        start: cur.ch - string.length,
        end: cur.ch,
      }
    }

    return token
  }

  // returns path to completions in shootCompletions object
  _getTokenCompletionPath (token, cur, cmView) {
    let currentToken = token
    let line = cur.line
    const tokenContext = []
    while (line >= 1 && !this._isTopLevelProperty(currentToken)) {
      currentToken = this._getYamlToken(cmView, { line, ch: 0 })
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

  _isLineStartingObject (lineString) {
    return lineString.endsWith(':')
  }

  _returnObjectTokenFromLine (lineString) {
    if (!this._isLineStartingObject(lineString)) {
      return
    }

    const [, indent, propertyName] = lineString.match(/^(\s*)(.+?):$/)
    const token = { string: lineString }
    token.indent = token.start = indent.length
    token.propertyName = propertyName
    token.type = 'property'

    return token
  }

  _resolveSchemaArrays (properties, parentPropertyName = '') {
    const hasOnlyTypeOrTypeAndFormatProperties = value => {
      if (value.every(item => {
        return (Object.keys(item).length === 1 && item.type) ||
        (Object.keys(item).length === 2 && item.type && item.format)
      })) {
        return true
      }
      return false
    }
    let foundDiscriminators = false
    for (const [propertyName, propertyValue] of Object.entries(properties)) {
      if (['allOf', 'anyOf', 'oneOf'].includes(propertyName) && !properties.type) {
        if (foundDiscriminators) {
          // We currently do not support merging when schema has multiple discriminators on same level
          this.logger.warn('Found multiple discriminators in schema at %s', parentPropertyName)
        }
        foundDiscriminators = true

        if (propertyValue.length === 1) {
          this._resolveSchemaArrays(propertyValue[0], parentPropertyName)
          Object.assign(properties, propertyValue[0])
        } else if (propertyValue.length > 1 && propertyName === 'oneOf') {
          if (hasOnlyTypeOrTypeAndFormatProperties(propertyValue)) {
            // In case of oneOf, we support multiple entries if they are only used to define different types
            properties.type = propertyValue.map(obj => obj.type)
            properties.format = propertyValue.map(obj => obj.format)
          } else {
            this.logger.warn('Found unsupported oneOf discriminator at %s', parentPropertyName)
          }
        } else {
          this.logger.warn('Unsupported schema array length, %s has length %i at %s', propertyName, propertyValue.length, parentPropertyName)
        }

        delete properties[propertyName]
      } else if (typeof propertyValue === 'object') {
        this._resolveSchemaArrays(propertyValue, propertyName)
      }
    }
  }

  _getCursor (cmView) {
    const selection = cmView.state.selection.main
    const line = cmView.state.doc.lineAt(selection.head).number
    const ch = selection.head - cmView.state.doc.line(line).from
    return { line, ch }
  }

  _replaceSelection (cmView, replacementText) {
    const selection = cmView.state.selection.main
    const newCursorPosition = selection.from + replacementText.length
    cmView.dispatch({
      changes: { from: selection.from, to: selection.to, insert: replacementText },
      selection: { anchor: newCursorPosition },
    })
  }
}
