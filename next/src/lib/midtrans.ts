import crypto from 'node:crypto'

/**
 * Midtrans Core API (QRIS) helpers. All secrets stay server-side; the client only ever receives an
 * order id and a QR image URL. Configure via env:
 *   MIDTRANS_SERVER_KEY     — required; the charge + webhook are disabled (503) without it
 *   MIDTRANS_IS_PRODUCTION  — 'true' hits api.midtrans.com, otherwise the sandbox
 *   PREMIUM_PRICE_IDR       — price of one premium period in whole rupiah (default 49000)
 *   PREMIUM_DAYS            — days of premium granted per payment (default 30)
 * ⚠️ PREMIUM_PRICE_IDR / PREMIUM_DAYS default to Rp 49.000 for 30 days to match the pricing page —
 * confirm both before launch; they define what a customer is charged.
 */
export interface MidtransConfig {
  serverKey: string
  baseUrl: string
}

export function midtransConfig(): MidtransConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey || !serverKey.trim()) return null
  const isProd = (process.env.MIDTRANS_IS_PRODUCTION ?? 'false').toLowerCase() === 'true'
  return { serverKey, baseUrl: isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com' }
}

const asPositiveInt = (v: string | undefined, fallback: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const PREMIUM_PRICE_IDR = asPositiveInt(process.env.PREMIUM_PRICE_IDR, 49000)
export const PREMIUM_DAYS = asPositiveInt(process.env.PREMIUM_DAYS, 30)

/**
 * Verify a notification's signature: sha512(order_id + status_code + gross_amount + server_key),
 * compared over the exact strings Midtrans sent. Timing-safe.
 */
export function verifyMidtransSignature(
  cfg: MidtransConfig,
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const expected = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + cfg.serverKey)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureKey ?? '')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export interface QrisCharge {
  qrUrl: string | null
  transactionId: string | null
  transactionStatus: string | null
  raw: unknown
}

// Create a QRIS charge. gross_amount must be a whole rupiah integer (IDR has no minor unit).
export async function createQrisCharge(cfg: MidtransConfig, orderId: string, amountIdr: number): Promise<QrisCharge> {
  const res = await fetch(`${cfg.baseUrl}/v2/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Basic auth: server key as the username, empty password.
      Authorization: 'Basic ' + Buffer.from(cfg.serverKey + ':').toString('base64'),
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: { order_id: orderId, gross_amount: amountIdr },
      qris: { acquirer: 'gopay' },
    }),
  })

  const raw: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      raw && typeof raw === 'object' && 'status_message' in raw
        ? String((raw as Record<string, unknown>).status_message)
        : `HTTP ${res.status}`
    throw new Error(`midtrans_charge_failed: ${msg}`)
  }

  const o = (raw ?? {}) as Record<string, unknown>
  const actions = Array.isArray(o.actions) ? (o.actions as Array<Record<string, unknown>>) : []
  const qr = actions.find((a) => a.name === 'generate-qr-code')
  const str = (v: unknown) => (typeof v === 'string' ? v : null)
  return {
    qrUrl: (qr && str(qr.url)) || str(o.qr_string),
    transactionId: str(o.transaction_id),
    transactionStatus: str(o.transaction_status),
    raw,
  }
}

/** Map a Midtrans transaction_status/fraud_status onto our payments.Status enum. */
export function mapMidtransStatus(transactionStatus: string, fraudStatus: string): string {
  // QRIS settles as 'settlement'. 'capture' (cards) only counts when fraud review accepted it —
  // 'challenge' is still under review, so it stays pending.
  if (transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')) return 'settled'
  if (transactionStatus === 'pending') return 'pending'
  if (transactionStatus === 'expire') return 'expired'
  if (transactionStatus === 'deny' || transactionStatus === 'cancel') return 'denied'
  if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') return 'refunded'
  return 'pending'
}
