//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const { SEMANTIC_COLOR_NAMES, getTonalColorName } = require('../src/utils/themeColors.js')

const semanticColorNames = new Set(SEMANTIC_COLOR_NAMES)

const TONAL_COMPONENTS = new Set(['v-alert', 'v-chip'])
const CHIP_COMPONENTS = new Set(['v-chip'])

function normalizeComponentName (name) {
  return name.replace(/([A-Z])/g, (_, char, index) => (index ? '-' : '') + char.toLowerCase())
}

function getStaticAttributeValue (node, name) {
  const attribute = node.startTag.attributes.find(attr => {
    if (!attr.directive) {
      return attr.key.name === name
    }

    return attr.key.name.name === 'bind' && attr.key.argument?.name === name
  })

  if (!attribute?.value) {
    return undefined
  }

  if (!attribute.directive) {
    return attribute.value.value
  }

  const expression = attribute.value.expression

  return expression?.type === 'Literal' ? expression.value : undefined
}

function resolveProps (node) {
  const attributes = node.startTag.attributes
  const hasUnqualifiedBind = attributes.some(
    attr => attr.directive && attr.key.name.name === 'bind' && !attr.key.argument,
  )
  const hasVariantAttr = hasUnqualifiedBind || attributes.some(attr => {
    if (!attr.directive) {
      return attr.key.name === 'variant'
    }

    return attr.key.name.name === 'bind' && attr.key.argument?.name === 'variant'
  })
  const variant = hasUnqualifiedBind ? undefined : getStaticAttributeValue(node, 'variant')
  const color = getStaticAttributeValue(node, 'color')

  return { variant, hasVariantAttr, color }
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
        const component = normalizeComponentName(node.rawName)

        if (!TONAL_COMPONENTS.has(component)) {
          return
        }

        const { variant, hasVariantAttr, color } = resolveProps(node)
        const isTonal = variant === 'tonal' || (CHIP_COMPONENTS.has(component) && !hasVariantAttr)

        if (!isTonal || !semanticColorNames.has(color)) {
          return
        }

        context.report({
          node,
          messageId: 'useTonalColor',
          data: {
            actual: color,
            expected: getTonalColorName(color),
            component,
          },
        })
      },
    })
  },
}
