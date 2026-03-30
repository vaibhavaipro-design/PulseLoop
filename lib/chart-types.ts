export interface WeeklyVolumePoint {
  week: string       // "2026-W10"
  week_label: string // "10 Mar"
  count: number
}

export interface PlatformDistributionPoint {
  platform: string
  count: number
  pct: number
}

export interface TopicDistributionPoint {
  topic: string
  signal_count: number
  pct: number
}

export interface SentimentPoint {
  label: 'positive' | 'neutral' | 'negative'
  count: number
  pct: number
}

export interface GeoDistributionPoint {
  geo: string
  count: number
  pct: number
}

export interface UrgencyBucketPoint {
  bucket: 'Low' | 'Medium' | 'High' | 'Unscored'
  count: number
  pct: number
}

export interface CompanyMentionPoint {
  company: string
  mentions: number
}

export interface TopicMomentumPoint {
  topic: string
  score: number // signed: positive = rising, negative = declining, range -10 to +10
}

export interface SignalImage {
  signal_id: string
  source_image_url: string
  title: string
  platform: string
  source_url: string
}

export interface ChartData {
  // SQL-computed from enriched signals
  signal_volume_by_week?: WeeklyVolumePoint[]
  source_distribution?: PlatformDistributionPoint[]
  topic_distribution?: TopicDistributionPoint[]
  sentiment_breakdown?: SentimentPoint[]
  geo_distribution?: GeoDistributionPoint[]
  urgency_distribution?: UrgencyBucketPoint[]

  // Claude-computed (present only if JSON parse succeeds)
  top_company_mentions?: CompanyMentionPoint[]
  topic_momentum?: TopicMomentumPoint[]

  // Source images (top 6 by urgency with non-null og:image)
  signal_images?: SignalImage[]

  // Metadata
  generated_at: string
  signal_count: number
  chart_schema_version: 2
}
