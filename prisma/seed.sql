-- Merit Royal HR — Seed Data

-- Departmanlar
INSERT INTO departments (name, sort_order, is_active, created_at)
VALUES
  ('F&B', 1, true, NOW()),
  ('Ön Büro', 2, true, NOW()),
  ('Mutfak', 3, true, NOW()),
  ('Kat Hizmetleri', 4, true, NOW()),
  ('Bellboy', 5, true, NOW()),
  ('Servis', 6, true, NOW()),
  ('Bar', 7, true, NOW()),
  ('Finans', 8, true, NOW()),
  ('Animasyon', 9, true, NOW()),
  ('Spa', 10, true, NOW()),
  ('Teknik Servis', 11, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Admin kullanıcı (password: MeritRoyal2026!)
-- bcrypt hash for MeritRoyal2026! with 12 rounds
INSERT INTO admin_users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
  'admin',
  'admin@meritroyal.com',
  '$2b$12$kGiNH.j42XZ2J0Nao.dy.Obwcn1DRsNf5/jebYjdNm7LiaV6JRw4K',
  'Sistem Yöneticisi',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO NOTHING;
