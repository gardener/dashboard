//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

/* eslint-disable no-console, security/detect-non-literal-fs-filename */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Check if a program is installed
function isProgramInstalled (programName) {
  try {
    execSync(`${programName} -V`)
    return true
  } catch (error) {
    return false
  }
}

// Create directory if it doesn't exist
function createDirectoryIfNeeded (dirPath) {
  if (fs.existsSync(dirPath)) {
    return
  }
  console.log(`Creating directory: ${dirPath}`)
  fs.mkdirSync(dirPath, { recursive: true })
}

// Generate a single diagram
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
  // Check if graphviz is installed
  if (!isProgramInstalled('dot')) {
    console.error('Graphviz is not installed!')
    console.log('Please install it using: brew install graphviz')
    process.exit(1)
  }

  const diagramDir = path.join(__dirname, 'diagram')
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
  } catch (error) {
    console.error('Script failed! 😢')
    process.exit(1)
  }
}

main()
