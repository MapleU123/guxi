// @ts-nocheck
// In-memory code storage for official-account login — drop-in replacement for the
// PostgreSQL pairing.mjs, for projects WITHOUT a database (this repo has none).
//
// ⚠️ STATE IS PER INSTANCE. Deploy as a SINGLE instance (Cloud Run: max-instances=1).
//   For horizontal scaling, swap this file for the PostgreSQL version + schema.sql.
//
// Algorithm (HMAC code derivation, rate-limit buckets, 5s idempotency by MsgId) is
// kept identical to the production skill so login codes verified here match the
// webhook and the front-end contract.
import { createHmac, randomBytes, randomInt } from 'node:crypto'

export const CODE_TTL_SECONDS = 300
export const PAIR_TTL_SECONDS = 600
export const PAIR_MESSAGE = /^(?:登录\s*)?(\d{6})$/

const hmac = (secret, value) => createHmac('sha256', secret).update(value).digest('hex')
const validSecret = secret => typeof secret === 'string' && /^[A-Za-z0-9_-]{43}$/.test(secret)

// codeHash (unique) -> row
interface CodeRow { appId: string; messageId: string; openid: string; expiresAt: number; consumedAt: number | null }
const codeRows = new Map<string, CodeRow>()
// bucket -> { windowStart(ms), attempts }
const rateLimits = new Map<string, { windowStart: number; attempts: number }>()

function cleanup() {
  const now = Date.now()
  for (const [hash, row] of codeRows) {
    if (row.expiresAt <= now) codeRows.delete(hash)
  }
  for (const [bucket, rl] of rateLimits) {
    if (rl.windowStart < now - 300_000) rateLimits.delete(bucket)
  }
}
// Opportunistic cleanup + a periodic sweep (unref so it never blocks shutdown).
setInterval(cleanup, 60_000).unref?.()
cleanup()

function codeFor(config: any, openid: string, msgId: string, index: number) {
  const digest = createHmac('sha256', config.codeSecret).update(JSON.stringify([config.namespace, openid, msgId, index])).digest()
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, '0')
}
const loginHash = (config: any, code: string) => hmac(config.codeSecret, `login-code:${code}`)
const pairNs = (config: any) => `${config.namespace}:pair`
const pairCodeHash = (config: any, code: string) => hmac(config.codeSecret, `pair-code:${code}`)
const pairRequestHash = (config: any, secret: string) => hmac(config.codeSecret, `pair-request:${secret}`)

export function rateLimit(bucket: string, max: number, seconds = 300) {
  const now = Date.now()
  const rl = rateLimits.get(bucket)
  if (!rl || rl.windowStart < now - seconds * 1000) {
    rateLimits.set(bucket, { windowStart: now, attempts: 1 })
    return true
  }
  rl.attempts += 1
  return rl.attempts <= max
}

// ---------- login code (keyword → code / one-tap link) ----------

/**
 * Called from the webhook. Deterministic per MsgId so WeChat's retries of a slow
 * reply get the same code; consumed or expired codes are never revived.
 */
export function issueLoginCode(config: any, message: any) {
  cleanup()
  const ns = config.namespace
  // Replay: same MsgId → same code.
  for (const [hash, row] of codeRows) {
    if (row.appId === ns && row.messageId === message.MsgId) {
      if (row.consumedAt || row.expiresAt <= Date.now()) return null
      for (let i = 0; i < 32; i++) {
        const code = codeFor(config, message.FromUserName, message.MsgId, i)
        if (loginHash(config, code) === hash) return code
      }
      return null
    }
  }
  if (!rateLimit(`issue:${hmac(config.codeSecret, ns + ':' + message.FromUserName)}`, 5)) return null
  // A new code retires this sender's older unused codes.
  for (const [hash, row] of codeRows) {
    if (row.appId === ns && row.openid === message.FromUserName && !row.consumedAt) codeRows.delete(hash)
  }
  for (let i = 0; i < 32; i++) {
    const code = codeFor(config, message.FromUserName, message.MsgId, i)
    const hash = loginHash(config, code)
    if (!codeRows.has(hash)) {
      codeRows.set(hash, {
        appId: ns, messageId: message.MsgId, openid: message.FromUserName,
        expiresAt: Date.now() + CODE_TTL_SECONDS * 1000, consumedAt: null,
      })
      return code
    }
  }
  return null
}

