-- F&B Yönetim Kadrosu Eksik Pozisyonları
-- F&B Müdürü, Müdür Yardımcısı, Asistanı + Mutfak Müdürü, Restoran Şefi vb.

INSERT INTO "position_templates" ("title", "title_en", "description", "category", "level", "authority_score", "guest_interaction", "team_size", "skills", "sort_order", "updated_at") VALUES

-- ═══════════════════════════════════════════
-- F&B YÖNETİM HİYERARŞİSİ
-- ═══════════════════════════════════════════
(
  'F&B Müdürü',
  'F&B Manager',
  'Yiyecek-içecek operasyonlarının günlük yönetiminden sorumlu üst düzey yönetici. Bütçe takibi, personel yönetimi, kalite kontrol ve misafir memnuniyetini sağlar. F&B Direktörüne bağlı çalışır.',
  'management', 2, 88, 60, 1,
  '{"management":92,"technical":78,"social":82,"physical":40,"crisis":88}',
  4, NOW()
),
(
  'F&B Müdür Yardımcısı',
  'Assistant F&B Manager',
  'F&B Müdürünün yokluğunda operasyonları yönetir. Vardiya planlaması, günlük raporlama ve departmanlar arası koordinasyonu üstlenir.',
  'management', 2, 75, 55, 1,
  '{"management":80,"technical":72,"social":75,"physical":45,"crisis":78}',
  6, NOW()
),
(
  'F&B Asistanı',
  'F&B Assistant',
  'F&B yönetim ekibine operasyonel ve idari destek sağlar. Sipariş takibi, stok kontrolü, raporlama ve saha koordinasyonunda görev alır.',
  'management', 3, 35, 30, 1,
  '{"management":45,"technical":55,"social":50,"physical":40,"crisis":40}',
  7, NOW()
),
(
  'F&B Kalite Kontrol Sorumlusu',
  'F&B Quality Controller',
  'Tüm yiyecek-içecek noktalarında hijyen, sunum ve servis standartlarını denetler. HACCP uyumluluğu ve kalite raporlamasından sorumludur.',
  'management', 2, 65, 20, 1,
  '{"management":60,"technical":90,"social":45,"physical":50,"crisis":70}',
  8, NOW()
),

-- ═══════════════════════════════════════════
-- MUTFAK YÖNETİM
-- ═══════════════════════════════════════════
(
  'Mutfak Müdürü',
  'Kitchen Manager',
  'Mutfak operasyonlarının idari ve lojistik yöneticisi. Personel planlaması, maliyet kontrolü, tedarikçi ilişkileri ve mutfak bütçesinden sorumludur. Aşçıbaşı ile koordineli çalışır.',
  'kitchen', 2, 78, 10, 1,
  '{"management":85,"technical":70,"social":55,"physical":45,"crisis":80}',
  49, NOW()
),
(
  'Mutfak Şefi Yardımcısı',
  'Assistant Kitchen Manager',
  'Mutfak Müdürüne operasyonel destek sağlar. Vardiya düzeni, günlük üretim planlaması ve personel devam takibinden sorumludur.',
  'kitchen', 2, 60, 5, 1,
  '{"management":65,"technical":68,"social":45,"physical":55,"crisis":65}',
  48, NOW()
),

-- ═══════════════════════════════════════════
-- RESTORAN YÖNETİM
-- ═══════════════════════════════════════════
(
  'Restoran Şefi',
  'Restaurant Supervisor',
  'Restoran servis ekibinin saha amiri. Servis kalitesini denetler, personel performansını takip eder ve misafir şikayetlerini çözer.',
  'service', 2, 60, 85, 2,
  '{"management":65,"technical":70,"social":85,"physical":65,"crisis":70}',
  9, NOW()
),
(
  'Restoran Müdür Yardımcısı',
  'Assistant Restaurant Manager',
  'Restoran Müdürünün yokluğunda operasyonları yönetir. Rezervasyon yönetimi, personel eğitimi ve günlük kapanış raporlarından sorumludur.',
  'service', 2, 70, 80, 1,
  '{"management":78,"technical":75,"social":82,"physical":60,"crisis":78}',
  8, NOW()
),

-- ═══════════════════════════════════════════
-- BAR YÖNETİM
-- ═══════════════════════════════════════════
(
  'Bar Müdür Yardımcısı',
  'Assistant Bar Manager',
  'Bar Müdürüne operasyonel destek sağlar. Stok sayımı, kokteyl menüsü güncellemesi ve bar ekibinin vardiya düzeninden sorumludur.',
  'bar', 2, 60, 80, 1,
  '{"management":65,"technical":80,"social":78,"physical":55,"crisis":60}',
  19, NOW()
),

-- ═══════════════════════════════════════════
-- ZİYAFET YÖNETİM
-- ═══════════════════════════════════════════
(
  'Ziyafet Müdür Yardımcısı',
  'Assistant Banquet Manager',
  'Ziyafet Müdürüne etkinlik planlaması ve koordinasyonunda destek olur. Etkinlik detaylarının sahada uygulanmasını takip eder.',
  'banquet', 2, 65, 65, 1,
  '{"management":70,"technical":65,"social":72,"physical":60,"crisis":70}',
  29, NOW()
)

ON CONFLICT ("title") DO NOTHING;
