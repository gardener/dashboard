// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import { EditorView } from '@codemirror/view'
import { yaml as cmYaml } from '@codemirror/lang-yaml'
import { indentUnit } from '@codemirror/language'
import { CompletionContext } from '@codemirror/autocomplete'
import {
  EditorState,
  EditorSelection,
  StateEffect,
} from '@codemirror/state'

import { EditorCompletions } from '@/composables/useCodemirror/helper'

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
          creationTimestamp: {
            type: 'string',
            format: 'date-time',
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

describe('composables', () => {
  describe('useCodemirror', () => {
    describe('EditorCompletions', () => {
      let editorView
      let setEditorContentAndCursor
      let setEditorCursor
      let shootEditorCompletions
      let createMockCompletionContext

      beforeEach(() => {
        const element = document.createElement('div')
        const indentValue = '   ' // 3 spaces
        const state = EditorState.create({
          extensions: [
            cmYaml(),
            indentUnit.of(indentValue),
          ],
        })
        editorView = new EditorView({ parent: element, state })

        setEditorContentAndCursor = (content, line, ch) => {
          const state = editorView.state
          editorView.dispatch({
            changes: { from: 0, to: state.doc.length, insert: content },
          })
          setEditorCursor(line, ch)
        }

        setEditorCursor = (line, ch) => {
          const lineObj = editorView.state.doc.line(line)
          const pos = lineObj.from + ch

          editorView.dispatch({
            selection: EditorSelection.cursor(pos),
          })
        }

        shootEditorCompletions = new EditorCompletions(shootCompletions, {
          indentUnit: indentValue.length,
        })

        createMockCompletionContext = (view, pos = null) => {
          pos = pos !== null ? pos : view.state.selection.main.head
          const state = view.state

          return {
            state,
            pos,
            view,
            matchBefore (regex) {
              const line = state.doc.lineAt(pos)
              const start = Math.max(line.from, pos - 250); const slice = state.sliceDoc(start, pos)
              const match = regex.exec(slice)
              return match && { from: start + match.index, to: pos, text: match[0] }
            },
            word: CompletionContext.prototype.word,
          }
        }
      })

      describe('#yamlHint', () => {
        it('should return a simple hint', () => {
          setEditorContentAndCursor('', 1, 0)
          const completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toBeInstanceOf(Array)
          expect(completions).toHaveLength(1)
          const { displayLabel, label, property, detail, info } = completions[0]
          expect(displayLabel).toBe('spec:\n   ')
          expect(label).toBe('spec')
          expect(property).toBe('spec')
          expect(detail).toBe('Object')
          expect(info).toBe('spec description')
        })

        it('should return properties of an object', () => {
          setEditorContentAndCursor('spec:\n   ', 1, 0)
          let completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(0)

          setEditorCursor(2, 0)
          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)

          setEditorCursor(2, 3)
          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel: displayLabel0, detail: detail0 } = completions[0]
          expect(displayLabel0).toBe('apiVersion: ')
          expect(detail0).toBe('String')

          const { displayLabel: displayLabel2, detail: detail2 } = completions[2]
          expect(displayLabel2).toBe('metadata:\n      ')
          expect(detail2).toBe('Object')
        })

        it('should provide code completion for array start', () => {
          setEditorContentAndCursor('spec:\n  metadata:\n      ', 3, 0)
          let completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)

          setEditorCursor(3, 6)
          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel: displayLabel0, detail: detail0 } = completions[0]
          expect(displayLabel0).toBe('annotations:\n         ')
          expect(detail0).toBe('Object')

          const { displayLabel: displayLabel1, detail: detail1 } = completions[2]
          expect(displayLabel1).toBe('managedFields:\n         - ')
          expect(detail1).toBe('Array')
        })

        it('should render type with format', () => {
          setEditorContentAndCursor('spec:\n  metadata:\n      ', 3, 0)
          let completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)

          setEditorCursor(3, 6)
          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel, detail } = completions[1]
          expect(displayLabel).toBe('creationTimestamp: ')
          expect(detail).toBe('String (date-time)')
        })

        it('should provide code completion for first array item', () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - ', 4, 11)
          let completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options

          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel: displayLabel0, detail: detail0 } = completions[0]
          expect(displayLabel0).toBe('apiVersion: ')
          expect(detail0).toBe('String')

          const { displayLabel: displayLabel1, detail: detail1 } = completions[1]
          expect(displayLabel1).toBe('fieldsType: ')
          expect(detail1).toBe('String')
        })

        it('should provide code completion for second array item', () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - apiVersion: foo\n           ', 5, 11)
          const completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel, detail } = completions[1]
          expect(displayLabel).toBe('fieldsType: ')
          expect(detail).toBe('String')
        })

        it('should provide code completion if first item of an array is an object', () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - ma', 4, 12)
          const completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)
          const { displayLabel, detail } = completions[0]

          expect(displayLabel).toBe('managedObjects:\n              ')
          expect(detail).toBe('Object')
        })

        it('should provide code completion if context has object as first array item', () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      managedFields:\n         - managedObjects:\n              ', 5, 14)
          const completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)
          const { displayLabel, detail } = completions[0]
          expect(displayLabel).toBe('foo: ')
          expect(detail).toBe('String')
        })

        it('should filter completions according to typed text', () => {
          setEditorContentAndCursor('spec:\n   ', 2, 3)
          let completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          setEditorContentAndCursor('spec:\n   ki', 2, 5)
          completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(1)

          const { displayLabel, detail } = completions[0]
          expect(displayLabel).toBe('kind: ')
          expect(detail).toBe('String')
        })

        it('should traverse path correctly, do not add properties on same level to path', () => {
          setEditorContentAndCursor('spec:\n   metadata:\n      annotations:\n         foo: bar\n      managedFields:\n         - apiVersion: foo\n            ', 7, 12)
          const completions = shootEditorCompletions.yamlHint(createMockCompletionContext(editorView)).options
          expect(completions).toHaveLength(3)

          const { displayLabel, detail } = completions[1]
          expect(displayLabel).toBe('fieldsType: ')
          expect(detail).toBe('String')
        })

        describe('#editorTooltip', () => {
          it('should return a simple tooltip', () => {
            setEditorContentAndCursor('spec:', 1, 0)
            editorView.posAtCoords = () => {
              return 1 // { line: 1, ch: 1 }
            }
            const tooltip = shootEditorCompletions.editorTooltip({}, editorView)
            expect(tooltip.detail).toBe('Object')
          })

          it('should return tooltips for nested properties', () => {
            setEditorContentAndCursor('spec:\n  metadata:\n    managedFields:\n', 1, 0)
            editorView.posAtCoords = () => {
              return 6 // { line: 1, ch: 1 }
            }
            let tooltip = shootEditorCompletions.editorTooltip({}, editorView)
            expect(tooltip).toBeUndefined()

            editorView.posAtCoords = () => {
              return 8 // { line: 1, ch: 3 }
            }
            tooltip = shootEditorCompletions.editorTooltip({}, editorView)
            expect(tooltip.detail).toBe('Object')

            editorView.posAtCoords = () => {
              return 23 // { line: 2, ch: 5 }
            }
            tooltip = shootEditorCompletions.editorTooltip({}, editorView)
            expect(tooltip.detail).toBe('Array')
            expect(tooltip.info).toBe('Demo Array')

            editorView.posAtCoords = () => {
              return 36 // { line: 2, ch: 18 }
            }
            tooltip = shootEditorCompletions.editorTooltip({}, editorView)
            expect(tooltip).toBeUndefined()
          })
        })

        describe('#editorEnter', () => {
          let spy
          const setupSpy = () => {
            spy = vi.spyOn(editorView, 'dispatch')
          }

          afterEach(() => {
            spy.mockReset()
          })

          it('should return a simple line break', () => {
            setEditorContentAndCursor('', 1, 0)
            setupSpy()
            shootEditorCompletions.editorEnter(editorView)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0]).toEqual([{
              changes: { from: 0, to: 0, insert: '\n' },
              selection: { anchor: 1 },
              effects: expect.any(StateEffect),
            }])
            setEditorContentAndCursor('test', 1, 0)
            spy.mockReset()
            shootEditorCompletions.editorEnter(editorView)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0]).toEqual([{
              changes: { from: 0, to: 0, insert: '\n' },
              selection: { anchor: 1 },
              effects: expect.any(StateEffect),
            }])
          })

          it('should preserve indent after a regular line', () => {
            setEditorContentAndCursor('spec:\n  foo:bar', 2, 9)
            setupSpy()
            shootEditorCompletions.editorEnter(editorView)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0]).toEqual([{
              changes: { from: 15, to: 15, insert: '\n  ' },
              selection: { anchor: 18 },
              effects: expect.any(StateEffect),
            }])
          })

          it('should increase indent after an object or array', () => {
            setEditorContentAndCursor('spec:\n  foo:', 2, 6)
            setupSpy()
            shootEditorCompletions.editorEnter(editorView)
            const indent = editorView.state.facet(indentUnit).length
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0]).toEqual([{
              changes: { from: 12, to: 12, insert: `\n  ${repeat(' ', indent)}` },
              selection: { anchor: 18 },
              effects: expect.any(StateEffect),
            }])
          })

          it('should increase indent after first item of an array', () => {
            setEditorContentAndCursor('spec:\n  foo:\n    - foo:bar', 3, 13)
            setupSpy()
            shootEditorCompletions.editorEnter(editorView)
            expect(spy).toHaveBeenCalledTimes(1)
            expect(spy.mock.calls[0]).toEqual([{
              changes: { from: 26, to: 26, insert: '\n      ' },
              selection: { anchor: 33 },
              effects: expect.any(StateEffect),
            }])
          })
        })
      })

      describe('OpenAPI v3 support', () => {
        let shootCompletionsV3

        beforeEach(() => {
          shootCompletionsV3 = {
            spec: {
              allOf: [
                {
                  description: 'spec description',
                  type: 'object',
                  properties: {
                    apiVersion: {
                      type: 'string',
                    },
                    kind: {
                      type: 'string',
                    },
                    metadata: {
                      allOf: [
                        {
                          type: 'object',
                          properties: {
                            annotations: {
                              type: 'object',
                            },
                            creationTimestamp: {
                              type: 'string',
                              format: 'date-time',
                            },
                            managedFields: {
                              description: 'Demo Array',
                              type: 'array',
                              items: {
                                allOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      apiVersion: {
                                        type: 'string',
                                      },
                                      fieldsType: {
                                        type: 'string',
                                      },
                                      managedObjects: {
                                        allOf: [
                                          {
                                            type: 'object',
                                            properties: {
                                              foo: {
                                                type: 'string',
                                              },
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          }
        })
        describe('#resolveShemaArrays', () => {
          it('should recursively remove allOf, anyOf and oneOf array level', () => {
            const shootEditorCompletions = new EditorCompletions(shootCompletions, { cmView: editorView })
            const shootEditorCompletionsV3 = new EditorCompletions(shootCompletionsV3, { cmView: editorView })
            expect(shootEditorCompletionsV3.shootCompletions).toEqual(shootEditorCompletions.shootCompletions)
          })

          it('should handle multiple type options using oneOf discriminators', () => {
            // add multi-type value to openapi v3 spec (not supported by v2)
            shootCompletionsV3.spec.allOf[0].properties.foo = {
              oneOf: [
                {
                  type: 'number',
                  format: 'int32',
                },
                {
                  type: 'string',
                },
              ],
            }

            const shootEditorCompletionsV3 = new EditorCompletions(shootCompletionsV3, {
              cmView: editorView,
            })
            setEditorContentAndCursor('spec:\n   ', 2, 3)
            const completions = shootEditorCompletionsV3.yamlHint(createMockCompletionContext(editorView)).options
            expect(completions).toHaveLength(4)

            const { apply, detail } = completions[3]
            expect(apply).toBe('foo: ')
            expect(detail).toBe('Number (int32) | String')
          })
        })
      })
    })
  })
})
