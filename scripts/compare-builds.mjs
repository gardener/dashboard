#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packagesDir = path.resolve(__dirname, '../packages')
const tempRoot = '/tmp/dashboard-build-compare'

if (!fs.existsSync(tempRoot)) {
  fs.mkdirSync(tempRoot, { recursive: true })
}

const packages = fs.readdirSync(packagesDir).filter(pkg => {
  const pkgPath = path.join(packagesDir, pkg, 'package.json')
  return fs.existsSync(pkgPath)
})

const statusMap = Object.fromEntries(packages.map(pkg => [pkg, { status: 'pending' }]))

const noProgress = process.argv.includes('--no-progress')

function renderProgress(once = false) {
  if (!once) {
    if (noProgress) return
    process.stdout.write('\x1Bc') // clear screen
  }
  console.log('📦 Build & Compare Progress\n')
  for (const pkg of packages) {
    const { status } = statusMap[pkg]
    let icon = '⏳', msg = 'In progress'
    if (status === 'passed') { icon = '✅'; msg = 'Passed' }
    if (status === 'failed') { icon = '❌'; msg = 'Failed' }
    if (status === 'skipped') { icon = '⚠️'; msg = 'Skipped' }
    process.stdout.write(`  ${icon}  ${pkg.padEnd(25)}  [${msg} ]\n`)
  }
}

renderProgress()

function runBuildAndDiff(pkg) {
  return new Promise(resolve => {
    const pkgPath = path.join(packagesDir, pkg)
    const tempOut = path.join(tempRoot, pkg)
    if (fs.existsSync(tempOut)) {
      fs.rmSync(tempOut, { recursive: true, force: true })
    }
    statusMap[pkg].status = 'in-progress'
    renderProgress()
    // Build
    const build = spawn('yarn', ['build', `--output-dir=${tempOut}`], {
      cwd: pkgPath,
      shell: true,
      stdio: noProgress ? 'ignore' : ['ignore', 'ignore', 'ignore']
    })
    build.on('close', code => {
      if (code !== 0) {
        statusMap[pkg].status = 'failed'
        statusMap[pkg].error = 'Build failed'
        renderProgress()
        return resolve({ pkg, status: 'build-failed' })
      }
      const distPath = path.join(pkgPath, 'dist')
      if (!fs.existsSync(distPath)) {
        statusMap[pkg].status = 'skipped'
        renderProgress()
        return resolve({ pkg, status: 'no-dist' })
      }
      // Diff
      const diff = spawn('git', ['--no-pager', 'diff', '--no-index', distPath, tempOut], {
        encoding: 'utf-8',
        shell: true,
        stdio: noProgress ? 'ignore' : ['ignore', 'ignore', 'ignore']
      })
      diff.on('close', diffCode => {
        if (diffCode === 1) {
          statusMap[pkg].status = 'failed'
          statusMap[pkg].error = 'Diff failed'
          renderProgress()
          return resolve({ pkg, status: 'diff' })
        } else if (diffCode > 1) {
          statusMap[pkg].status = 'failed'
          statusMap[pkg].error = 'git diff error'
          renderProgress()
          return resolve({ pkg, status: 'git-error' })
        }
        statusMap[pkg].status = 'passed'
        renderProgress()
        resolve({ pkg, status: 'ok' })
      })
    })
  })
}

const results = await Promise.all(packages.map(runBuildAndDiff))

const changed = results.filter(r => r.status === 'diff')

if (changed.length > 0) {
  const divider = '\n' + '='.repeat(60) + '\n'
  console.error(divider)
  console.error('❌  Build output differs from dist in the following workspaces:')
  changed.forEach(({ pkg }) => {
    console.error(`   • ${pkg}`)
  })
  console.error(divider)
  console.error('🔍  To view the differences for a workspace, run:')
  changed.forEach(({ pkg }) => {
    console.error(`   • git --no-pager diff --no-index packages/${pkg}/dist /tmp/dashboard-build-compare/${pkg}`)
  })
  console.error(divider)
  console.error('🔧  To fix, rebuild the workspace with:')
  changed.forEach(({ pkg }) => {
    console.error(`   • cd packages/${pkg} && yarn build`)
  })
  console.error(divider)
  console.error('💡  Please ensure your build output is reproducible and up-to-date.')
  process.exit(1)
}

renderProgress(true)
console.log('\n✅  Comparison complete. No differences found.')
