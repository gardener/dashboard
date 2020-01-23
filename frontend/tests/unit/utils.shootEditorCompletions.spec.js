//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect } from 'chai'
import { ShootEditorCompletions } from '@/utils/shootEditorCompletions'
import CodeMirror from 'codemirror'
import 'codemirror/mode/yaml/yaml.js'

document.body.createTextRange = function () {
  return {
    setEnd: function () {},
    setStart: function () {},
    getBoundingClientRect: function () {
      return { right: 0 }
    },
    getClientRects: function () {
      return {
        length: 0,
        left: 0,
        right: 0
      }
    }
  }
}

const element = document.createElement('div')
const options = {
  indentUnit: 2,
  mode: 'text/x-yaml'
}
const editor = CodeMirror(element, options)

const setEditorContentAndCursor = (content, line, ch) => {
  const doc = editor.doc
  doc.setValue(content)
  setEditorCursor(line, ch)
}

const setEditorCursor = (line, ch) => {
  const doc = editor.doc
  doc.setCursor(CodeMirror.Pos(line, ch))
}

const shootCompletions = {
  spec: {
    type: 'object',
    description: 'spec description',
    properties: {
      apiVersion: {
        type: 'string'
      },
      kind: {
        type: 'string'
      },
      metadata: {
        type: 'object',
        properties: {
          annotations: {
            type: 'object'
          },
          managedFields: {
            description: 'Demo Array',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                apiVersion: {
                  type: 'string'
                },
                fieldsType: {
                  type: 'string'
                },
                managedObjects: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
const shootEditorCompletions = new ShootEditorCompletions(shootCompletions, editor.options.indentUnit)

describe('utils', function () {
  describe('shootEditorCompletions', function () {
    describe('#yamlHint', function () {
      it('should return a simple hint', function () {
        setEditorContentAndCursor('', 0, 0)
        const completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.be.an.instanceof(Array)
        expect(completions).to.have.length(1)
        const { text, string, property, type, description } = completions[0]
        expect(text).to.equal('spec:\n  ')
        expect(string).to.equal('spec')
        expect(property).to.equal('spec')
        expect(type).to.equal('Object')
        expect(description).to.equal('spec description')
      })

      it('should return properties of an object', function () {
        setEditorContentAndCursor('spec:\n  ', 0, 0)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)

        setEditorCursor(1, 0)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)

        setEditorCursor(1, 2)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(3)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).to.equal('apiVersion: ')
        expect(type0).to.equal('String')

        const { text: text2, type: type2 } = completions[2]
        expect(text2).to.equal('metadata:\n    ')
        expect(type2).to.equal('Object')
      })

      it('should provide code completion for array start', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    ', 2, 0)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)

        setEditorCursor(2, 4)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(2)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).to.equal('annotations:\n      ')
        expect(type0).to.equal('Object')

        const { text: text1, type: type1 } = completions[1]
        expect(text1).to.equal('managedFields:\n      - ')
        expect(type1).to.equal('Array')
      })

      it('should provide code completion for first array item', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n      - ', 3, 0)
        let completions = shootEditorCompletions.yamlHint(editor).list
        // expect(completions).to.have.length(1) TODO: FIX ERROR

        setEditorCursor(3, 8)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(3)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).to.equal('- apiVersion: ')
        expect(type0).to.equal('String')

        const { text: text1, type: type1 } = completions[1]
        expect(text1).to.equal('- fieldsType: ')
        expect(type1).to.equal('String')
      })

      it('should provide code completion for second array item', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n      - apiVersion: foo\n        ', 4, 8)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(3)

        const { text, type } = completions[1]
        expect(text).to.equal('fieldsType: ')
        expect(type).to.equal('String')
      })

      it('should provide code completion if first item of an array is an object', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n      - ma', 3, 10)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)
        const { type } = completions[0]
        // expect(text).to.equal('- managedObjects:\n          ') TODO: FIX ERROR
        expect(type).to.equal('Object')
      })

      it('should provide code completion if context has object as first array item', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n      - managedObjects:\n          ', 4, 10)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)
        const { text, type } = completions[0]
        expect(text).to.equal('foo: ')
        expect(type).to.equal('String')
      })

      it('should filter completions according to typed text', function () {
        setEditorContentAndCursor('spec:\n  ', 1, 2)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(3)

        setEditorContentAndCursor('spec:\n  ki', 1, 4)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).to.have.length(1)

        const { text, type } = completions[0]
        expect(text).to.equal('kind: ')
        expect(type).to.equal('String')
      })
    })
    describe('#editorTooltip', function () {
      it('should return a simple tooltip', function () {
        setEditorContentAndCursor('spec:', 0, 0)
        editor.coordsChar = () => {
          return { line: 0, ch: 1 }
        }
        const tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).to.equal('Object')
      })

      it('should return tooltips for nested properties', function () {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n', 0, 0)
        editor.coordsChar = () => {
          return { line: 1, ch: 1 }
        }
        let tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip).to.be.undefined

        editor.coordsChar = () => {
          return { line: 1, ch: 3 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).to.equal('Object')

        editor.coordsChar = () => {
          return { line: 2, ch: 5 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).to.equal('Array')
        expect(tooltip.description).to.equal('Demo Array')

        editor.coordsChar = () => {
          return { line: 2, ch: 18 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip).to.be.undefined
      })
    })
  })
})
