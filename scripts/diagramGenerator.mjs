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

//Add path here to enable diagram generation for more targets
// For automatic execution of the related workflow, on a push event to the new target, add the path to .github/workflows/dependency-diagrams.yml under on.push.paths.
// Also, add a short script to the package.json.
const allowedTargets = [
  'backend',
  'packages',
]
const all = 'all'

function isProgramInstalled (programName) {
  const command = process.platform === 'win32' ? 'where' : 'which'
  return spawnSync(command, [programName], {
    cwd: process.cwd(),
  }).status === 0
}

function createDirectoryIfNeeded (dirPath) {
  if (fs.existsSync(dirPath)) {
    return
  }
  console.log(`Creating directory: ${dirPath}`)
  fs.mkdirSync(dirPath, { recursive: true })
}

function generateDiagram (command) {
  console.log(`Generating diagram ${command.name}...`)
  const commandAsString = `${command.program} ${command.args.join(' ')}`
  console.info(`Using the following bash command: ${commandAsString}`)

  const result = spawnSync(
    command.program,
    command.args,
    { encoding: 'utf8' }
  )

  if (result.error) {
    throw new Error(`Error executing command ${command.program}: ${result.error.message}`)
  }

  if (result.status !== 0) {
    throw new Error(`
    Command exited with status ${result.status}.
    Stderr: ${result.stderr}
    Stdout: ${result.stdout}
    `)
  }

  console.log(`Diagram ${command.name} generated`)
  return result.stdout
}

function parseTargetFromArgs () {
  const targetKey = '--target'

  const helpMsg = `
Usage: node script.js [options]
Options:
  --help                Show this help message
Mandatory Options:
  --target <target>     one of: ${allowedTargets.join(', ')}
`
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(helpMsg)
    process.exit(0)
  }

  if (args.includes('--help')) {
    console.log(helpMsg)
    process.exit(0)
  }

  if (!args.includes(targetKey)){
    console.error(`Mandatory argument ${targetKey} is missing.`)
    process.exit(1)
  }

  const target = args[args.indexOf(targetKey) + 1]
  if(target === all) {
    return allowedTargets
  }

  if (!allowedTargets.includes(target)) {
    console.error(`Invalid target value ${target}. Allowed values are: ${allowedTargets.join(', ')}`)
    process.exit(1)
  }

  return [target]
}

function commandGenerator (targets) {
  const levels = ['highlevel', 'lowlevel']
  const commands = []

  for (const target of targets) {
    for (const level of levels) {
      const args = [
        'depcruise',
        target,
        '--include-only',
        `^${target}`,
        '--output-type',
        'x-dot-webpage',
      ]

      if (level === 'highlevel') {
        args.push('--collapse', `${target}/[^/]+/`)
      }

      commands.push({
        name: `${target}-${level}-dependency-diagram`,
        program: 'yarn',
        args
      })
    }
  }

  return commands
}

function main () {
  const targets = parseTargetFromArgs()

  const commands = commandGenerator(targets)

  if (!isProgramInstalled('dot')) {
    console.error('Graphviz is not installed!')
    console.log('Please install Graphviz, on MacOs you could use: brew install graphviz')
    process.exit(1)
  }

  const diagramDir = path.join(process.cwd(), 'diagram')
  createDirectoryIfNeeded(diagramDir)

  try {
    for (const command of commands) {
      const diagram = generateDiagram(command)
      fs.writeFileSync(path.join(diagramDir, command.name + '.html'), diagram)
    }
    console.log('All diagrams generated successfully! 🎉')
    console.log(`They are stored under: file://${diagramDir}`)
  } catch (error) {
    console.error(`Script failed! 😥 \nError: ${error.message}`)
    process.exit(1)
  }
}

main()
