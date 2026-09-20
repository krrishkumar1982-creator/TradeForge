-- ========================================================================
-- DUSKFLOW / PIPZY — COMPREHENSIVE SUPABASE POSTGRESQL SCHEMA & MIGRATION
-- ========================================================================
-- This script sets up all application tables, indexes, Row Level Security (RLS)
-- policies, Supabase Storage buckets, and helper triggers for the DuskFlow / Pipzy platform.
--
-- Compatible with Supabase PostgreSQL (Free & Pro tiers).
-- Execute this entire file in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ========================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================================
-- TABLE CREATION (Exact schema matching Drizzle ORM models)
-- ========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  account_code TEXT NOT NULL UNIQUE,
  experience_level TEXT NOT NULL DEFAULT 'Intermediate',
  points INTEGER NOT NULL DEFAULT 100,
  role TEXT NOT NULL DEFAULT 'USER',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  avatar TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trading Accounts Table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  broker TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  initial_balance DOUBLE PRECISION NOT NULL,
  current_balance DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync TEXT,
  sync_status TEXT NOT NULL DEFAULT 'HEALTHY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  exit_date TEXT,
  entry_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION,
  stop_loss DOUBLE PRECISION,
  take_profit DOUBLE PRECISION,
  quantity DOUBLE PRECISION NOT NULL,
  gross_pnl DOUBLE PRECISION NOT NULL,
  net_pnl DOUBLE PRECISION NOT NULL,
  commission DOUBLE PRECISION NOT NULL DEFAULT 0,
  swap DOUBLE PRECISION NOT NULL DEFAULT 0,
  fees DOUBLE PRECISION NOT NULL DEFAULT 0,
  r_multiple DOUBLE PRECISION NOT NULL DEFAULT 0,
  roi_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  session TEXT NOT NULL,
  strategy_id TEXT,
  playbook_id TEXT,
  setup_type TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3,
  notes TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  mistakes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_followed BOOLEAN NOT NULL DEFAULT TRUE,
  screenshot_url TEXT,
  after_screenshot_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  emotional_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Playbooks Table
CREATE TABLE IF NOT EXISTS public.playbooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_winner DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_loser DOUBLE PRECISION NOT NULL DEFAULT 0,
  expectancy DOUBLE PRECISION NOT NULL DEFAULT 0,
  missed_trades_count INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Strategies Table
CREATE TABLE IF NOT EXISTS public.strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  market_type TEXT NOT NULL,
  win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  net_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Journal Notes Table
CREATE TABLE IF NOT EXISTS public.journal_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  folder_id TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NOT NULL DEFAULT '',
  pre_market_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  post_market_review JSONB NOT NULL DEFAULT '{}'::jsonb,
  contracts_traded DOUBLE PRECISION,
  volume DOUBLE PRECISION,
  net_pnl DOUBLE PRECISION,
  net_roi DOUBLE PRECISION,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_used TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  original_folder_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Journal Folders Table
CREATE TABLE IF NOT EXISTS public.journal_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Risk Goals Table
CREATE TABLE IF NOT EXISTS public.risk_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  daily_profit_target DOUBLE PRECISION,
  weekly_profit_target DOUBLE PRECISION,
  monthly_profit_target DOUBLE PRECISION,
  max_daily_loss DOUBLE PRECISION,
  daily_max_loss DOUBLE PRECISION,
  max_weekly_loss DOUBLE PRECISION,
  max_drawdown DOUBLE PRECISION,
  max_drawdown_limit DOUBLE PRECISION,
  max_risk_per_trade_percent DOUBLE PRECISION,
  max_trades_per_day INTEGER,
  max_consecutive_losses INTEGER,
  max_contracts_per_trade INTEGER,
  enforce_circuit_breaker BOOLEAN DEFAULT FALSE,
  circuit_breaker_triggered BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Backtest Sessions Table
