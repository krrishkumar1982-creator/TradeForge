import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _dbInitialized: boolean | undefined;
}

export const createPool = (): pg.Pool => {
  if (!global._postgresPool) {
    const hasCloudSql = !!process.env.SQL_HOST;

    if (hasCloudSql) {
      const host = process.env.SQL_HOST!;
      const isSocket = host.startsWith('/');
      const isRemoteHost = !isSocket && (host.includes('supabase') || host.includes('pooler') || host.includes('aws') || host.includes('gcp'));
      const isSsl = !isSocket && (process.env.DB_SSL === 'true' || process.env.SQL_SSL === 'true' || isRemoteHost);

      global._postgresPool = new Pool({
        host,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432),
        user: process.env.SQL_USER || process.env.PGUSER || process.env.SUPABASE_USER || 'postgres',
        password: process.env.SQL_PASSWORD || process.env.PGPASSWORD || process.env.SUPABASE_PASSWORD || '',
        database: process.env.SQL_DB_NAME || process.env.PGDATABASE || process.env.SUPABASE_DB_NAME || 'postgres',
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
        max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
        idleTimeoutMillis: process.env.DATABASE_IDLE_TIMEOUT_MS ? parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 10) : 30000,
        connectionTimeoutMillis: process.env.DATABASE_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10) : 5000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });
    } else {
      const rawConnectionString =
        process.env.DATABASE_URL ||
        process.env.SUPABASE_DATABASE_URL ||
        process.env.SUPABASE_DB_URL ||
        process.env.POSTGRES_URL;

      const connectionString = (rawConnectionString && !rawConnectionString.includes('projectref.supabase.co'))
        ? rawConnectionString
        : undefined;

      if (connectionString) {
        const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
        global._postgresPool = new Pool({
          connectionString,
          ssl: isLocalhost ? false : { rejectUnauthorized: false },
          max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
          idleTimeoutMillis: process.env.DATABASE_IDLE_TIMEOUT_MS ? parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 10) : 30000,
          connectionTimeoutMillis: process.env.DATABASE_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10) : 5000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        });
      } else {
        const host = process.env.PGHOST || process.env.SUPABASE_HOST || 'localhost';
        const isRemoteHost = host.includes('supabase') || host.includes('pooler') || host.includes('aws') || host.includes('gcp');
        const isSsl = process.env.DB_SSL === 'true' || process.env.SQL_SSL === 'true' || isRemoteHost;

        global._postgresPool = new Pool({
          host,
          port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
          user: process.env.PGUSER || process.env.SUPABASE_USER || 'postgres',
          password: process.env.PGPASSWORD || process.env.SUPABASE_PASSWORD || '',
          database: process.env.PGDATABASE || process.env.SUPABASE_DB_NAME || 'postgres',
          ssl: isSsl ? { rejectUnauthorized: false } : undefined,
          max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
          idleTimeoutMillis: process.env.DATABASE_IDLE_TIMEOUT_MS ? parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 10) : 30000,
          connectionTimeoutMillis: process.env.DATABASE_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10) : 5000,
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
        });
      }
    }

    global._postgresPool.on('error', (err: any) => {
      // Idle client connection terminations are completely normal in cloud databases (e.g. Supabase / Cloud SQL / serverless DBs
      // closing idle connections after a timeout). We log these as warnings to avoid triggering false alarms.
      if (err && (err.message?.includes('Connection terminated unexpectedly') || err.code === 'ECONNRESET')) {
        console.warn('SQL Pool client connection was closed by remote database (idle connection termination):', err.message);
      } else {
        console.error('Unexpected error on idle SQL pool client:', err);
      }
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export async function ensureAllTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
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
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          account_code TEXT,
          experience_level TEXT DEFAULT 'Intermediate',
          avatar_url TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS trading_accounts (
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
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS trades (
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
          tags JSONB NOT NULL DEFAULT '[]',
          mistakes JSONB NOT NULL DEFAULT '[]',
          rules_followed BOOLEAN NOT NULL DEFAULT TRUE,
          screenshot_url TEXT,
          after_screenshot_url TEXT,
          duration_minutes INTEGER NOT NULL DEFAULT 0,
          emotional_state TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS playbooks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL,
          rules JSONB NOT NULL DEFAULT '[]',
          example_screenshots JSONB NOT NULL DEFAULT '[]',
          total_trades INTEGER NOT NULL DEFAULT 0,
          win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
          net_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
          profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
          avg_winner DOUBLE PRECISION NOT NULL DEFAULT 0,
          avg_loser DOUBLE PRECISION NOT NULL DEFAULT 0,
          expectancy DOUBLE PRECISION NOT NULL DEFAULT 0,
          missed_trades_count INTEGER NOT NULL DEFAULT 0,
          is_private BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS strategies (
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
          rules JSONB NOT NULL DEFAULT '[]',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS journal_folders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT,
          count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS journal_notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          folder_id TEXT NOT NULL,
          tags JSONB NOT NULL DEFAULT '[]',
          content TEXT NOT NULL DEFAULT '',
          pre_market_plan JSONB NOT NULL DEFAULT '{}',
          post_market_review JSONB NOT NULL DEFAULT '{}',
          contracts_traded DOUBLE PRECISION,
          volume DOUBLE PRECISION,
          net_pnl DOUBLE PRECISION,
          net_roi DOUBLE PRECISION,
          screenshots JSONB NOT NULL DEFAULT '[]',
          template_used TEXT,
          is_favorite BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS risk_goals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          trading_account_id TEXT,
          daily_profit_target DOUBLE PRECISION,
          weekly_profit_target DOUBLE PRECISION,
          monthly_profit_target DOUBLE PRECISION,
          max_daily_loss DOUBLE PRECISION,
          daily_max_loss DOUBLE PRECISION,
          max_weekly_loss DOUBLE PRECISION,
          max_drawdown DOUBLE PRECISION,
          max_drawdown_limit DOUBLE PRECISION,
          max_risk_per_trade_percent DOUBLE PRECISION,
          max_risk_per_trade_amount DOUBLE PRECISION,
          max_trades_per_day INTEGER,
          max_consecutive_losses INTEGER,
          max_contracts_per_trade INTEGER,
          max_daily_loss_streak INTEGER,
          min_r_multiple DOUBLE PRECISION,
          max_position_size DOUBLE PRECISION,
          max_open_positions INTEGER,
          enforce_circuit_breaker BOOLEAN DEFAULT FALSE,
          circuit_breaker_triggered BOOLEAN DEFAULT FALSE,
          circuit_breaker_state TEXT DEFAULT 'DISARMED',
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS backtest_sessions (
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
          trades JSONB NOT NULL DEFAULT '[]',
          total_trades INTEGER NOT NULL DEFAULT 0,
          win_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
          net_pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
          profit_factor DOUBLE PRECISION NOT NULL DEFAULT 0,
          max_drawdown DOUBLE PRECISION NOT NULL DEFAULT 0,
          current_index INTEGER NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS community_posts (
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
          comments JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS post_likes (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS post_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_avatar TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mentor_students (
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
          shared_accounts JSONB DEFAULT '[]',
          unread_notes_count INTEGER DEFAULT 0,
          discipline_score INTEGER DEFAULT 0,
          joined_date TEXT,
          risk_breached BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mentor_student_relationships (
          id TEXT PRIMARY KEY,
          mentor_user_id TEXT NOT NULL,
          student_user_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS student_sharing_permissions (
          id TEXT PRIMARY KEY,
          student_user_id TEXT NOT NULL,
          mentor_user_id TEXT NOT NULL,
          shared_account_ids JSONB NOT NULL DEFAULT '[]',
          can_view_account_overview BOOLEAN NOT NULL DEFAULT TRUE,
          can_view_trades BOOLEAN NOT NULL DEFAULT TRUE,
          can_view_analytics BOOLEAN NOT NULL DEFAULT TRUE,
          can_view_equity_curve BOOLEAN NOT NULL DEFAULT TRUE,
          can_view_drawdown BOOLEAN NOT NULL DEFAULT TRUE,
          can_view_playbooks BOOLEAN NOT NULL DEFAULT FALSE,
          can_view_notes BOOLEAN NOT NULL DEFAULT FALSE,
          can_view_risk_controls BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mentor_directives (
          id TEXT PRIMARY KEY,
          mentor_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'DIRECTIVE',
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          action_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS broker_integrations (
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
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS integration_events (
          id TEXT PRIMARY KEY,
          integration_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          external_event_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL,
          status TEXT NOT NULL DEFAULT 'PROCESSED',
          error TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
          attempt_count INTEGER NOT NULL DEFAULT 1,
          max_attempts INTEGER NOT NULL DEFAULT 5,
          next_retry_at TIMESTAMP,
          last_attempt_at TIMESTAMP,
          processed_at TIMESTAMP,
          failed_at TIMESTAMP,
          error_code TEXT,
          error_message TEXT,
          correlation_id TEXT,
          idempotency_key TEXT,
          source_ip_hash TEXT,
          provider TEXT
        );

        CREATE TABLE IF NOT EXISTS daily_checklist_states (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          item_id TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT uid_date_item_idx UNIQUE (user_id, date, item_id)
        );

        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id TEXT PRIMARY KEY,
          admin_id TEXT NOT NULL,
          target_user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          previous_value TEXT,
          new_value TEXT,
          reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS backtest_drawings (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          session_id TEXT DEFAULT 'default',
          symbol TEXT NOT NULL,
          timeframe TEXT DEFAULT '15m',
          drawings JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chart_templates (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          chart_type TEXT NOT NULL DEFAULT 'CANDLESTICK',
          indicators JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS trading_account_connections (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          broker TEXT NOT NULL,
          server TEXT,
          account_number TEXT NOT NULL,
          account_name TEXT,
          currency TEXT NOT NULL DEFAULT 'USD',
          account_type TEXT NOT NULL DEFAULT 'LIVE',
          encrypted_credentials TEXT NOT NULL,
          connection_status TEXT NOT NULL DEFAULT 'CONNECTED',
          sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          auto_sync_interval_mins INTEGER NOT NULL DEFAULT 5,
          import_scope TEXT NOT NULL DEFAULT 'ALL',
          import_start_date TEXT,
          last_sync_at TEXT,
          last_sync_error TEXT,
          last_sync_trades_count INTEGER NOT NULL DEFAULT 0,
          balance DOUBLE PRECISION DEFAULT 0,
          equity DOUBLE PRECISION DEFAULT 0,
          leverage INTEGER DEFAULT 100,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS connection_sync_logs (
          id TEXT PRIMARY KEY,
          connection_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL,
          trades_imported INTEGER NOT NULL DEFAULT 0,
          trades_updated INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          details JSONB,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          duration_ms INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS prop_firm_accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          firm_name TEXT NOT NULL,
          trading_brand TEXT,
          legal_entity TEXT,
          registration_number TEXT,
          jurisdiction TEXT,
          terms_effective_date TEXT,
          rules_version TEXT,
          account_number TEXT,
          account_size DOUBLE PRECISION,
          starting_balance DOUBLE PRECISION NOT NULL,
          current_balance DOUBLE PRECISION NOT NULL,
          equity DOUBLE PRECISION NOT NULL,
          high_water_mark DOUBLE PRECISION,
          currency TEXT NOT NULL DEFAULT 'USD',
          program_model TEXT NOT NULL DEFAULT 'TWO_STEP',
          phases JSONB NOT NULL DEFAULT '[]',
          active_phase_index INTEGER DEFAULT 0,
          phase TEXT NOT NULL DEFAULT 'PHASE_1',
          phase_name TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          risk_state TEXT NOT NULL DEFAULT 'SAFE',
          enforcement_mode TEXT DEFAULT 'MONITOR',
          drawdown_model TEXT NOT NULL DEFAULT 'STATIC',
          daily_drawdown_model TEXT NOT NULL DEFAULT 'START_OF_DAY_BALANCE',
          daily_loss_method TEXT DEFAULT 'REALIZED_ONLY',
          max_risk_per_symbol_percent DOUBLE PRECISION,
          min_trade_duration_sec INTEGER,
          avg_trade_duration_sec INTEGER,
          min_trading_days INTEGER DEFAULT 0,
          max_trading_days INTEGER DEFAULT 0,
          start_date TEXT,
          deadline TEXT,
          qualifying_day_profit_percent DOUBLE PRECISION,
          profit_target_percent DOUBLE PRECISION,
          daily_loss_percent DOUBLE PRECISION,
          total_loss_percent DOUBLE PRECISION,
          profit_target_amount DOUBLE PRECISION,
          daily_loss_amount DOUBLE PRECISION,
          total_loss_amount DOUBLE PRECISION,
          consistency_max_day_percent DOUBLE PRECISION,
          max_profit_concentration_percent DOUBLE PRECISION,
          news_trading_allowed TEXT DEFAULT 'ALLOWED',
          weekend_holding_allowed BOOLEAN DEFAULT TRUE,
          overnight_holding_allowed BOOLEAN DEFAULT TRUE,
          ea_allowed TEXT DEFAULT 'ALLOWED',
          copy_trading_allowed TEXT DEFAULT 'ALLOWED',
          hedging_allowed TEXT DEFAULT 'ALLOWED',
          max_lot_size DOUBLE PRECISION,
          min_lot_size DOUBLE PRECISION,
          max_positions INTEGER,
          max_leverage INTEGER DEFAULT 100,
          ip_restrictions JSONB DEFAULT '{}',
          prohibited_strategies JSONB DEFAULT '[]',
          reward_buffer_percent DOUBLE PRECISION,
          reward_split_percent DOUBLE PRECISION DEFAULT 80,
          profit_split_trader_percent DOUBLE PRECISION DEFAULT 80,
          profit_split_firm_percent DOUBLE PRECISION DEFAULT 20,
          min_reward_request DOUBLE PRECISION,
          payout_frequency TEXT DEFAULT 'BIWEEKLY',
          activation_fee DOUBLE PRECISION,
          inactivity_max_days INTEGER DEFAULT 30,
          news_window_minutes INTEGER DEFAULT 5,
          session_timezone TEXT DEFAULT 'America/New_York',
          scaling_rules JSONB DEFAULT '{}',
          rules JSONB NOT NULL DEFAULT '[]',
          violations JSONB NOT NULL DEFAULT '[]',
          timeline JSONB DEFAULT '[]',
          payout_info JSONB DEFAULT '{}',
          trading_account_link TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Add any missing columns to trades table for broker auto-sync and prop firm linking
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS prop_firm_account_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS connection_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS external_trade_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS platform TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS broker TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS order_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS position_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS setup_id TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS setup_grade TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS auto_grade TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS rule_compliance_percent DOUBLE PRECISION;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS checked_rule_ids JSONB NOT NULL DEFAULT '[]';
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS broken_rule_ids JSONB NOT NULL DEFAULT '[]';
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS mistake_category TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS mistake_description TEXT;
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS mistake_severity TEXT;

        -- Add any missing columns to integration_events if it existed before migrations
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'RECEIVED';
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS error_code TEXT;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS error_message TEXT;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS correlation_id TEXT;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS source_ip_hash TEXT;
        ALTER TABLE integration_events ADD COLUMN IF NOT EXISTS provider TEXT;
        -- Add any missing columns to risk_goals table
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS trading_account_id TEXT;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS max_risk_per_trade_amount DOUBLE PRECISION;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS max_daily_loss_streak INTEGER;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS min_r_multiple DOUBLE PRECISION;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS max_position_size DOUBLE PRECISION;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS max_open_positions INTEGER;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS circuit_breaker_state TEXT DEFAULT 'DISARMED';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS risk_mode TEXT DEFAULT 'LOWER_OF_BOTH';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS weekly_loss_limit DOUBLE PRECISION;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS trailing_drawdown_limit DOUBLE PRECISION;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS hard_lock_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS warning_threshold_percent DOUBLE PRECISION DEFAULT 75;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS critical_threshold_percent DOUBLE PRECISION DEFAULT 90;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS daily_reset_time TEXT DEFAULT '17:00';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS include_floating_pnl BOOLEAN DEFAULT FALSE;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS include_fees BOOLEAN DEFAULT TRUE;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS include_commissions BOOLEAN DEFAULT TRUE;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS drawdown_methodology TEXT DEFAULT 'EQUITY_BASED';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS weekly_target_action TEXT DEFAULT 'CONTINUE';
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS require_manual_unlock BOOLEAN DEFAULT TRUE;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS lock_reason TEXT;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS locked_at TEXT;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS unlocked_at TEXT;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS unlocked_by TEXT;
        ALTER TABLE risk_goals ADD COLUMN IF NOT EXISTS unlock_reason TEXT;
        ALTER TABLE risk_goals DROP CONSTRAINT IF EXISTS risk_goals_user_id_key;

        CREATE TABLE IF NOT EXISTS risk_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          account_id TEXT,
          account_name TEXT,
          event_type TEXT NOT NULL,
          rule TEXT NOT NULL,
          current_value TEXT,
          limit_value TEXT,
          severity TEXT NOT NULL,
          action_taken TEXT NOT NULL,
          notes TEXT,
          unlocked_by TEXT,
          unlock_reason TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          account_id TEXT,
          scope TEXT NOT NULL DEFAULT 'GLOBAL',
          general JSONB NOT NULL DEFAULT '{}',
          notifications JSONB NOT NULL DEFAULT '{}',
          ai_settings JSONB NOT NULL DEFAULT '{}',
          trade_defaults JSONB NOT NULL DEFAULT '{}',
          commission_rules JSONB NOT NULL DEFAULT '[]',
          profile JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS custom_tags (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Custom',
          color TEXT NOT NULL DEFAULT '#6366F1',
          description TEXT DEFAULT '',
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS import_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'CSV',
          file_name TEXT NOT NULL,
          trades_processed INTEGER NOT NULL DEFAULT 0,
          trades_added INTEGER NOT NULL DEFAULT 0,
          duplicates_count INTEGER NOT NULL DEFAULT 0,
          errors_count INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'COMPLETED',
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'SYSTEM',
          object TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'SUCCESS',
          source TEXT DEFAULT 'Web Client',
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_backups (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          size_bytes INTEGER NOT NULL DEFAULT 0,
          trade_count INTEGER NOT NULL DEFAULT 0,
          notes_count INTEGER NOT NULL DEFAULT 0,
          backup_data JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Journal soft-delete and trash management columns
        ALTER TABLE journal_notes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE journal_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE journal_notes ADD COLUMN IF NOT EXISTS deleted_by TEXT;
        ALTER TABLE journal_notes ADD COLUMN IF NOT EXISTS original_folder_id TEXT;
        ALTER TABLE journal_notes ALTER COLUMN folder_id DROP NOT NULL;

        ALTER TABLE journal_folders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE journal_folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE journal_folders ADD COLUMN IF NOT EXISTS deleted_by TEXT;

        CREATE INDEX IF NOT EXISTS idx_journal_notes_deleted ON journal_notes(user_id, is_deleted);
        CREATE INDEX IF NOT EXISTS idx_journal_notes_deleted_at ON journal_notes(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_journal_folders_deleted ON journal_folders(user_id, is_deleted);
        CREATE INDEX IF NOT EXISTS idx_journal_folders_deleted_at ON journal_folders(deleted_at);
      `);
      global._dbInitialized = true;
    } finally {
      client.release();
    }
  } catch (err) {
    global._dbInitialized = true;
  }
}

export const ensureLoungeTables = ensureAllTables;

export const db = drizzle(pool, { schema });
ensureAllTables().catch((err) => {
  console.warn('[DB] Warning during table initialization check:', err?.message || err);
});
