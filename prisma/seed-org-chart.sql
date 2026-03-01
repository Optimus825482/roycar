-- F&B Organizasyon Şeması Seed Data
-- Seviye 1: Stratejik Yönetim, Seviye 2: Operasyonel Yönetim, Seviye 3: İcra Ekibi
-- NOT: Mutfak (kitchen) ve Hijyen (hygiene/steward) pozisyonları kaldırıldı.

-- Sayfa ayarları
INSERT INTO system_settings (key, value, updated_at) VALUES
  ('org_chart_title', 'Otel F&B Departmanı Organizasyon Yapısı', NOW()),
  ('org_chart_subtitle', 'Organizasyonel Hiyerarşi ve Operasyonel Yapı', NOW()),
  ('org_chart_description', 'Otelcilikte "Yiyecek ve İçecek" (Food & Beverage), askeri bir disiplinle yönetilen, en karmaşık ve personel yoğunluğunun en yüksek olduğu departmandır.', NOW()),
  ('org_chart_dept_distribution', '[{"name":"Servis (Restaurant)","percentage":35,"color":"#3282B8"},{"name":"Ziyafet (Banquet)","percentage":20,"color":"#FF9F1C"},{"name":"Bar & İçecek","percentage":15,"color":"#BBE1FA"},{"name":"Oda Servisi","percentage":10,"color":"#1B262C"},{"name":"Yönetim (Admin)","percentage":20,"color":"#E2E8F0"}]', NOW()),
  ('org_chart_service_flow', '[{"step":1,"title":"Karşılama","description":"Hostess misafiri karşılar ve masaya yerleştirir.","highlight":true},{"step":2,"title":"Sipariş","description":"Captain veya Waiter siparişi alır, Sommelier şarap önerir.","highlight":false},{"step":3,"title":"Servis","description":"Busser masayı düzenler, Waiter servisi yapar.","highlight":false},{"step":4,"title":"İçecek","description":"Barmen içeceği hazırlar ve servis eder.","highlight":true}]', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Pozisyonlar
-- 1. Stratejik Yönetim
INSERT INTO org_positions (title, title_en, description, category, level, parent_id, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('F&B Direktörü', 'F&B Director', 'Tüm yiyecek-içecek operasyonlarının stratejik yöneticisi. Bütçe, vizyon ve standartları belirler.', 'management', 1, NULL, 100, 20, 1, '{"management":95,"technical":70,"social":85,"physical":30,"crisis":90}', 1);

-- 2. Operasyonel Yönetim
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Restoran Müdürü', 'Restaurant Manager', 'Restoran operasyonlarının günlük yöneticisi. Servis kalitesi, personel ve misafir memnuniyetinden sorumlu.', 'service', 2, 85, 80, 1, '{"management":90,"technical":80,"social":85,"physical":70,"crisis":90}', 2),
('Bar Müdürü', 'Bar Manager', 'Bar operasyonlarının yöneticisi. İçecek menüsü, stok kontrolü ve bar ekibinden sorumlu.', 'bar', 2, 75, 85, 1, '{"management":80,"technical":85,"social":80,"physical":60,"crisis":75}', 3),
('Ziyafet Müdürü', 'Banquet Manager', 'Büyük etkinlik ve organizasyonların planlanması ve yürütülmesinden sorumlu.', 'banquet', 2, 80, 70, 1, '{"management":85,"technical":75,"social":80,"physical":65,"crisis":85}', 4);

-- 3. Orta Kademe
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Captain', 'Captain / Head Waiter', 'Servis ekibinin saha lideri. Misafir ilişkileri ve servis akışını yönetir.', 'service', 2, 50, 90, 3, '{"management":60,"technical":70,"social":90,"physical":70,"crisis":70}', 5),
('Sommelier', 'Sommelier', 'Şarap ve içecek uzmanı. Misafirlere şarap eşleştirmesi önerir.', 'service', 2, 45, 85, 1, '{"management":40,"technical":95,"social":90,"physical":60,"crisis":50}', 6),
('Hostess Şefi', 'Head Hostess', 'Karşılama ekibinin yöneticisi. Rezervasyon ve masa düzeninden sorumlu.', 'service', 2, 45, 95, 2, '{"management":50,"technical":50,"social":95,"physical":50,"crisis":60}', 7);

-- 4. İcra Ekibi
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Garson', 'Waiter / Waitress', 'Misafir siparişlerini alır ve servis yapar.', 'service', 3, 30, 95, 15, '{"management":15,"technical":60,"social":85,"physical":80,"crisis":40}', 8),
('Busser', 'Busser / Runner', 'Masa düzeni, temizlik ve yemek taşıma.', 'service', 3, 15, 70, 8, '{"management":5,"technical":30,"social":50,"physical":90,"crisis":20}', 9),
('Hostess', 'Hostess', 'Misafir karşılama ve masa yönlendirme.', 'service', 3, 20, 95, 3, '{"management":10,"technical":40,"social":95,"physical":50,"crisis":30}', 10),
('Barmen', 'Bartender', 'İçecek hazırlama ve bar servisi.', 'bar', 3, 35, 90, 5, '{"management":20,"technical":85,"social":85,"physical":70,"crisis":45}', 11),
('Bar Yardımcısı', 'Bar Back', 'Bar stok ve temizlik desteği.', 'bar', 3, 15, 50, 3, '{"management":5,"technical":40,"social":40,"physical":85,"crisis":20}', 12),
('Oda Servisi Garsonu', 'Room Service Waiter', 'Odalara yemek-içecek servisi.', 'room_service', 3, 25, 80, 4, '{"management":10,"technical":50,"social":75,"physical":80,"crisis":35}', 13);

-- Parent ilişkilerini güncelle
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'F&B Director') WHERE title_en IN ('Restaurant Manager', 'Bar Manager', 'Banquet Manager');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Restaurant Manager') WHERE title_en IN ('Captain / Head Waiter', 'Sommelier', 'Head Hostess');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Captain / Head Waiter') WHERE title_en IN ('Waiter / Waitress', 'Busser / Runner');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Head Hostess') WHERE title_en = 'Hostess';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Bar Manager') WHERE title_en = 'Bartender';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Bartender') WHERE title_en = 'Bar Back';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'F&B Director') WHERE title_en = 'Room Service Waiter';
