#!/usr/bin/env node
/**
 * API key admin CLI. Run on the VPS as the deploy user:
 *
 *   node scripts/manage-keys.cjs add "Acme Corp"
 *   node scripts/manage-keys.cjs list
 *   node scripts/manage-keys.cjs revoke "Acme Corp"
 *   node scripts/manage-keys.cjs verify kp_live_<paste-key>
 *
 * Requires API_KEY_SALT in the env (same one the systemd service uses ~
 * source /etc/default/kitsunepaint or similar before running).
 *
 * The plaintext key is shown ONCE on `add` and never again. If a customer
 * loses theirs, revoke it and issue a new one.
 */

const auth = require('../auth.cjs')

function usage() {
  console.error('Usage:')
  console.error('  manage-keys.cjs add <label>           Generate + store new key')
  console.error('  manage-keys.cjs list                  Show all key labels (no plaintext)')
  console.error('  manage-keys.cjs revoke <label>        Delete a key by label')
  console.error('  manage-keys.cjs verify <plaintext>    Test if a given key is valid')
  process.exit(1)
}

function cmdAdd(label) {
  if (!label) usage()

  const keys = auth.loadKeys()
  if (keys.some((k) => k.label === label)) {
    console.error(`Error: a key labeled "${label}" already exists. Revoke it first or pick a different label.`)
    process.exit(1)
  }

  const plaintext = auth.generateKey()
  const hash = auth.hashKey(plaintext)
  keys.push({
    hash,
    label,
    createdAt: new Date().toISOString(),
  })
  auth.saveKeys(keys)

  console.log('')
  console.log('=== New API key generated ===')
  console.log('')
  console.log(`Label:  ${label}`)
  console.log(`Key:    ${plaintext}`)
  console.log('')
  console.log('Email this key to the customer. It will NEVER be shown again.')
  console.log('Customer sends it as the X-API-Key header on requests.')
  console.log('')
}

function cmdList() {
  const keys = auth.loadKeys()
  if (keys.length === 0) {
    console.log('(no keys stored yet)')
    return
  }
  console.log('Label                            Created                  Last used')
  console.log('-------------------------------- ------------------------ ------------------------')
  for (const k of keys) {
    const label = k.label.padEnd(32).slice(0, 32)
    const created = (k.createdAt || '').slice(0, 24).padEnd(24)
    const lastUsed = k.lastUsed ? k.lastUsed.slice(0, 24) : '(never)'
    console.log(`${label} ${created} ${lastUsed}`)
  }
}

function cmdRevoke(label) {
  if (!label) usage()

  const keys = auth.loadKeys()
  const before = keys.length
  const remaining = keys.filter((k) => k.label !== label)
  if (remaining.length === before) {
    console.error(`No key found with label "${label}". Try \`list\` first.`)
    process.exit(1)
  }
  auth.saveKeys(remaining)
  console.log(`Revoked: ${label}`)
}

function cmdVerify(plaintext) {
  if (!plaintext) usage()
  const match = auth.verifyKey(plaintext)
  if (match) {
    console.log(`✓ Valid ~ matches key "${match.label}" (created ${match.createdAt})`)
  } else {
    console.log('✗ No matching key.')
    process.exit(1)
  }
}

const [, , cmd, ...args] = process.argv
switch (cmd) {
  case 'add':    cmdAdd(args[0]); break
  case 'list':   cmdList(); break
  case 'revoke': cmdRevoke(args[0]); break
  case 'verify': cmdVerify(args[0]); break
  default:       usage()
}
