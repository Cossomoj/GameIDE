-- GameIDE Database Initialization Script
-- This script sets up the complete database structure

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    level INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'offline',
    games_created INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Games table (расширенная для GameEntity)
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    code TEXT,
    assets JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    size_bytes BIGINT DEFAULT 0,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactive game sessions table
CREATE TABLE IF NOT EXISTS interactive_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 6,
    completed_steps INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    final_game_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactive game steps table
CREATE TABLE IF NOT EXISTS interactive_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES interactive_sessions(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    order_number INTEGER NOT NULL,
    selected_variant VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactive step variants table
CREATE TABLE IF NOT EXISTS interactive_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID REFERENCES interactive_steps(id) ON DELETE CASCADE,
    variant_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    details JSONB DEFAULT '{}',
    ai_generated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Game logs table
CREATE TABLE IF NOT EXISTS game_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    step VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Statistics table
CREATE TABLE IF NOT EXISTS daily_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_games INTEGER DEFAULT 0,
    successful_games INTEGER DEFAULT 0,
    failed_games INTEGER DEFAULT 0,
    interactive_sessions INTEGER DEFAULT 0,
    completed_interactive_sessions INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for user authentication
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Game analytics table
CREATE TABLE IF NOT EXISTS game_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(50),
    icon VARCHAR(200),
    requirements JSONB DEFAULT '{}',
    rewards JSONB DEFAULT '{}',
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 100,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'score',
    sort_order VARCHAR(10) DEFAULT 'desc',
    reset_frequency VARCHAR(50) DEFAULT 'never',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard entries table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    rank INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Social activities table
CREATE TABLE IF NOT EXISTS social_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    content TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_logs_game_id ON game_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_level ON game_logs(level);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_game_id ON game_analytics(game_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON game_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON game_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON leaderboard_entries(score);
CREATE INDEX IF NOT EXISTS idx_social_activities_user_id ON social_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON daily_statistics(date);

-- Interactive sessions indexes
CREATE INDEX IF NOT EXISTS idx_interactive_sessions_game_id ON interactive_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_interactive_sessions_user_id ON interactive_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactive_sessions_status ON interactive_sessions(is_active, is_paused);
CREATE INDEX IF NOT EXISTS idx_interactive_steps_session_id ON interactive_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_interactive_steps_order ON interactive_steps(session_id, order_number);
CREATE INDEX IF NOT EXISTS idx_interactive_variants_step_id ON interactive_variants(step_id);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interactive_sessions_updated_at ON interactive_sessions;
CREATE TRIGGER update_interactive_sessions_updated_at
    BEFORE UPDATE ON interactive_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_interactive_steps_updated_at ON interactive_steps;
CREATE TRIGGER update_interactive_steps_updated_at
    BEFORE UPDATE ON interactive_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_entries_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_entries_updated_at
    BEFORE UPDATE ON leaderboard_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO users (username, email, password_hash, display_name) VALUES 
    ('demo_user', 'demo@gameide.dev', crypt('password123', gen_salt('bf')), 'Demo User')
ON CONFLICT (email) DO NOTHING;

-- Insert sample achievements
INSERT INTO achievements (key, title, description, category, difficulty, icon) VALUES
    ('first_game', 'First Game Creator', 'Create your first game', 'creation', 'easy', '🎮'),
    ('interactive_master', 'Interactive Master', 'Complete 5 interactive game sessions', 'creation', 'medium', '🎯'),
    ('speed_creator', 'Speed Creator', 'Complete interactive session in under 5 minutes', 'speed', 'hard', '⚡'),
    ('genre_explorer', 'Genre Explorer', 'Create games in 5 different genres', 'variety', 'medium', '🌟'),
    ('perfectionist', 'Perfectionist', 'Create a game with 95+ quality score', 'quality', 'hard', '💎')
ON CONFLICT (key) DO NOTHING;

-- Insert sample leaderboards
INSERT INTO leaderboards (key, name, description, type, sort_order) VALUES
    ('global_score', 'Global High Scores', 'Best scores across all games', 'score', 'desc'),
    ('game_creator', 'Game Creators', 'Most games created', 'count', 'desc'),
    ('interactive_speed', 'Interactive Speed', 'Fastest interactive game completion', 'time', 'asc'),
    ('quality_masters', 'Quality Masters', 'Highest average game quality', 'quality', 'desc')
ON CONFLICT (key) DO NOTHING;

-- Confirm initialization
SELECT 'GameIDE Database with Interactive Sessions initialized successfully!' AS status; 