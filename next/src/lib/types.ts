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

export interface SurveyPhoto {
  id: string
  uploadStatus: string
  latitude: number
  longitude: number
  capturedAtUtc: string
}

export interface SurveyDetail {
  id: string
  projectId: string
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAtUtc: string
  syncedAtUtc: string
  detailsJson: string | null
  status: string
  photos: SurveyPhoto[]
}

export interface InitiatePhotoResponse {
  photoId: string
  uploadUrl: string
  storagePath: string
}
