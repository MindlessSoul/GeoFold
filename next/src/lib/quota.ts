import sql from './db'

// Port of the .NET PlanQuotas + QuotaService. A null limit means unlimited on that dimension.
export interface QuotaLimits {
  maxProjects: number | null
  maxSurveysPerMonth: number | null
  storageQuotaMb: number | null
}

const FREE: QuotaLimits = { maxProjects: 3, maxSurveysPerMonth: 100, storageQuotaMb: 500 }
const PREMIUM: QuotaLimits = { maxProjects: null, maxSurveysPerMonth: null, storageQuotaMb: 51_200 }

interface SubRow {
  Plan: string
  Status: string
  CurrentPeriodEndUtc: Date | null
  MaxProjects: number | null
  MaxSurveysPerMonth: number | null
  StorageQuotaMb: number | null
}

const isActive = (status: string) => status === 'active' || status === 'trialing'

export async function getSubscription(userId: string): Promise<SubRow | undefined> {
  const rows = await sql<SubRow[]>`
    SELECT "Plan", "Status", "CurrentPeriodEndUtc", "MaxProjects", "MaxSurveysPerMonth", "StorageQuotaMb"
    FROM subscriptions WHERE "UserId" = ${userId}`
  return rows[0]
}

// Both the plan and any per-user override require a subscription in good standing.
export function resolveLimits(sub: SubRow | undefined): QuotaLimits {
  if (!sub || !isActive(sub.Status)) return FREE
  const base = sub.Plan === 'premium' ? PREMIUM : FREE
  return {
    maxProjects: sub.MaxProjects ?? base.maxProjects,
    maxSurveysPerMonth: sub.MaxSurveysPerMonth ?? base.maxSurveysPerMonth,
    storageQuotaMb: sub.StorageQuotaMb ?? base.storageQuotaMb,
  }
}

export async function getLimits(userId: string): Promise<QuotaLimits> {
  return resolveLimits(await getSubscription(userId))
}

function monthStartUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

async function countProjects(userId: string): Promise<number> {
  const [r] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM projects WHERE "UserId" = ${userId} AND "ArchivedAtUtc" IS NULL`
  return r.c
}

async function countSurveysThisMonth(userId: string): Promise<number> {
  const [r] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM surveys WHERE "UserId" = ${userId} AND "SyncedAtUtc" >= ${monthStartUtc()}`
  return r.c
}

async function sumStorageBytes(userId: string): Promise<number> {
  const [r] = await sql<{ b: string }[]>`
    SELECT COALESCE(SUM(sp."SizeBytes"), 0)::bigint AS b
    FROM survey_photos sp JOIN surveys s ON s."Id" = sp."SurveyId"
    WHERE s."UserId" = ${userId}`
  return Number(r.b)
}

export async function getUsage(userId: string) {
  return {
    projects: await countProjects(userId),
    surveysThisMonth: await countSurveysThisMonth(userId),
    storageBytes: await sumStorageBytes(userId),
  }
}

export interface QuotaCheck {
  allowed: boolean
  message?: string
}

export async function checkProjectCreation(userId: string): Promise<QuotaCheck> {
  const { maxProjects } = await getLimits(userId)
  if (maxProjects == null) return { allowed: true }
  const count = await countProjects(userId)
  return count >= maxProjects
    ? { allowed: false, message: `Project limit reached (${count}/${maxProjects}). Upgrade your plan to create more.` }
    : { allowed: true }
}

export async function checkSurveyCreation(userId: string): Promise<QuotaCheck> {
  const { maxSurveysPerMonth } = await getLimits(userId)
  if (maxSurveysPerMonth == null) return { allowed: true }
  const count = await countSurveysThisMonth(userId)
  return count >= maxSurveysPerMonth
    ? { allowed: false, message: `Monthly survey limit reached (${count}/${maxSurveysPerMonth}). Upgrade your plan.` }
    : { allowed: true }
}

export async function checkPhotoUpload(userId: string, newBytes: number): Promise<QuotaCheck> {
  const { storageQuotaMb } = await getLimits(userId)
  if (storageQuotaMb == null) return { allowed: true }
  const quotaBytes = storageQuotaMb * 1024 * 1024
  const used = await sumStorageBytes(userId)
  return used + newBytes > quotaBytes
    ? { allowed: false, message: `Storage quota exceeded (${(used / 1048576).toFixed(1)}/${storageQuotaMb} MB used). Upgrade your plan.` }
    : { allowed: true }
}
