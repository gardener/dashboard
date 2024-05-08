//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

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
  const { default: CodeMirror } = await import('./codemirror')
  return CodeMirror(...args)
}

export class EditorCompletions {
  constructor (shootProperties, options = {}) {
    const {
      cm,
      supportedPaths = [],
      logger = useLogger(),
    } = options

    this._resolveSchemaArrays(shootProperties)
    this.shootCompletions = shootProperties

    this.logger = logger
    this.indentUnit = get(cm, 'options.indentUnit', 2)
    this.arrayBulletIndent = 2 // -[space]
    this.supportedPaths = supportedPaths
    this.createPos = get(cm, 'constructor.Pos')
  }

  // Callback function for CodeMirror autocomplete plugin
  yamlHint (cm) {
    const cur = cm.getCursor()
    const token = this._getYamlToken(cm, cur)
    const list = this._getYamlCompletions(token, cur, cm)

    return {
      list,
      from: this.createPos(cur.line, token.start),
      to: this.createPos(cur.line, token.end),
    }
  }

  // Callback function for CodeMirror tooltip
  editorTooltip (e, cm) {
    const pos = cm.coordsChar({
      left: e.clientX,
      top: e.clientY,
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
        string,
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
      let text = generateCompletionText(propertyName, completion.type, token.type)
      if (token.type === 'firstArrayItem') {
        text = '- ' + text
      }
      const string = propertyName.toLowerCase()
      const type = generateTypeText(completion.type, completion.format)

      completionArray.push({
        text,
        string,
        property: propertyName,
        type,
        description: completion.description,
        render (el, self, data) {
          const document = el.ownerDocument
          const { property, type, description } = data

          const propertyElement = document.createElement('span')
          propertyElement.className = 'property'
          propertyElement.textContent = property

          const typeElement = document.createElement('span')
          typeElement.className = 'type'
          typeElement.textContent = type

          const propertyWrapper = document.createElement('div')
          propertyWrapper.className = 'ghint-type'
          propertyWrapper.appendChild(propertyElement)
          propertyWrapper.appendChild(typeElement)

          const descriptionElement = document.createElement('span')
          descriptionElement.className = 'description'
          descriptionElement.textContent = description

          const descriptionWrapper = document.createElement('div')
          descriptionWrapper.className = 'ghint-desc'
          descriptionWrapper.appendChild(descriptionElement)

          el.appendChild(propertyWrapper)
          el.appendChild(descriptionWrapper)
        },
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
      currentToken = this._getYamlToken(cm, this.createPos(line, 0))
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
}
