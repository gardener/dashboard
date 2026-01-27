const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const HASH_FILE = path.join(__dirname, '.packages-hash')

function getPackagesHash () {
  // Use git to get a hash of the packages directory state
  try {
    return execSync('git ls-files -s ../packages | git hash-object --stdin', {
      cwd: __dirname,
      encoding: 'utf-8',
    }).trim()
  } catch {
    // Fallback: hash source files using md5
    return execSync('find ../packages -type f \\( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" -o -name "package.json" \\) | sort | xargs cat | md5', {
      cwd: __dirname,
      encoding: 'utf-8',
    }).trim()
  }
}

function shouldRebuildPackages () {
  const currentHash = getPackagesHash()

  if (fs.existsSync(HASH_FILE)) {
    const cachedHash = fs.readFileSync(HASH_FILE, 'utf-8').trim()
    if (cachedHash === currentHash) {
      return false
    }
  }

  fs.writeFileSync(HASH_FILE, currentHash)
  return true
}

module.exports = async function globalSetup () {
  if (shouldRebuildPackages()) {
    // eslint-disable-next-line no-console
    console.log('Packages changed, rebuilding...')
    execSync('yarn build-packages-for-test-target', { stdio: 'inherit' })
  } else {
    // eslint-disable-next-line no-console
    console.log('Packages unchanged, skipping build')
  }
  execSync('yarn build-test-target', { stdio: 'inherit' })
}
