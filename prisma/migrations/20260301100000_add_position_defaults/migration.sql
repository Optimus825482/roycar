-- CreateTable
CREATE TABLE "position_defaults" (
    "id" BIGSERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "authority_score" INTEGER NOT NULL DEFAULT 0,
    "guest_interaction" INTEGER NOT NULL DEFAULT 0,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "skills" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "position_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_defaults_category_level_key" ON "position_defaults"("category", "level");
CREATE INDEX "position_defaults_category_idx" ON "position_defaults"("category");

-- Seed: Default özellikler (her kategori + seviye kombinasyonu)
INSERT INTO "position_defaults" ("category", "level", "authority_score", "guest_interaction", "team_size", "skills", "updated_at") VALUES
-- Yönetim
('management', 1, 100, 20, 1, '{"management":95,"technical":70,"social":85,"physical":30,"crisis":90}', NOW()),
('management', 2, 80, 40, 1, '{"management":85,"technical":75,"social":80,"physical":40,"crisis":80}', NOW()),
('management', 3, 50, 30, 2, '{"management":60,"technical":60,"social":70,"physical":50,"crisis":60}', NOW()),
-- Servis
('service', 1, 85, 80, 1, '{"management":90,"technical":80,"social":85,"physical":70,"crisis":90}', NOW()),
('service', 2, 50, 90, 3, '{"management":60,"technical":70,"social":90,"physical":70,"crisis":70}', NOW()),
('service', 3, 25, 90, 8, '{"management":15,"technical":50,"social":85,"physical":80,"crisis":35}', NOW()),
-- Bar
('bar', 1, 75, 85, 1, '{"management":80,"technical":85,"social":80,"physical":60,"crisis":75}', NOW()),
('bar', 2, 50, 85, 3, '{"management":50,"technical":80,"social":80,"physical":65,"crisis":55}', NOW()),
('bar', 3, 25, 70, 4, '{"management":15,"technical":60,"social":65,"physical":75,"crisis":30}', NOW()),
-- Ziyafet
('banquet', 1, 80, 70, 1, '{"management":85,"technical":75,"social":80,"physical":65,"crisis":85}', NOW()),
('banquet', 2, 50, 70, 3, '{"management":60,"technical":65,"social":70,"physical":70,"crisis":65}', NOW()),
('banquet', 3, 25, 60, 6, '{"management":20,"technical":50,"social":60,"physical":80,"crisis":40}', NOW()),
-- Oda Servisi
('room_service', 1, 60, 70, 1, '{"management":70,"technical":60,"social":75,"physical":50,"crisis":65}', NOW()),
('room_service', 2, 40, 75, 2, '{"management":45,"technical":55,"social":70,"physical":65,"crisis":45}', NOW()),
('room_service', 3, 25, 80, 4, '{"management":10,"technical":50,"social":75,"physical":80,"crisis":35}', NOW());
