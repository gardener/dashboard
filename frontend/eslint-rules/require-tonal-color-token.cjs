//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const tonalColors = new Map([
  ['primary', 'tonal-primary'],
  ['warning', 'tonal-warning'],
  ['error', 'tonal-error'],
  ['info', 'tonal-info'],
  ['success', 'tonal-success'],
])

function findAttribute (node, name) {
  return node.startTag.attributes.find(attribute => {
    if (!attribute.directive) {
      return attribute.key.name === name
    }

    return attribute.key.name.name === 'bind' &&
      attribute.key.argument?.name === name
  })
}

function getStaticAttributeValue (node, name) {
  const attribute = findAttribute(node, name)

  if (!attribute?.value) {
    return undefined
  }

  if (!attribute.directive) {
    return attribute.value.value
  }

  const expression = attribute.value.expression

  if (expression?.type === 'Literal') {
    return expression.value
  }

  return undefined
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require semantic tonal color tokens on tonal alerts and chips',
    },
    schema: [],
    messages: {
      useTonalColor: 'Use "{{expected}}" instead of "{{actual}}" for tonal {{component}}.',
    },
  },

  create (context) {
    return context.sourceCode.parserServices.defineTemplateBodyVisitor({
      VElement (node) {
        const component = node.rawName

        if (component !== 'v-alert' && component !== 'v-chip') {
          return
        }

        const hasUnqualifiedBind = node.startTag.attributes.some(a =>
          a.directive && a.key.name.name === 'bind' && !a.key.argument,
        )
        const variantAttribute = findAttribute(node, 'variant')
        const variant = getStaticAttributeValue(node, 'variant')
        const isTonal =
          variant === 'tonal' ||
          (component === 'v-chip' && !variantAttribute && !hasUnqualifiedBind)

        if (!isTonal) {
          return
        }

        const color = getStaticAttributeValue(node, 'color')
        const expected = tonalColors.get(color)

        if (!expected) {
          return
        }

        context.report({
          node,
          messageId: 'useTonalColor',
          data: {
            actual: color,
            expected,
            component,
          },
        })
      },
    })
  },
}
