//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

/* eslint-disable no-console, security/detect-non-literal-fs-filename */

import { execSync, spawnSync } from 'child_process'
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
  fs.mkdirSync(dirPath, { recursive: true })
}

function generateDiagram (number, command) {
  try {
    console.log(`Generating diagram ${number}...`)
    execSync(command, { stdio: 'inherit' })
    console.log(`Diagram ${number} generated successfully!`)
  } catch (error) {
    console.error(`Failed to generate diagram ${number}`)
    throw error
  }
}

function main () {
  if (!isProgramInstalled('dot')) {
    console.error('Graphviz is not installed!')
    console.log('Please install it using: brew install graphviz')
    process.exit(1)
  }

  const diagramDir = path.join(import.meta.dirname, 'diagram')
  createDirectoryIfNeeded(diagramDir)

  const commands = [
    `yarn depcruise lib --include-only '^lib' --highlight '\\.mjs$' --output-type archi | dot -T svg -Grankdir=TD | tee ${diagramDir}/t1.svg | yarn depcruise-wrap-stream-in-html > ${diagramDir}/t1.html`,
    `yarn depcruise lib --include-only '^lib' --highlight '\\.mjs$' --output-type dot | dot -T svg -Grankdir=TD | tee ${diagramDir}/t2.svg | yarn depcruise-wrap-stream-in-html > ${diagramDir}/t2.html`,
  ]

  try {
    commands.forEach((command, index) => {
      generateDiagram(index + 1, command)
    })

    console.log('All diagrams generated successfully! 🎉')
    console.log(`All diagrams are stored under: file://${diagramDir}`)
  } catch (error) {
    console.error(`Script failed! 😢
Please check the error message below for more information: \n${error.message}`)
    process.exit(1)
  }
}

main()
