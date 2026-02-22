-- Merit Royal HR — Hazır Başvuru Formu (CSV sütunlarına uygun)
-- Bu form, mevcut CSV/XLSX verilerinin alındığı Google Form yapısını yansıtır.

INSERT INTO form_configs (id, title, mode, is_published, is_active, created_at, updated_at)
VALUES (100, 'Merit Royal İş Başvuru Formu', 'static', true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Diğer formları unpublish et (sadece 1 aktif form olabilir)
UPDATE form_configs SET is_published = false, is_active = false WHERE id != 100;
UPDATE form_configs SET is_published = true, is_active = true WHERE id = 100;

-- Sorular (CSV sütun sırasına uygun)
INSERT INTO questions (id, form_config_id, question_text, question_type, is_required, sort_order, options, created_at, updated_at) VALUES
(1001, 100, 'Adınız Soyadınız', 'text', true, 1, NULL, NOW(), NOW()),
(1002, 100, 'Bulunduğunuz Şehir', 'text', true, 2, NULL, NOW(), NOW()),
(1003, 100, 'Telefon Numaranız', 'text', true, 3, '{"placeholder": "05XX XXX XX XX"}', NOW(), NOW()),
(1004, 100, 'Başvurduğunuz Departman / Pozisyon', 'select', true, 4, '{"choices": ["Ön Büro", "Kat Hizmetleri", "Yiyecek & İçecek", "Mutfak", "Teknik Servis", "Güvenlik", "Spa & Wellness", "Satış & Pazarlama", "Muhasebe & Finans", "İnsan Kaynakları", "Bilgi Teknolojileri"]}', NOW(), NOW()),
(1005, 100, 'Lojman Talebiniz Var mı?', 'radio', true, 5, '{"choices": ["Evet", "Hayır"]}', NOW(), NOW()),
(1006, 100, 'Doğum Yeriniz', 'text', true, 6, NULL, NOW(), NOW()),
(1007, 100, 'Doğum Tarihiniz', 'date', true, 7, NULL, NOW(), NOW()),
(1008, 100, 'Cinsiyetiniz', 'radio', true, 8, '{"choices": ["Erkek", "Kadın"]}', NOW(), NOW()),
(1009, 100, 'E-posta Adresiniz', 'text', true, 9, '{"placeholder": "ornek@email.com"}', NOW(), NOW()),
(1010, 100, 'Baba Adı', 'text', false, 10, NULL, NOW(), NOW()),
(1011, 100, 'Anne Adı', 'text', false, 11, NULL, NOW(), NOW()),
(1012, 100, 'Okuduğunuz Bölüm', 'text', false, 12, NULL, NOW(), NOW()),
(1013, 100, 'Okuduğunuz Üniversite', 'text', false, 13, NULL, NOW(), NOW()),
(1014, 100, 'Staj Deneyiminiz', 'textarea', false, 14, '{"placeholder": "Staj yaptığınız yer ve süresini yazınız"}', NOW(), NOW()),
(1015, 100, 'Acil Durumlarda Başvurulacak Kişi', 'text', true, 15, '{"placeholder": "Ad Soyad - Telefon"}', NOW(), NOW()),
(1016, 100, 'Hakkınızda herhangi bir soruşturma var mı?', 'radio', true, 16, '{"choices": ["Evet", "Hayır"]}', NOW(), NOW()),
(1017, 100, 'Sabıka kaydınız var mı?', 'radio', true, 17, '{"choices": ["Evet", "Hayır"]}', NOW(), NOW()),
(1018, 100, 'Fotoğrafınızı Yükleyiniz', 'file', false, 18, '{"accept": "image/*", "maxSize": 5242880}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