CREATE TABLE IF NOT EXISTS public.backtest_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  strategy TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  initial_balance DOUBLE PRECISION NOT NULL,
  current_balance DOUBLE PRECISION NOT NULL,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  badge TEXT,
  timestamp TEXT NOT NULL,
  content TEXT NOT NULL,
  symbol TEXT,
  direction TEXT,
  pnl TEXT,
  r_multiple TEXT,
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  has_liked BOOLEAN DEFAULT FALSE,
  comments_count INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Post Likes Table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Mentor Students Table
CREATE TABLE IF NOT EXISTS public.mentor_students (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT NOT NULL,
  account_name TEXT NOT NULL,
  current_balance DOUBLE PRECISION DEFAULT 0,
  net_pnl DOUBLE PRECISION DEFAULT 0,
  win_rate DOUBLE PRECISION DEFAULT 0,
  profit_factor DOUBLE PRECISION DEFAULT 0,
  zella_score INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  shared_accounts JSONB DEFAULT '[]'::jsonb,
  unread_notes_count INTEGER DEFAULT 0,
  discipline_score INTEGER DEFAULT 0,
  joined_date TEXT,
  risk_breached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Mentor Directives Table
CREATE TABLE IF NOT EXISTS public.mentor_directives (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'DIRECTIVE',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Broker Integrations Table
CREATE TABLE IF NOT EXISTS public.broker_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  secret_hash TEXT NOT NULL,
  external_account_id TEXT,
  last_sync_at TEXT,
  last_event_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Integration Events Table
CREATE TABLE IF NOT EXISTS public.integration_events (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSED',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
  attempt_count INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_code TEXT,
  error_message TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  source_ip_hash TEXT,
  provider TEXT
);

-- 18. Daily Checklist States Table
CREATE TABLE IF NOT EXISTS public.daily_checklist_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  item_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_date_item UNIQUE (user_id, date, item_id)
);

-- 19. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Backtest Drawings Table
CREATE TABLE IF NOT EXISTS public.backtest_drawings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT DEFAULT 'default',
  symbol TEXT NOT NULL,
  timeframe TEXT DEFAULT '15m',
  drawings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Chart Templates Table
CREATE TABLE IF NOT EXISTS public.chart_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  chart_type TEXT NOT NULL DEFAULT 'CANDLESTICK',
  indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================================
-- PERFORMANCE INDEXES
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_users_account_code ON public.users(account_code);

CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON public.trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

CREATE INDEX IF NOT EXISTS idx_playbooks_user_id ON public.playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_notes_user_id ON public.journal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_notes_date ON public.journal_notes(date);
CREATE INDEX IF NOT EXISTS idx_journal_notes_folder_id ON public.journal_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_journal_notes_deleted ON public.journal_notes(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_journal_notes_deleted_at ON public.journal_notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_journal_folders_deleted ON public.journal_folders(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_journal_folders_deleted_at ON public.journal_folders(deleted_at);

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_mentor_students_user_id ON public.mentor_students(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_code ON public.mentor_students(code);
CREATE INDEX IF NOT EXISTS idx_mentor_directives_mentor ON public.mentor_directives(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_directives_student ON public.mentor_directives(student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_integrations_user_id ON public.broker_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_integration_id ON public.integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_user_id ON public.integration_events(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_processing_status ON public.integration_events(processing_status);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Helper function to check if the current requester is a service role or owner
-- Supports both direct Supabase Auth tokens (auth.uid()) and server service keys.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checklist_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_templates ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Allow public read of public profiles" ON public.users
  FOR SELECT USING (is_public = TRUE OR uid = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Allow users to update own profile" ON public.users
  FOR ALL USING (uid = auth.uid()::text OR auth.role() = 'service_role');

-- 2. Trading Accounts policies
CREATE POLICY "Users can manage own trading accounts" ON public.trading_accounts
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 3. Trades policies
CREATE POLICY "Users can manage own trades" ON public.trades
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 4. Playbooks policies
CREATE POLICY "Users can manage own playbooks, view public playbooks" ON public.playbooks
  FOR ALL USING (user_id = auth.uid()::text OR is_private = FALSE OR auth.role() = 'service_role');

-- 5. Strategies policies
CREATE POLICY "Users can manage own strategies" ON public.strategies
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 6. Journal Notes policies
CREATE POLICY "Users can manage own journal notes" ON public.journal_notes
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 7. Journal Folders policies
CREATE POLICY "Users can manage own journal folders" ON public.journal_folders
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 8. Risk Goals policies
CREATE POLICY "Users can manage own risk goals" ON public.risk_goals
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 9. Backtest Sessions policies
CREATE POLICY "Users can manage own backtest sessions" ON public.backtest_sessions
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 10. Community Posts policies (Public read, authenticated write)
CREATE POLICY "Anyone can view community posts" ON public.community_posts
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own community posts" ON public.community_posts
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 11. Post Likes policies
CREATE POLICY "Anyone can view post likes" ON public.post_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own post likes" ON public.post_likes
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 12. Post Comments policies
CREATE POLICY "Anyone can view post comments" ON public.post_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own post comments" ON public.post_comments
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 13. Mentor Students policies
CREATE POLICY "Mentors and students can access their connections" ON public.mentor_students
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 14. Mentor Directives policies
CREATE POLICY "Mentors and students can access their directives" ON public.mentor_directives
  FOR ALL USING (mentor_id = auth.uid()::text OR student_id = auth.uid()::text OR auth.role() = 'service_role');

-- 15. Notifications policies
CREATE POLICY "Users can view and manage their notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 16. Broker Integrations policies
CREATE POLICY "Users can manage own broker integrations" ON public.broker_integrations
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 17. Integration Events policies
CREATE POLICY "Users and service role can access integration events" ON public.integration_events
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 18. Daily Checklist States policies
CREATE POLICY "Users can manage own daily checklists" ON public.daily_checklist_states
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 19. Backtest Drawings policies
CREATE POLICY "Users can manage own backtest drawings" ON public.backtest_drawings
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- 20. Chart Templates policies
CREATE POLICY "Users can manage own chart templates" ON public.chart_templates
  FOR ALL USING (user_id = auth.uid()::text OR auth.role() = 'service_role');

-- ========================================================================
-- SUPABASE STORAGE BUCKETS CONFIGURATION
-- ========================================================================

-- Insert storage buckets if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('screenshots', 'screenshots', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
      ('trade-attachments', 'trade-attachments', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']),
      ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
      ('journal-assets', 'journal-assets', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

-- Storage RLS policies for public access & user uploads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Public read access for all trading journal screenshots and assets
    CREATE POLICY "Public Access to Trading Screenshots" ON storage.objects
      FOR SELECT USING (bucket_id IN ('screenshots', 'trade-attachments', 'avatars', 'journal-assets'));

    -- Upload access for authenticated users and service role
    CREATE POLICY "Allow Uploads to Trading Buckets" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id IN ('screenshots', 'trade-attachments', 'avatars', 'journal-assets')
      );

    -- Delete access
    CREATE POLICY "Allow Delete from Trading Buckets" ON storage.objects
      FOR DELETE USING (
        bucket_id IN ('screenshots', 'trade-attachments', 'avatars', 'journal-assets')
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2-Day Automatic Trash Purge Function
CREATE OR REPLACE FUNCTION public.purge_expired_trash_items()
RETURNS void AS $$
BEGIN
  -- 1. Permanently delete notes in trash older than 2 days
  DELETE FROM public.journal_notes
  WHERE is_deleted = TRUE
    AND deleted_at IS NOT NULL
    AND deleted_at <= (NOW() - INTERVAL '2 days');

  -- 2. Permanently delete folders in trash older than 2 days
  DELETE FROM public.journal_folders
  WHERE is_deleted = TRUE
    AND deleted_at IS NOT NULL
    AND deleted_at <= (NOW() - INTERVAL '2 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule purge via pg_cron if extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge_expired_journal_trash',
      '0 * * * *', -- Run hourly
      'SELECT public.purge_expired_trash_items();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

