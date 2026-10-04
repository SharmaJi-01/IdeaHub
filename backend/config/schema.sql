-- IdeaHub PostgreSQL schema (UUID-compatible)
-- PostgreSQL 14+ / Windows-friendly
CREATE EXTENSION IF NOT EXISTS pgcrypto;


CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  username VARCHAR(30) NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  college_name VARCHAR(120) NOT NULL,
  student_id VARCHAR(60) NOT NULL,
  institution_email TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT NOT NULL DEFAULT '',
  bio VARCHAR(240) NOT NULL DEFAULT 'Engineering student building useful ideas.',
  skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_login_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_college_verification
  ON users (college_name, verification_status);
CREATE INDEX IF NOT EXISTS idx_users_verification
  ON users (verification_status);

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_time
  ON login_history (user_id, logged_in_at DESC);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY,
  content_type TEXT NOT NULL DEFAULT 'idea' CHECK (content_type IN ('idea', 'reel')),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(120) NOT NULL,
  project_status TEXT NOT NULL CHECK (project_status IN ('Idea', 'Building', 'Prototype', 'Working Prototype', 'Demo Ready', 'Completed')),
  technologies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL CHECK (duration BETWEEN 10 AND 60),
  source_video_name TEXT NOT NULL DEFAULT '',
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  saves_count INTEGER NOT NULL DEFAULT 0 CHECK (saves_count >= 0),
  shares_count INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT NOT NULL DEFAULT '',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0;

-- Older IdeaHub builds briefly used a generated tsvector column. Remove it safely
-- before creating the trigger-backed version used by this release.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ideas'
      AND column_name = 'search_vector'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE ideas DROP COLUMN search_vector;
  END IF;
