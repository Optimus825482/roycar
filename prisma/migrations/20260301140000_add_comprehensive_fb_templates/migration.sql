-- Kapsamlı F&B Pozisyon Şablonları
-- Mevcut 16 kayda (ID 1-16) ek olarak yeni pozisyonlar eklenir.
-- ON CONFLICT (title) DO NOTHING ile idempotent çalışır.

INSERT INTO "position_templates" ("title", "title_en", "description", "category", "level", "authority_score", "guest_interaction", "team_size", "skills", "sort_order", "updated_at") VALUES

-- ═══════════════════════════════════════════
-- YÖNETİM (management) - sort_order 2-5
-- ═══════════════════════════════════════════
(
  'Asistan F&B Direktörü',
  'Assistant F&B Director',
  'F&B Direktörüne doğrudan bağlı olarak tüm yiyecek-içecek operasyonlarının koordinasyonunu sağlar. Stratejik kararların sahada uygulanmasını takip eder ve departmanlar arası iletişimi yönetir.',
  'management', 2, 90, 40, 1,
  '{"management":90,"technical":75,"social":80,"physical":35,"crisis":85}',
  2, NOW()
),
(
  'F&B Koordinatörü',
  'F&B Coordinator',
  'Yiyecek-içecek departmanının idari süreçlerini ve operasyonel planlamasını koordine eder. Raporlama, toplantı organizasyonu ve birimler arası iş akışını düzenler.',
  'management', 2, 60, 30, 1,
  '{"management":70,"technical":65,"social":60,"physical":30,"crisis":55}',
  3, NOW()
),
(
  'F&B Sekreteri',
  'F&B Secretary',
  'F&B yönetim ekibinin yazışma, dosyalama ve randevu takibi gibi idari destek işlerini yürütür. Departman içi evrak düzenini sağlar.',
  'management', 3, 25, 15, 1,
  '{"management":40,"technical":50,"social":45,"physical":20,"crisis":30}',
  5, NOW()
),

-- ═══════════════════════════════════════════
-- MUTFAK (kitchen) - sort_order 50-69
-- ═══════════════════════════════════════════
(
  'Aşçıbaşı',
  'Executive Chef',
  'Mutfak operasyonlarının en üst düzey yöneticisi. Menü geliştirme, maliyet kontrolü, hijyen standartları ve tüm mutfak ekibinin liderliğinden sorumludur.',
  'kitchen', 1, 95, 15, 1,
  '{"management":90,"technical":98,"social":60,"physical":50,"crisis":90}',
  50, NOW()
),
(
  'Sous Chef',
  'Sous Chef',
  'Aşçıbaşının sağ kolu olarak mutfak operasyonlarının günlük yönetimini üstlenir. Vardiya planlaması, kalite kontrolü ve ekip eğitiminden sorumludur.',
  'kitchen', 2, 80, 10, 1,
  '{"management":75,"technical":95,"social":55,"physical":60,"crisis":85}',
  51, NOW()
),
(
  'Kısım Şefi',
  'Chef de Partie',
  'Mutfakta belirli bir kısmın (station) sorumluluğunu taşır. Kendi ekibini yönetir ve o kısımdaki yemeklerin kalite standardını korur.',
  'kitchen', 2, 55, 5, 3,
  '{"management":50,"technical":90,"social":40,"physical":70,"crisis":65}',
  52, NOW()
),
(
  'Saucier',
  'Sauce Chef',
  'Sos hazırlama ve sote yemeklerden sorumlu mutfak pozisyonu. Klasik ve modern sos tekniklerinde uzmandır.',
  'kitchen', 3, 40, 5, 2,
  '{"management":30,"technical":92,"social":30,"physical":75,"crisis":55}',
  53, NOW()
),
(
  'Poissonnier',
  'Fish Chef',
  'Deniz ürünleri ve balık yemeklerinin hazırlanmasından sorumludur. Taze ürün seçimi, porsiyonlama ve pişirme tekniklerinde uzmandır.',
  'kitchen', 3, 40, 5, 2,
  '{"management":30,"technical":90,"social":30,"physical":75,"crisis":55}',
  54, NOW()
),
(
  'Rôtisseur',
  'Roast Chef',
  'Izgara, fırın ve kızartma yemeklerinin hazırlanmasından sorumludur. Et pişirme dereceleri ve marinasyon tekniklerinde uzmandır.',
  'kitchen', 3, 40, 5, 2,
  '{"management":30,"technical":88,"social":30,"physical":80,"crisis":55}',
  55, NOW()
),
(
  'Garde Manger',
  'Cold Kitchen Chef',
  'Soğuk mutfak kısmını yönetir. Salatalar, soğuk mezeler, charcuterie ve dekoratif yemek sunumlarından sorumludur.',
  'kitchen', 3, 40, 5, 3,
  '{"management":30,"technical":85,"social":30,"physical":65,"crisis":45}',
  56, NOW()
),
(
  'Pâtissier',
  'Pastry Chef',
  'Pastane ve tatlı üretiminin sorumlusu. Tatlı menüsü geliştirme, ekmek çeşitleri ve özel organizasyon pastaları hazırlar.',
  'kitchen', 2, 50, 10, 3,
  '{"management":45,"technical":95,"social":35,"physical":60,"crisis":50}',
  57, NOW()
),
(
  'Entremetier',
  'Vegetable Chef',
  'Sebze yemekleri, çorbalar, yumurta yemekleri ve garnitürlerden sorumlu mutfak pozisyonu. Temel pişirme tekniklerinde deneyimlidir.',
  'kitchen', 3, 35, 5, 2,
  '{"management":25,"technical":82,"social":25,"physical":75,"crisis":45}',
  58, NOW()
),
(
  'Tournant',
  'Relief Cook',
  'Mutfaktaki farklı kısımlarda dönüşümlü olarak görev alır. Tüm istasyonlarda çalışabilecek esnekliğe ve teknik bilgiye sahiptir.',
  'kitchen', 3, 30, 5, 1,
  '{"management":20,"technical":80,"social":30,"physical":80,"crisis":60}',
  59, NOW()
),
(
  'Commis',
  'Junior Cook',
  'Mutfakta temel hazırlık işlerini yapar ve kısım şeflerine destek olur. Mesleki gelişim sürecindeki aşçı adayıdır.',
  'kitchen', 3, 15, 5, 8,
  '{"management":10,"technical":55,"social":25,"physical":85,"crisis":30}',
  60, NOW()
),
(
  'Fırıncı',
  'Baker',
  'Ekmek, poğaça, pide ve hamur işi çeşitlerinin üretiminden sorumludur. Maya, hamur dinlendirme ve fırın tekniklerinde uzmandır.',
  'kitchen', 3, 30, 5, 2,
  '{"management":20,"technical":85,"social":25,"physical":70,"crisis":35}',
  61, NOW()
),
(
  'Bulaşıkçı',
  'Steward/Dishwasher',
  'Mutfak ve restoran ekipmanlarının temizliğini sağlar. Hijyen standartlarının korunması ve mutfak düzeninin sürdürülmesinde kritik rol oynar.',
  'kitchen', 3, 5, 0, 6,
  '{"management":5,"technical":15,"social":15,"physical":95,"crisis":15}',
  69, NOW()
),

