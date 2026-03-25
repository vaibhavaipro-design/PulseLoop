-- Migration: Add extra fields to niches table
ALTER TABLE niches
ADD COLUMN description text,
ADD COLUMN icon text DEFAULT '🤖',
ADD COLUMN keywords jsonb DEFAULT '[]'::jsonb,
ADD COLUMN sources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN scrape_freq text DEFAULT 'Every 6 hours (Starter)',
ADD COLUMN signal_memory text DEFAULT '90 days';
