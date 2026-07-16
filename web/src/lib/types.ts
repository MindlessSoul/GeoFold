// Mirrors the backend DTOs (camelCased by ASP.NET). Keep in sync with docs/frontend-map-api.md.

export interface ProjectResponse {
  id: string
  name: string
  description: string | null
  formSchema: string
  createdAtUtc: string
  archivedAtUtc: string | null
  surveyCount: number
}

export interface QuotaLimits {
  maxProjects: number | null
  maxSurveysPerMonth: number | null
  storageQuotaMb: number | null
}

export interface SubscriptionMe {
  plan: string
  status: string
  isActive: boolean
  currentPeriodEndUtc: string | null
  limits: QuotaLimits
  usage: { projects: number; surveysThisMonth: number; storageMb: number }
}

export interface FormField {
  key: string
  label?: string
  type: string
  required?: boolean
}

export interface SurveyProperties {
  id: string
  projectId: string
  status: string
  capturedAtUtc: string
  syncedAtUtc: string
  accuracyMeters: number | null
  photoCount: number
  detailsJson: string | null
}

export interface SurveyFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: SurveyProperties
  }>
}