-- ═══════════════════════════════════════════
-- SERVİS (service) - sort_order 17-18
-- ═══════════════════════════════════════════
(
  'Maître d''Hôtel',
  'Maître d''Hôtel',
  'Restoranın misafir deneyiminden birinci derecede sorumlu üst düzey servis yöneticisi. VIP misafir ilişkileri, servis koreografisi ve ekip koordinasyonunu yönetir.',
  'service', 2, 70, 95, 2,
  '{"management":75,"technical":70,"social":95,"physical":50,"crisis":75}',
  17, NOW()
),
(
  'Barista',
  'Barista',
  'Kahve ve sıcak içecek hazırlama uzmanı. Espresso bazlı içecekler, latte art ve kahve çeşitleri konusunda deneyimlidir.',
  'service', 3, 20, 85, 3,
  '{"management":10,"technical":75,"social":80,"physical":60,"crisis":30}',
  18, NOW()
),

-- ═══════════════════════════════════════════
-- BAR (bar) - sort_order 23
-- ═══════════════════════════════════════════
(
  'Baş Barmen',
  'Head Bartender',
  'Bar ekibinin kıdemli lideri. Kokteyl menüsü geliştirme, bar stok yönetimi ve barmen ekibinin eğitiminden sorumludur.',
  'bar', 2, 55, 90, 3,
  '{"management":55,"technical":90,"social":85,"physical":65,"crisis":55}',
  23, NOW()
),

-- ═══════════════════════════════════════════
-- ZİYAFET (banquet) - sort_order 33
-- ═══════════════════════════════════════════
(
  'Ziyafet Kurulum Ekibi',
  'Banquet Setup Crew',
  'Etkinlik ve ziyafet alanlarının fiziksel kurulumunu gerçekleştirir. Masa-sandalye düzeni, sahne kurulumu ve dekor yerleşiminden sorumludur.',
  'banquet', 3, 10, 20, 10,
  '{"management":10,"technical":30,"social":25,"physical":95,"crisis":20}',
  33, NOW()
),

-- ═══════════════════════════════════════════
-- ODA SERVİSİ (room_service) - sort_order 42-43
-- ═══════════════════════════════════════════
(
  'Minibar Görevlisi',
  'Minibar Attendant',
  'Otel odalarındaki minibar stoklarının kontrolü, yenilenmesi ve raporlamasından sorumludur. Misafir odalarına giriş protokollerine uyar.',
  'room_service', 3, 15, 60, 3,
  '{"management":10,"technical":35,"social":55,"physical":75,"crisis":20}',
  42, NOW()
),
(
  'Sipariş Alıcı',
  'Order Taker',
  'Oda servisi siparişlerini telefon veya dijital kanallardan alır. Menü bilgisi, misafir iletişimi ve sipariş doğruluğundan sorumludur.',
  'room_service', 3, 20, 85, 2,
  '{"management":15,"technical":40,"social":85,"physical":30,"crisis":35}',
  43, NOW()
)

ON CONFLICT ("title") DO NOTHING;
