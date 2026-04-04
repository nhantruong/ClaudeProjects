-- =============================================================================
-- Migration 005: RFI images table
-- Date: 2026-04-03
-- Creates: rfi_images — file attachments for RFI records (1–6 per RFI)
--
-- ROLLBACK DDL:
--   DROP TABLE IF EXISTS rfi_images;
-- WARNING: rollback is destructive.
-- =============================================================================

CREATE TABLE rfi_images (
    id              int            NOT NULL IDENTITY(1,1),
    rfi_id          int            NOT NULL,
    comment_id      int            NULL,
    filename        nvarchar(255)  NOT NULL,
    storage_path    nvarchar(500)  NOT NULL,
    mime_type       nvarchar(100)  NULL,
    file_size       bigint         NULL,
    sort_order      int            NOT NULL DEFAULT 0,
    uploaded_by     int            NOT NULL,
    created_at      datetime2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT PK_rfi_images          PRIMARY KEY (id),
    CONSTRAINT FK_rfi_images_rfi      FOREIGN KEY (rfi_id)      REFERENCES rfis(id)         ON DELETE CASCADE,
    CONSTRAINT FK_rfi_images_comment  FOREIGN KEY (comment_id)  REFERENCES rfi_comments(id),
    CONSTRAINT FK_rfi_images_user     FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_rfi_images_rfi_id     ON rfi_images (rfi_id, sort_order);
CREATE INDEX idx_rfi_images_comment_id ON rfi_images (comment_id) WHERE comment_id IS NOT NULL;
