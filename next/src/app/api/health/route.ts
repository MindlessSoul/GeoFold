// Public liveness probe (pre-warm target + Render health check), mirrors the .NET /health.
export async function GET() {
  return Response.json({ status: 'ok' })
}
