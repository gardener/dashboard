//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Disabled here in file scope since this is a cli script for dev-scenarios
/* eslint-disable no-console, security/detect-non-literal-fs-filename */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function isProgramInstalled (programName) {
  const command = process.platform === 'win32' ? 'where' : 'which'
  return spawnSync(command, [programName]).status === 0
}

function createDirectoryIfNeeded (dirPath) {
  if (fs.existsSync(dirPath)) {
    return
  }
  console.log(`Creating directory: ${dirPath}`)
  fs.mkdirSync(dirPath)
}

function generateDiagram (number, command) {
  console.log(`Generating diagram ${number}...`)
  const commandAsString = `${command.program} ${command.args.join(' ')}`
  console.info(`Using the following bash command: ${commandAsString}`)

  const result = spawnSync(command.program, command.args, { encoding: 'utf8' })

  if (result.error) {
    throw new Error(`Error executing command ${command.program}: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`Command exited with status ${result.status}. Stderr: ${result.stderr}`)
  }

  console.log(`Diagram ${number} generated`)
  return result.stdout
}

function main () {
  if (!isProgramInstalled('dot')) {
    console.error('Graphviz is not installed!')
    console.log('Please install Graphviz, on MacOs you could use: brew install graphviz')
    process.exit(1)
  }

  const diagramDir = path.join(import.meta.dirname, 'diagram')
  createDirectoryIfNeeded(diagramDir)

  const commands = [
    {
      name: 'highlevel-dependency-diagram',
      program: 'yarn',
      args: ['depcruise', 'lib', '--collapse', 'lib/[^/]+/', '--highlight', '\\.mjs$', '--include-only', '^lib', '--output-type', 'x-dot-webpage'],
    },
    {
      name: 'lowlevel-dependency-diagram',
      program: 'yarn',
      args: ['depcruise', 'lib', '--highlight', '\\.mjs$', '--include-only', '^lib', '--output-type', 'x-dot-webpage'],
    },
  ]

  try {
    for (const [i, command] of commands.entries()) {
      const diagram = generateDiagram(i + 1, command)
      fs.writeFileSync(`${diagramDir}/${command.name}.html`, diagram)
    }
    console.log('All diagrams generated successfully! 🎉')
    console.log(`And are stored under: file://${diagramDir}`)
  } catch (error) {
    console.error(`Script failed! 😥 \nError: ${error.message}`)
    process.exit(1)
  }
}

main()
