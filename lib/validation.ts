// lib/validation.ts — shared Zod schemas (no secrets)
import { z } from 'zod'

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const NicheSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
})

export const TrendReportSchema = z.object({
  nicheId: z.string().uuid(),
  nicheQuery: z.string().min(3).max(200),
  workspaceId: z.string().uuid().optional(),
  privateContext: z.string().max(50000).optional(),
})

export const SignalBriefSchema = z.object({
  reportId: z.string().uuid(),
})

export const NewsletterSchema = z.object({
  reportId: z.string().uuid(),
  angle: z.string().min(3).max(200).optional(),
})

export const LinkedinPostsSchema = z.object({
  newsletterId: z.string().uuid(),
})

export const DashboardSchema = z.object({
  reportId: z.string().uuid(),
  style: z.enum(['minimal', 'bold', 'corporate']).optional(),
  template: z.enum(['weekly-brief', 'competitive', 'regulatory']).optional(),
})

export const BrandVoiceSchema = z.object({
  content: z.string().min(10).max(5000),
})
