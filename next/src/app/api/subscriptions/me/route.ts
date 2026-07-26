import { NextResponse } from 'next/server'
import { getUserId, unauthorized } from '@/lib/auth'
import { getSubscription, resolveLimits, getUsage } from '@/lib/quota'

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  const sub = await getSubscription(userId)
  const limits = resolveLimits(sub)
  const usage = await getUsage(userId)
  const active = sub ? sub.Status === 'active' || sub.Status === 'trialing' : false

  return NextResponse.json({
    plan: sub?.Plan ?? 'free',
    status: sub?.Status ?? 'canceled',
    isActive: active,
    currentPeriodEndUtc: sub?.CurrentPeriodEndUtc ?? null,
    limits,
    usage: {
      projects: usage.projects,
      surveysThisMonth: usage.surveysThisMonth,
      storageMb: Math.round((usage.storageBytes / 1048576) * 100) / 100,
    },
  })
}
