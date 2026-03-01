-- Mutfak (kitchen) ve Hijyen (hygiene) pozisyonlarını kaldır
-- Bu script mevcut veritabanına uygulanır.
-- Önce alt pozisyonlar, sonra üst pozisyonlar silinir (FK kısıtlaması nedeniyle).

-- 1. Mutfak alt pozisyonları (Commis I, II, III, Demi Chef, Chef de Partie)
DELETE FROM org_positions WHERE category = 'kitchen' AND level = 3;

-- 2. Mutfak orta kademe (Sous Chef, Pastry Chef, Butcher Chef)
DELETE FROM org_positions WHERE category = 'kitchen' AND level = 2
  AND title_en NOT IN ('Executive Chef', 'Executive Sous Chef');

-- 3. Mutfak üst yönetim (Executive Sous Chef, Executive Chef)
DELETE FROM org_positions WHERE title_en IN ('Executive Sous Chef', 'Executive Chef');

-- 4. Hijyen pozisyonları (Steward, Night Cleaner)
DELETE FROM org_positions WHERE category = 'hygiene';

-- 5. org_chart_dept_distribution ayarını güncelle (mutfak ve hijyen kaldırıldı)
UPDATE system_settings
SET value = '[{"name":"Servis (Restaurant)","percentage":35,"color":"#3282B8"},{"name":"Ziyafet (Banquet)","percentage":20,"color":"#FF9F1C"},{"name":"Bar & İçecek","percentage":15,"color":"#BBE1FA"},{"name":"Oda Servisi","percentage":10,"color":"#1B262C"},{"name":"Yönetim (Admin)","percentage":20,"color":"#E2E8F0"}]',
    updated_at = NOW()
WHERE key = 'org_chart_dept_distribution';

-- 6. org_chart_service_flow güncelle (mutfak ve hijyen adımları kaldırıldı)
UPDATE system_settings
SET value = '[{"step":1,"title":"Karşılama","description":"Hostess misafiri karşılar ve masaya yerleştirir.","highlight":true},{"step":2,"title":"Sipariş","description":"Captain veya Waiter siparişi alır, Sommelier şarap önerir.","highlight":false},{"step":3,"title":"Servis","description":"Busser masayı düzenler, Waiter servisi yapar.","highlight":false},{"step":4,"title":"İçecek","description":"Barmen içeceği hazırlar ve servis eder.","highlight":true}]',
    updated_at = NOW()
WHERE key = 'org_chart_service_flow';
