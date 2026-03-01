-- CreateTable
CREATE TABLE "position_templates" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "title_en" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'service',
    "level" INTEGER NOT NULL DEFAULT 3,
    "authority_score" INTEGER NOT NULL DEFAULT 0,
    "guest_interaction" INTEGER NOT NULL DEFAULT 0,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "skills" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "position_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_templates_title_key" ON "position_templates"("title");
CREATE INDEX "position_templates_category_idx" ON "position_templates"("category");
CREATE INDEX "position_templates_is_active_idx" ON "position_templates"("is_active");

-- Seed: Tüm F&B pozisyon şablonları
INSERT INTO "position_templates" ("title", "title_en", "description", "category", "level", "authority_score", "guest_interaction", "team_size", "skills", "sort_order", "updated_at") VALUES
-- Yönetim
('F&B Direktörü', 'F&B Director', 'Tüm yiyecek-içecek operasyonlarının stratejik yöneticisi. Bütçe, vizyon ve standartları belirler.', 'management', 1, 100, 20, 1, '{"management":95,"technical":70,"social":85,"physical":30,"crisis":90}', 1, NOW()),
-- Servis
('Restoran Müdürü', 'Restaurant Manager', 'Restoran operasyonlarının günlük yöneticisi. Servis kalitesi, personel ve misafir memnuniyetinden sorumlu.', 'service', 2, 85, 80, 1, '{"management":90,"technical":80,"social":85,"physical":70,"crisis":90}', 10, NOW()),
('Captain', 'Captain / Head Waiter', 'Servis ekibinin saha lideri. Misafir ilişkileri ve servis akışını yönetir.', 'service', 2, 50, 90, 3, '{"management":60,"technical":70,"social":90,"physical":70,"crisis":70}', 11, NOW()),
('Sommelier', 'Sommelier', 'Şarap ve içecek uzmanı. Misafirlere şarap eşleştirmesi önerir.', 'service', 2, 45, 85, 1, '{"management":40,"technical":95,"social":90,"physical":60,"crisis":50}', 12, NOW()),
('Hostess Şefi', 'Head Hostess', 'Karşılama ekibinin yöneticisi. Rezervasyon ve masa düzeninden sorumlu.', 'service', 2, 45, 95, 2, '{"management":50,"technical":50,"social":95,"physical":50,"crisis":60}', 13, NOW()),
('Garson', 'Waiter / Waitress', 'Misafir siparişlerini alır ve servis yapar.', 'service', 3, 30, 95, 15, '{"management":15,"technical":60,"social":85,"physical":80,"crisis":40}', 14, NOW()),
('Busser', 'Busser / Runner', 'Masa düzeni, temizlik ve yemek taşıma.', 'service', 3, 15, 70, 8, '{"management":5,"technical":30,"social":50,"physical":90,"crisis":20}', 15, NOW()),
('Hostess', 'Hostess', 'Misafir karşılama ve masa yönlendirme.', 'service', 3, 20, 95, 3, '{"management":10,"technical":40,"social":95,"physical":50,"crisis":30}', 16, NOW()),
-- Bar
('Bar Müdürü', 'Bar Manager', 'Bar operasyonlarının yöneticisi. İçecek menüsü, stok kontrolü ve bar ekibinden sorumlu.', 'bar', 2, 75, 85, 1, '{"management":80,"technical":85,"social":80,"physical":60,"crisis":75}', 20, NOW()),
('Barmen', 'Bartender', 'İçecek hazırlama ve bar servisi.', 'bar', 3, 35, 90, 5, '{"management":20,"technical":85,"social":85,"physical":70,"crisis":45}', 21, NOW()),
('Bar Yardımcısı', 'Bar Back', 'Bar stok ve temizlik desteği.', 'bar', 3, 15, 50, 3, '{"management":5,"technical":40,"social":40,"physical":85,"crisis":20}', 22, NOW()),
-- Ziyafet
('Ziyafet Müdürü', 'Banquet Manager', 'Büyük etkinlik ve organizasyonların planlanması ve yürütülmesinden sorumlu.', 'banquet', 2, 80, 70, 1, '{"management":85,"technical":75,"social":80,"physical":65,"crisis":85}', 30, NOW()),
('Ziyafet Captain', 'Banquet Captain', 'Ziyafet servis ekibinin saha lideri.', 'banquet', 2, 50, 70, 3, '{"management":60,"technical":65,"social":75,"physical":70,"crisis":65}', 31, NOW()),
('Ziyafet Garson', 'Banquet Waiter', 'Etkinliklerde servis hizmeti.', 'banquet', 3, 25, 65, 8, '{"management":15,"technical":50,"social":65,"physical":80,"crisis":35}', 32, NOW()),
-- Oda Servisi
('Oda Servisi Şefi', 'Room Service Manager', 'Oda servisi operasyonlarının yöneticisi.', 'room_service', 2, 55, 70, 1, '{"management":65,"technical":60,"social":70,"physical":55,"crisis":60}', 40, NOW()),
('Oda Servisi Garsonu', 'Room Service Waiter', 'Odalara yemek-içecek servisi.', 'room_service', 3, 25, 80, 4, '{"management":10,"technical":50,"social":75,"physical":80,"crisis":35}', 41, NOW());
