import { NextResponse } from 'next/server'
import { getUserId, unauthorized } from '@/lib/auth'
import { getWorkspaceSummary } from '@/lib/quota'

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  return NextResponse.json(await getWorkspaceSummary(userId))
}
