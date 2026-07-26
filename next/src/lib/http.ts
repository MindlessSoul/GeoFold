import { NextResponse } from 'next/server'

// 403 with a machine-readable code so the client can tell a plan-limit rejection from an ordinary
// authorization failure and prompt an upgrade. Mirrors the .NET QuotaResults shape.
export function quotaExceeded(message?: string) {
  return NextResponse.json({ error: 'quota_exceeded', message }, { status: 403 })
}