END $$;

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE INDEX IF NOT EXISTS idx_ideas_creator_created
  ON ideas (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_feed
  ON ideas (moderation_status, content_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_moderation
  ON ideas (moderation_status);
CREATE INDEX IF NOT EXISTS idx_ideas_content_type
  ON ideas (content_type);
CREATE INDEX IF NOT EXISTS idx_ideas_category
  ON ideas (category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at
  ON ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_popular
  ON ideas (views DESC, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_likes
  ON ideas (likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_shared
  ON ideas (shares_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_search
  ON ideas USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_idea ON likes (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saves (
  id UUID PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_saves_idea ON saves (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saves_user ON saves (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  share_method TEXT NOT NULL DEFAULT 'copy' CHECK (share_method IN ('native', 'copy', 'direct')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shares_idea_time ON shares (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_user_time ON shares (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text VARCHAR(400) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_idea_created ON comments (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'save', 'share', 'verification', 'moderation', 'system')),
  title VARCHAR(120) NOT NULL,
  message VARCHAR(280) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_idea_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple'::regconfig,
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(array_to_string(NEW.technologies, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_like() RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  idea_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT creator_id, title INTO owner_id, idea_title FROM ideas WHERE id = NEW.idea_id;
  SELECT name INTO actor_name FROM users WHERE id = NEW.user_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO notifications (id, user_id, actor_id, idea_id, type, title, message)
    VALUES (gen_random_uuid(), owner_id, NEW.user_id, NEW.idea_id, 'like', 'New like',
            COALESCE(actor_name, 'Someone') || ' liked your idea "' || idea_title || '".');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_save() RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  idea_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT creator_id, title INTO owner_id, idea_title FROM ideas WHERE id = NEW.idea_id;
  SELECT name INTO actor_name FROM users WHERE id = NEW.user_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO notifications (id, user_id, actor_id, idea_id, type, title, message)
    VALUES (gen_random_uuid(), owner_id, NEW.user_id, NEW.idea_id, 'save', 'Idea saved',
            COALESCE(actor_name, 'Someone') || ' saved your idea "' || idea_title || '".');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_comment() RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  idea_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT creator_id, title INTO owner_id, idea_title FROM ideas WHERE id = NEW.idea_id;
  SELECT name INTO actor_name FROM users WHERE id = NEW.user_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO notifications (id, user_id, actor_id, idea_id, comment_id, type, title, message)
    VALUES (gen_random_uuid(), owner_id, NEW.user_id, NEW.idea_id, NEW.id, 'comment', 'New comment',
            COALESCE(actor_name, 'Someone') || ' commented on your idea "' || idea_title || '".');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_share() RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  idea_title TEXT;
  actor_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT creator_id, title INTO owner_id, idea_title FROM ideas WHERE id = NEW.idea_id;
  SELECT name INTO actor_name FROM users WHERE id = NEW.user_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO notifications (id, user_id, actor_id, idea_id, type, title, message)
    VALUES (gen_random_uuid(), owner_id, NEW.user_id, NEW.idea_id, 'share', 'Idea shared',
            COALESCE(actor_name, 'Someone') || ' shared your idea "' || idea_title || '".');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_verification_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status IN ('verified', 'rejected') THEN
    INSERT INTO notifications (id, user_id, type, title, message)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      'verification',
      CASE WHEN NEW.verification_status = 'verified' THEN 'Student account verified' ELSE 'Verification update' END,
      CASE WHEN NEW.verification_status = 'verified'
        THEN 'Your IdeaHub student profile is verified. You can now publish ideas.'
        ELSE 'Your IdeaHub student profile was not approved. Review your details and contact an admin.'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_moderation_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     AND NEW.moderation_status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (id, user_id, idea_id, type, title, message)
    VALUES (
      gen_random_uuid(),
      NEW.creator_id,
      NEW.id,
      'moderation',
      CASE WHEN NEW.moderation_status = 'approved' THEN 'Idea approved' ELSE 'Idea rejected' END,
      CASE WHEN NEW.moderation_status = 'approved'
        THEN 'Your idea "' || NEW.title || '" is now visible in the IdeaHub feed.'
        ELSE 'Your idea "' || NEW.title || '" was rejected. ' || COALESCE(NULLIF(NEW.rejection_reason, ''), 'Please review the project requirements.')
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ideas_updated_at ON ideas;
CREATE TRIGGER trg_ideas_updated_at BEFORE UPDATE ON ideas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ideas_search_vector ON ideas;
CREATE TRIGGER trg_ideas_search_vector
BEFORE INSERT OR UPDATE OF title, description, category, technologies, tags
ON ideas FOR EACH ROW EXECUTE FUNCTION set_idea_search_vector();

DROP TRIGGER IF EXISTS trg_like_notification ON likes;
CREATE TRIGGER trg_like_notification AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION notify_like();

DROP TRIGGER IF EXISTS trg_save_notification ON saves;
CREATE TRIGGER trg_save_notification AFTER INSERT ON saves
FOR EACH ROW EXECUTE FUNCTION notify_save();

DROP TRIGGER IF EXISTS trg_comment_notification ON comments;
CREATE TRIGGER trg_comment_notification AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_comment();

DROP TRIGGER IF EXISTS trg_share_notification ON shares;
CREATE TRIGGER trg_share_notification AFTER INSERT ON shares
FOR EACH ROW EXECUTE FUNCTION notify_share();

DROP TRIGGER IF EXISTS trg_user_verification_notification ON users;
CREATE TRIGGER trg_user_verification_notification
AFTER UPDATE OF verification_status ON users
FOR EACH ROW EXECUTE FUNCTION notify_verification_change();

DROP TRIGGER IF EXISTS trg_idea_moderation_notification ON ideas;
CREATE TRIGGER trg_idea_moderation_notification
AFTER UPDATE OF moderation_status ON ideas
FOR EACH ROW EXECUTE FUNCTION notify_moderation_change();

UPDATE ideas
SET search_vector = to_tsvector(
  'simple'::regconfig,
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(category, '') || ' ' ||
  coalesce(array_to_string(technologies, ' '), '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
)
WHERE search_vector IS NULL;
