//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export const dark = {
  foreground: '#f2f2f2',
  background: '#000000',
  cursor: '#4d4d4d',

  selectionForeground: '#e2e2e2',
  selectionBackground: '#404040',
  selectionInactiveBackground: '#202020',

  black: '#000000',
  brightBlack: '#666666',

  red: '#990000',
  brightRed: '#e50000',

  green: '#00a600',
  brightGreen: '#00d900',

  yellow: '#999900',
  brightYellow: '#e5e500',

  blue: '#3465a4',
  brightBlue: '#729fcf',

  magenta: '#b200b2',
  brightMagenta: '#e500e5',

  cyan: '#00a6b2',
  brightCyan: '#00e5e5',

  white: '#bfbfbf',
  brightWhite: '#e5e5e5',
}

export const light = {
  foreground: '#383a42',
  background: '#fafafa',
  cursor: '#bfceff',

  selectionForeground: '#282a2f',
  selectionBackground: '#dadada',
  selectionInactiveBackground: '#eaeaea',

  black: '#383a42',
  brightBlack: '#4f525e',

  red: '#e45649',
  brightRed: '#e06c75',

  green: '#50a14f',
  brightGreen: '#98c379',

  yellow: '#c18401',
  brightYellow: '#e5c07b',

  blue: '#0184bc',
  brightBlue: '#61afef',

  magenta: '#a626a4',
  brightMagenta: '#c678dd',

  cyan: '#0997b3',
  brightCyan: '#56b6c2',

  white: '#fafafa',
  brightWhite: '#ffffff',
}

const dimmedBackground = {
  dark: '#333333',
  light: '#e0e0e0',
}

export function getTerminalTheme (isDark, hasFocus = true) {
  const theme = { ...(isDark ? dark : light) }
  if (!hasFocus) {
    theme.background = isDark ? dimmedBackground.dark : dimmedBackground.light
  }
  return theme
}
