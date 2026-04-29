-- pgvector extension for Spring AI RAG
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(36)  PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email               VARCHAR(255) NOT NULL UNIQUE,
    name                VARCHAR(255),
    picture             VARCHAR(512),
    google_id           VARCHAR(255) UNIQUE,
    -- encrypted OAuth2 tokens stored here
    gmail_access_token  TEXT,
    gmail_refresh_token TEXT,
    token_expires_at    TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Emails (mirrored from Gmail) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id         VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gmail_id        VARCHAR(255) NOT NULL,          -- Gmail message ID
    thread_id       VARCHAR(255),                  -- Gmail thread ID
    subject         VARCHAR(998),
    sender_email    VARCHAR(255),
    sender_name     VARCHAR(255),
    recipients      TEXT[],
    snippet         VARCHAR(500),
    body_plain      TEXT,
    body_html       TEXT,
    label_ids       TEXT[],
    is_read         BOOLEAN DEFAULT FALSE,
    is_starred      BOOLEAN DEFAULT FALSE,
    is_important    BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    received_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gmail_id)
);

-- ── AI Results ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_results (
    id           VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email_id     VARCHAR(36) NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    user_id      VARCHAR(36) NOT NULL,
    type         VARCHAR(20) NOT NULL,   -- REPLY | SUMMARY
    result_text  TEXT,
    summary_json JSONB,
    tone         VARCHAR(30),
    tokens_used  INTEGER,
    latency_ms   BIGINT,
    model_used   VARCHAR(50),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Sent replies (tracked separately from Gmail sent) ────────────────────────
CREATE TABLE IF NOT EXISTS sent_replies (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id         VARCHAR(36)  NOT NULL REFERENCES users(id),
    original_email_id VARCHAR(36) REFERENCES emails(id),
    gmail_sent_id   VARCHAR(255),
    recipient       VARCHAR(255),
    subject         VARCHAR(998),
    body            TEXT,
    sent_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Vector store (Spring AI managed) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vector_store (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content   TEXT,
    metadata  JSONB,
    embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS idx_vector_store_embedding
    ON vector_store USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_emails_user_id     ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_id    ON emails(gmail_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read     ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_ai_results_email   ON ai_results(email_id);
