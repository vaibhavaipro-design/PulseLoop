'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { ChartData } from '@/lib/chart-types'

const COLORS = {
  primary:   '#6366f1',
  secondary: '#8b5cf6',
  positive:  '#10b981',
  neutral:   '#94a3b8',
  negative:  '#f43f5e',
  high:      '#f43f5e',
  medium:    '#f59e0b',
  low:       '#10b981',
  bars: ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#f59e0b','#fbbf24','#10b981','#34d399'],
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
      </p>
      {children}
    </div>
  )
}

function SignalVolumeTrend({ data }: { data: NonNullable<ChartData['signal_volume_by_week']> }) {
  return (
    <ChartCard title="Signal Volume — Last 8 Weeks">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number) => [v, 'Signals']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.primary }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function SourceDistributionChart({ data }: { data: NonNullable<ChartData['source_distribution']> }) {
  return (
    <ChartCard title="Source Distribution">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={80} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.pct}%)`, 'Signals']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TopicDistributionChart({ data }: { data: NonNullable<ChartData['topic_distribution']> }) {
  const pieData = data.map(d => ({ name: d.topic, value: d.signal_count, pct: d.pct }))
  return (
    <ChartCard title="Topic Distribution">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number, _: string, entry: any) => [`${v} signals (${entry.payload.pct}%)`, entry.payload.name]}
          />
          <Legend
            formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function SentimentBreakdownChart({ data }: { data: NonNullable<ChartData['sentiment_breakdown']> }) {
  const colorMap: Record<string, string> = {
    positive: COLORS.positive,
    neutral:  COLORS.neutral,
    negative: COLORS.negative,
  }
  return (
    <ChartCard title="Sentiment Breakdown">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.pct}%)`, 'Signals']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.label] ?? COLORS.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function GeoDistributionChart({ data }: { data: NonNullable<ChartData['geo_distribution']> }) {
  return (
    <ChartCard title="Geographic Signal Origin">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="geo" tick={{ fontSize: 11 }} width={70} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.pct}%)`, 'Signals']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function UrgencyDistributionChart({ data }: { data: NonNullable<ChartData['urgency_distribution']> }) {
  const colorMap: Record<string, string> = {
    High:     COLORS.high,
    Medium:   COLORS.medium,
    Low:      COLORS.low,
    Unscored: COLORS.neutral,
  }
  return (
    <ChartCard title="Urgency Distribution">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.pct}%)`, 'Signals']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.bucket] ?? COLORS.primary} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function CompanyMentionsChart({ data }: { data: NonNullable<ChartData['top_company_mentions']> }) {
  return (
    <ChartCard title="Top Company Mentions">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="company" tick={{ fontSize: 11 }} width={80} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number) => [v, 'Mentions']}
          />
          <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TopicMomentumChart({ data }: { data: NonNullable<ChartData['topic_momentum']> }) {
  // Sort: most rising first, then most declining
  const sorted = [...data].sort((a, b) => b.score - a.score)
  return (
    <ChartCard title="Rising vs Declining Topics">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[-10, 10]}
            tick={{ fontSize: 11 }}
            tickFormatter={v => v > 0 ? `+${v}` : String(v)}
          />
          <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={110} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v: number) => [v > 0 ? `+${v} rising` : `${v} declining`, 'Momentum']}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={entry.score >= 0 ? COLORS.positive : COLORS.negative} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface ReportChartsProps {
  chartData: ChartData | null
}

export default function ReportCharts({ chartData }: ReportChartsProps) {
  if (!chartData) return null

  const hasVolume   = (chartData.signal_volume_by_week?.length ?? 0) > 0
  const hasSource   = (chartData.source_distribution?.length ?? 0) > 0
  const hasTopic    = (chartData.topic_distribution?.length ?? 0) > 0
  const hasSentiment = (chartData.sentiment_breakdown?.length ?? 0) > 0
  const hasGeo      = (chartData.geo_distribution?.length ?? 0) > 0
  const hasUrgency  = (chartData.urgency_distribution?.length ?? 0) > 0
  const hasCompany  = (chartData.top_company_mentions?.length ?? 0) > 0
  const hasMomentum = (chartData.topic_momentum?.length ?? 0) > 0

  const hasAny = hasVolume || hasSource || hasTopic || hasSentiment || hasGeo || hasUrgency || hasCompany || hasMomentum
  if (!hasAny) return null

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        Data Overview
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasVolume && (
          <div className="md:col-span-2">
            <SignalVolumeTrend data={chartData.signal_volume_by_week!} />
          </div>
        )}
        {hasSource    && <SourceDistributionChart  data={chartData.source_distribution!} />}
        {hasTopic     && <TopicDistributionChart   data={chartData.topic_distribution!} />}
        {hasSentiment && <SentimentBreakdownChart  data={chartData.sentiment_breakdown!} />}
        {hasGeo       && <GeoDistributionChart     data={chartData.geo_distribution!} />}
        {hasUrgency   && <UrgencyDistributionChart data={chartData.urgency_distribution!} />}
        {hasCompany   && <CompanyMentionsChart     data={chartData.top_company_mentions!} />}
        {hasMomentum  && (
          <div className="md:col-span-2">
            <TopicMomentumChart data={chartData.topic_momentum!} />
          </div>
        )}
      </div>
    </section>
  )
}
