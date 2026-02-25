-- F&B Organizasyon Şeması Seed Data
-- Seviye 1: Stratejik Yönetim, Seviye 2: Operasyonel Yönetim, Seviye 3: İcra Ekibi

-- Sayfa ayarları
INSERT INTO system_settings (key, value, updated_at) VALUES
  ('org_chart_title', 'Otel F&B Departmanı Organizasyon Yapısı', NOW()),
  ('org_chart_subtitle', 'Organizasyonel Hiyerarşi ve Operasyonel Yapı', NOW()),
  ('org_chart_description', 'Otelcilikte "Yiyecek ve İçecek" (Food & Beverage), askeri bir disiplinle yönetilen, en karmaşık ve personel yoğunluğunun en yüksek olduğu departmandır.', NOW()),
  ('org_chart_dept_distribution', '[{"name":"Mutfak (Kitchen)","percentage":35,"color":"#0F4C75"},{"name":"Servis (Restaurant)","percentage":25,"color":"#3282B8"},{"name":"Ziyafet (Banquet)","percentage":15,"color":"#FF9F1C"},{"name":"Bar & İçecek","percentage":10,"color":"#BBE1FA"},{"name":"Oda Servisi","percentage":5,"color":"#1B262C"},{"name":"Hijyen (Steward)","percentage":8,"color":"#CBD5E0"},{"name":"Yönetim (Admin)","percentage":2,"color":"#E2E8F0"}]', NOW()),
  ('org_chart_service_flow', '[{"step":1,"title":"Karşılama","description":"Hostess misafiri karşılar ve masaya yerleştirir.","highlight":true},{"step":2,"title":"Sipariş","description":"Captain veya Waiter siparişi alır, Sommelier şarap önerir.","highlight":false},{"step":3,"title":"Hazırlık","description":"Mutfak ekibi yemeği, Barmen içeceği hazırlar.","highlight":false},{"step":4,"title":"Servis","description":"Busser masayı düzenler, Waiter servisi yapar.","highlight":false},{"step":5,"title":"Hijyen","description":"Steward bulaşıkları devralır, Night Cleaner temizler.","highlight":true}]', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Pozisyonlar
-- 1. Stratejik Yönetim
INSERT INTO org_positions (title, title_en, description, category, level, parent_id, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('F&B Direktörü', 'F&B Director', 'Tüm yiyecek-içecek operasyonlarının stratejik yöneticisi. Bütçe, vizyon ve standartları belirler.', 'management', 1, NULL, 100, 20, 1, '{"management":95,"technical":70,"social":85,"physical":30,"crisis":90}', 1);

-- 2. Operasyonel Yönetim (parent_id'ler sonra güncellenecek)
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Executive Chef', 'Executive Chef', 'Mutfağın en üst yöneticisi. Menü tasarımı, maliyet kontrolü ve mutfak ekibinin yönetiminden sorumlu.', 'kitchen', 2, 90, 10, 1, '{"management":90,"technical":95,"social":60,"physical":50,"crisis":85}', 2),
('Restoran Müdürü', 'Restaurant Manager', 'Restoran operasyonlarının günlük yöneticisi. Servis kalitesi, personel ve misafir memnuniyetinden sorumlu.', 'service', 2, 85, 80, 1, '{"management":90,"technical":80,"social":85,"physical":70,"crisis":90}', 3),
('Bar Müdürü', 'Bar Manager', 'Bar operasyonlarının yöneticisi. İçecek menüsü, stok kontrolü ve bar ekibinden sorumlu.', 'bar', 2, 75, 85, 1, '{"management":80,"technical":85,"social":80,"physical":60,"crisis":75}', 4),
('Ziyafet Müdürü', 'Banquet Manager', 'Büyük etkinlik ve organizasyonların planlanması ve yürütülmesinden sorumlu.', 'banquet', 2, 80, 70, 1, '{"management":85,"technical":75,"social":80,"physical":65,"crisis":85}', 5),
('Executive Sous Chef', 'Executive Sous Chef', 'Executive Chef''in sağ kolu. Günlük mutfak operasyonlarını yönetir.', 'kitchen', 2, 80, 10, 1, '{"management":80,"technical":90,"social":55,"physical":60,"crisis":80}', 6);

-- 3. Orta Kademe
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Sous Chef', 'Sous Chef', 'Belirli bir mutfak bölümünün sorumlusu. İstasyonları denetler.', 'kitchen', 2, 75, 10, 2, '{"management":70,"technical":85,"social":50,"physical":65,"crisis":75}', 7),
('Pastane Şefi', 'Pastry Chef', 'Tüm tatlı, pasta ve ekmek üretiminden sorumlu.', 'kitchen', 2, 70, 10, 2, '{"management":65,"technical":95,"social":45,"physical":60,"crisis":60}', 8),
('Kasap Şefi', 'Butcher Chef', 'Et hazırlama, porsiyon kesim ve et stoğundan sorumlu.', 'kitchen', 2, 65, 5, 1, '{"management":55,"technical":90,"social":30,"physical":80,"crisis":50}', 9),
('Captain', 'Captain / Head Waiter', 'Servis ekibinin saha lideri. Misafir ilişkileri ve servis akışını yönetir.', 'service', 2, 50, 90, 3, '{"management":60,"technical":70,"social":90,"physical":70,"crisis":70}', 10),
('Sommelier', 'Sommelier', 'Şarap ve içecek uzmanı. Misafirlere şarap eşleştirmesi önerir.', 'service', 2, 45, 85, 1, '{"management":40,"technical":95,"social":90,"physical":60,"crisis":50}', 11),
('Hostess Şefi', 'Head Hostess', 'Karşılama ekibinin yöneticisi. Rezervasyon ve masa düzeninden sorumlu.', 'service', 2, 45, 95, 2, '{"management":50,"technical":50,"social":95,"physical":50,"crisis":60}', 12);

-- 4. İcra Ekibi
INSERT INTO org_positions (title, title_en, description, category, level, authority_score, guest_interaction, team_size, skills, sort_order) VALUES
('Chef de Partie', 'Chef de Partie', 'İstasyon şefi. Belirli bir pişirme istasyonunun sorumlusu.', 'kitchen', 3, 40, 5, 3, '{"management":40,"technical":80,"social":35,"physical":75,"crisis":50}', 13),
('Demi Chef', 'Demi Chef de Partie', 'İstasyon şefinin yardımcısı.', 'kitchen', 3, 30, 5, 3, '{"management":25,"technical":70,"social":30,"physical":80,"crisis":40}', 14),
('Commis I', 'Commis I', 'Deneyimli komi. Temel yemek hazırlığı yapabilir.', 'kitchen', 3, 20, 5, 5, '{"management":15,"technical":55,"social":25,"physical":85,"crisis":25}', 15),
('Commis II', 'Commis II', 'Orta seviye komi. Hazırlık ve yardımcı görevler.', 'kitchen', 3, 15, 5, 8, '{"management":10,"technical":40,"social":20,"physical":90,"crisis":20}', 16),
('Commis III', 'Commis III', 'Çırak komi. Temel mutfak görevleri.', 'kitchen', 3, 10, 5, 10, '{"management":5,"technical":25,"social":15,"physical":95,"crisis":15}', 17),
('Garson', 'Waiter / Waitress', 'Misafir siparişlerini alır ve servis yapar.', 'service', 3, 30, 95, 15, '{"management":15,"technical":60,"social":85,"physical":80,"crisis":40}', 18),
('Busser', 'Busser / Runner', 'Masa düzeni, temizlik ve yemek taşıma.', 'service', 3, 15, 70, 8, '{"management":5,"technical":30,"social":50,"physical":90,"crisis":20}', 19),
('Hostess', 'Hostess', 'Misafir karşılama ve masa yönlendirme.', 'service', 3, 20, 95, 3, '{"management":10,"technical":40,"social":95,"physical":50,"crisis":30}', 20),
('Barmen', 'Bartender', 'İçecek hazırlama ve bar servisi.', 'bar', 3, 35, 90, 5, '{"management":20,"technical":85,"social":85,"physical":70,"crisis":45}', 21),
('Bar Yardımcısı', 'Bar Back', 'Bar stok ve temizlik desteği.', 'bar', 3, 15, 50, 3, '{"management":5,"technical":40,"social":40,"physical":85,"crisis":20}', 22),
('Oda Servisi Garsonu', 'Room Service Waiter', 'Odalara yemek-içecek servisi.', 'room_service', 3, 25, 80, 4, '{"management":10,"technical":50,"social":75,"physical":80,"crisis":35}', 23),
('Steward', 'Steward', 'Bulaşık, mutfak temizliği ve hijyen.', 'hygiene', 3, 10, 5, 10, '{"management":5,"technical":20,"social":15,"physical":95,"crisis":15}', 24),
('Night Cleaner', 'Night Cleaner', 'Gece temizlik operasyonları.', 'hygiene', 3, 10, 5, 4, '{"management":5,"technical":15,"social":10,"physical":95,"crisis":10}', 25);

-- Parent ilişkilerini güncelle
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'F&B Director') WHERE title_en IN ('Executive Chef', 'Restaurant Manager', 'Bar Manager', 'Banquet Manager');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Executive Chef') WHERE title_en = 'Executive Sous Chef';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Executive Sous Chef') WHERE title_en IN ('Sous Chef', 'Pastry Chef', 'Butcher Chef');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Sous Chef') WHERE title_en = 'Chef de Partie';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Chef de Partie') WHERE title_en = 'Demi Chef de Partie';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Demi Chef de Partie') WHERE title_en IN ('Commis I', 'Commis II', 'Commis III');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Pastry Chef') WHERE title_en = 'Demi Chef de Partie';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Restaurant Manager') WHERE title_en IN ('Captain / Head Waiter', 'Sommelier', 'Head Hostess');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Captain / Head Waiter') WHERE title_en IN ('Waiter / Waitress', 'Busser / Runner');
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Head Hostess') WHERE title_en = 'Hostess';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Bar Manager') WHERE title_en = 'Bartender';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'Bartender') WHERE title_en = 'Bar Back';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'F&B Director') WHERE title_en = 'Room Service Waiter';
UPDATE org_positions SET parent_id = (SELECT id FROM org_positions WHERE title_en = 'F&B Director') WHERE title_en IN ('Steward', 'Night Cleaner');
