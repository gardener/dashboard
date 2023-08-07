// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import { ShootEditorCompletions } from '@/utils/shootEditorCompletions'
import CodeMirror from 'codemirror'
import 'codemirror/mode/yaml/yaml.js'

import repeat from 'lodash/repeat'

const shootCompletions = {
  spec: {
    type: 'object',
    description: 'spec description',
    properties: {
      apiVersion: {
        type: 'string',
      },
      kind: {
        type: 'string',
      },
      metadata: {
        type: 'object',
        properties: {
          annotations: {
            type: 'object',
          },
          managedFields: {
            description: 'Demo Array',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                apiVersion: {
                  type: 'string',
                },
                fieldsType: {
                  type: 'string',
                },
                managedObjects: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

describe('utils', () => {
  describe('shootEditorCompletions', () => {
    let editor
    let setEditorContentAndCursor
    let setEditorCursor
    let shootEditorCompletions

    beforeAll(() => {
      const element = document.createElement('div')
      const options = {
        indentUnit: 3,
        mode: 'text/x-yaml',
      }
      editor = CodeMirror(element, options)

      setEditorContentAndCursor = (content, line, ch) => {
        const doc = editor.doc
        doc.setValue(content)
        setEditorCursor(line, ch)
      }

      setEditorCursor = (line, ch) => {
        const doc = editor.doc
        doc.setCursor(CodeMirror.Pos(line, ch))
      }

      shootEditorCompletions = new ShootEditorCompletions(shootCompletions, editor.options.indentUnit)
    })

    describe('#yamlHint', () => {
      it('should return a simple hint', () => {
        setEditorContentAndCursor('', 0, 0)
        const completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toBeInstanceOf(Array)
        expect(completions).toHaveLength(1)
        const { text, string, property, type, description } = completions[0]
        expect(text).toBe('spec:\n   ')
        expect(string).toBe('spec')
        expect(property).toBe('spec')
        expect(type).toBe('Object')
        expect(description).toBe('spec description')
      })

      it('should return properties of an object', () => {
        setEditorContentAndCursor('spec:\n   ', 0, 0)
        let completions = shootEditorCompletions.yamlHint(editor).list
        // completions length is 0 because we filter completion if already in this line - avoid duplicate completions
        expect(completions).toHaveLength(0)

        setEditorCursor(1, 0)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(1)

        setEditorCursor(1, 3)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(3)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).toBe('apiVersion: ')
        expect(type0).toBe('String')

        const { text: text2, type: type2 } = completions[2]
        expect(text2).toBe('metadata:\n      ')
        expect(type2).toBe('Object')
      })

      it('should provide code completion for array start', () => {
        setEditorContentAndCursor('spec:\n  metadata:\n      ', 2, 0)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(1)

        setEditorCursor(2, 6)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(2)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).toBe('annotations:\n         ')
        expect(type0).toBe('Object')

        const { text: text1, type: type1 } = completions[1]
        expect(text1).toBe('managedFields:\n         - ')
        expect(type1).toBe('Array')
      })

      it('should provide code completion for first array item', () => {
        setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - ', 3, 11)
        let completions = shootEditorCompletions.yamlHint(editor).list

        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(3)

        const { text: text0, type: type0 } = completions[0]
        expect(text0).toBe('- apiVersion: ')
        expect(type0).toBe('String')

        const { text: text1, type: type1 } = completions[1]
        expect(text1).toBe('- fieldsType: ')
        expect(type1).toBe('String')
      })

      it('should provide code completion for second array item', () => {
        setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - apiVersion: foo\n           ', 4, 11)
        const completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(3)

        const { text, type } = completions[1]
        expect(text).toBe('fieldsType: ')
        expect(type).toBe('String')
      })

      it('should provide code completion if first item of an array is an object', () => {
        setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - ma', 3, 12)
        const completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(1)
        const { text, type } = completions[0]

        expect(text).toBe('- managedObjects:\n              ')
        expect(type).toBe('Object')
      })

      it(
        'should provide code completion if context has object as first array item',
        () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - managedObjects:\n              ', 4, 14)
          const completions = shootEditorCompletions.yamlHint(editor).list
          expect(completions).toHaveLength(1)
          const { text, type } = completions[0]
          expect(text).toBe('foo: ')
          expect(type).toBe('String')
        },
      )

      it('should filter completions according to typed text', () => {
        setEditorContentAndCursor('spec:\n   ', 1, 3)
        let completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(3)

        setEditorContentAndCursor('spec:\n   ki', 1, 5)
        completions = shootEditorCompletions.yamlHint(editor).list
        expect(completions).toHaveLength(1)

        const { text, type } = completions[0]
        expect(text).toBe('kind: ')
        expect(type).toBe('String')
      })

      it(
        'should traverse path correctly, do not add properties on same level to path',
        () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      annotations:\n         foo: bar\n      managedFields:\n         - apiVersion: foo\n            ', 6, 12)
          const completions = shootEditorCompletions.yamlHint(editor).list
          expect(completions).toHaveLength(3)

          const { text, type } = completions[1]
          expect(text).toBe('fieldsType: ')
          expect(type).toBe('String')
        },
      )
    })
    describe('#editorTooltip', () => {
      it('should return a simple tooltip', () => {
        setEditorContentAndCursor('spec:', 0, 0)
        editor.coordsChar = () => {
          return { line: 0, ch: 1 }
        }
        const tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).toBe('Object')
      })

      it('should return tooltips for nested properties', () => {
        setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n', 0, 0)
        editor.coordsChar = () => {
          return { line: 1, ch: 1 }
        }
        let tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip).toBeUndefined()

        editor.coordsChar = () => {
          return { line: 1, ch: 3 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).toBe('Object')

        editor.coordsChar = () => {
          return { line: 2, ch: 5 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip.type).toBe('Array')
        expect(tooltip.description).toBe('Demo Array')

        editor.coordsChar = () => {
          return { line: 2, ch: 18 }
        }
        tooltip = shootEditorCompletions.editorTooltip({}, editor)
        expect(tooltip).toBeUndefined()
      })
    })
    describe('#editorEnter', () => {
      let spy
      beforeEach(() => {
        spy = vi.spyOn(editor, 'replaceSelection')
      })

      afterEach(() => {
        spy.mockReset()
      })

      it('should return a simple line break', () => {
        setEditorContentAndCursor('', 0, 0)
        shootEditorCompletions.editorEnter(editor)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith('\n')

        spy.mockReset()
        setEditorContentAndCursor('test', 0, 0)
        shootEditorCompletions.editorEnter(editor)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith('\n')
      })

      it('should preserve indent after a regular line', () => {
        setEditorContentAndCursor('spec:\n  foo:bar', 1, 9)
        shootEditorCompletions.editorEnter(editor)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith('\n  ')
      })

      it('should increase indent after an object or array', () => {
        setEditorContentAndCursor('spec:\n  foo:', 1, 6)
        shootEditorCompletions.editorEnter(editor)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(`\n  ${repeat(' ', editor.options.indentUnit)}`)
      })

      it('should increase indent after first item of an array', () => {
        setEditorContentAndCursor('spec:\n  foo:\n    - foo:bar', 2, 13)
        shootEditorCompletions.editorEnter(editor)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith('\n      ')
      })
    })
  })
})