/** Called by the site when the visitor types the code or opens the one-tap link. Returns the OpenID once. */
export function consumeLoginCode(config: any, code: string, browserKey?: string) {
  cleanup()
  if (!/^\d{6}$/.test(code || '')) return null
  if (!rateLimit(`verify:${config.namespace}:${hmac(config.codeSecret, browserKey || 'anon')}`, 5)) return null
  const hash = loginHash(config, code)
  const row = codeRows.get(hash)
  if (row && !row.consumedAt && row.expiresAt > Date.now()) {
    row.consumedAt = Date.now()
    return row.openid
  }
  return null
}

// ---------- pairing (page shows code → visitor sends it → page signs in) ----------

/**
 * Called by the site. Put `request` in an HttpOnly cookie scoped to the pairing
 * endpoints and show `code` on the page. `browserKey` is an account id or a
 * first-party browser cookie, never the IP (behind a CDN it is the edge's).
 */
export function createLoginPair(config: any, browserKey?: string) {
  cleanup()
  if (browserKey && !rateLimit(`pair-create:${pairNs(config)}:${hmac(config.codeSecret, browserKey)}`, 10)) return null
  if (!rateLimit(`pair-create-global:${pairNs(config)}`, 3000)) return null
  const request = randomBytes(32).toString('base64url')
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(randomInt(1_000_000)).padStart(6, '0')
    const hash = pairCodeHash(config, code)
    const reqHash = pairRequestHash(config, request)
    if (!codeRows.has(hash)) {
      codeRows.set(hash, {
        appId: pairNs(config), messageId: reqHash, openid: 'pending',
        expiresAt: Date.now() + PAIR_TTL_SECONDS * 1000, consumedAt: null,
      })
      return { code, request, expiresIn: PAIR_TTL_SECONDS }
    }
  }
  return null
}

/** Called from the webhook when a text matches PAIR_MESSAGE. */
export function pairLogin(config: any, code: string, message: any) {
  cleanup()
  if (!/^\d{6}$/.test(code)) return false
  if (!rateLimit(`pair-send:${pairNs(config)}:${hmac(config.codeSecret, message.FromUserName)}`, 10)) return false
  const hash = pairCodeHash(config, code)
  const row = codeRows.get(hash)
  if (!row || row.appId !== pairNs(config)) return false
  if (row.openid === 'pending' && !row.consumedAt && row.expiresAt > Date.now()) {
    row.openid = message.FromUserName
    return true
  }
  // WeChat retries a slow webhook with the same message; answer it the same way.
  if (row.openid === message.FromUserName && row.expiresAt > Date.now()) return true
  return false
}

/**
 * Polled by the page (every 2 s visible, 6 s hidden). Claims once.
 */
export function claimLoginPair(config: any, request: string) {
  cleanup()
  if (!validSecret(request)) return { status: 'expired' }
  const reqHash = pairRequestHash(config, request)
  let row: CodeRow | undefined
  for (const [h, r] of codeRows) {
    if (r.appId === pairNs(config) && r.messageId === reqHash) { row = r; break }
  }
  if (!row) return { status: 'expired' }
  const now = Date.now()
  if (row.openid !== 'pending' && !row.consumedAt && row.expiresAt > now) {
    row.consumedAt = now
    return { status: 'paired', openid: row.openid }
  }
  // A lost response may be retried briefly; it still needs the 256-bit browser secret.
  if (row.openid !== 'pending' && row.consumedAt && row.consumedAt >= now - 60_000) {
    return { status: 'paired', openid: row.openid }
  }
  if (row.openid === 'pending' && !row.consumedAt && row.expiresAt > now) {
    return { status: 'pending', expiresIn: Math.max(1, Math.floor((row.expiresAt - now) / 1000)) }
  }
  return { status: 'expired' }
}
