# Rol ve Yetki Sistemi — Kontrol Özeti

Bu belge, sistem yöneticisi tarafından kullanıcılara verilen yetkilerin (permissions) oturumlarda nasıl kullanıldığını ve yapılan kontrolleri özetler.

---

## 1. Yetki Kaynağı ve Oturuma Taşınması

- **Veritabanı:** `admin_users.permissions` (JSON) — Sistem yöneticisi Ayarlar > Kullanıcı Yönetimi üzerinden her kullanıcı için yetkileri işaretler.
- **Giriş:** `auth-credentials.ts` içinde `validateAdminCredentials` giriş sırasında kullanıcıyı ve `permissions` alanını okur.
- **JWT/Session:** NextAuth `mergeUserIntoToken` ile `permissions` token’a yazılır; `applyTokenToSession` ile `session.user.permissions` olarak oturuma taşınır.
- **Kullanım:** API route’larda `requirePermission("yetki_anahtari")` ile kontrol; arayüzde menü ve sekmeler yetkiye göre filtrelenir.

---

## 2. Yetki Anahtarları ve Karşılık Gelen Alanlar

| Yetki anahtarı    | Açıklama           | Menü / Sayfa / API grupları |
|-------------------|--------------------|-----------------------------|
| `form_builder`    | Form oluşturma     | Form Builder, form API’leri |
| `evaluations`     | Başvuru değerlendirme | On-eleme, Aday Grupları, evaluation-sessions, candidate-groups |
| `ai_chat`         | AI sohbet          | AI Asistan, chat sessions   |
| `screening`       | Ön eleme           | Screening API’leri         |
| `data_import`     | Veri aktarımı      | Veri Aktarımı, import API’leri |
| `import_delete`   | Aktarım silme      | Import log DELETE (veya data_import) |
| `settings`        | Ayarlar            | Ayarlar menüsü, settings API |
| `user_management` | Kullanıcı yönetimi | Ayarlar içi “Kullanıcı Yönetimi” sekmesi, users API’leri |

Dashboard, Başvurular ve Org Şeması menü öğeleri yetkiye bağlı değildir (giriş yapmış her admin görür). Başvurular ve applications API sadece `requireAuth()` ile korunur.

---

## 3. Yapılan Kontroller ve Düzeltmeler

### 3.1 Admin sidebar (layout)

- Menü öğeleri yetkiye göre filtrelenir: `Form Builder` → `form_builder`, `Başvuru Değerlendirme` ve `Aday Grupları` → `evaluations`, `AI Asistan` → `ai_chat`, `Veri Aktarımı` → `data_import`, `Ayarlar` → `settings`.
- Yetkisi olmayan kullanıcı ilgili menüyü görmez; doğrudan URL ile erişirse API 403 döner.

### 3.2 Ayarlar sayfası (Kullanıcı Yönetimi sekmesi)

- “Kullanıcı Yönetimi” sekmesi yalnızca `user_management` yetkisi olan kullanıcılara gösterilir (`useSession` + `visibleTabs` filtresi).
- Yetkisi olmayan kullanıcı bu sekmeyi görmez; `/api/admin/users` çağrıları zaten 403 döner.

### 3.3 API route’larda yetki kullanımı

- **Aday grupları:** `candidate-groups` GET → `requireAuth()`; POST → `requirePermission("evaluations")`. `candidate-groups/[id]` GET → `requireAuth()`; PATCH/DELETE → `requirePermission("evaluations")`. `candidate-groups/[id]/members` POST/DELETE → `requirePermission("evaluations")`.
- **Değerlendirme oturumları:** `evaluation-sessions` GET → `requireAuth()`; POST → `requirePermission("evaluations")`. `evaluation-sessions/[id]` GET → `requireAuth()`; PUT/DELETE → `requirePermission("evaluations")`. `evaluation-sessions/[id]/candidates` GET → `requireAuth()`; POST → `requirePermission("evaluations")`.
- **Diğer admin route’lar:** forms, settings, evaluations (batch, notes, retry, ai-assist), screening, import, chat, users — ilgili handler’larda zaten `requireAuth()` veya `requirePermission(...)` kullanılıyor; ek kontrol gerekmedi.

### 3.4 Tespit edilen ve giderilen eksiklikler

- **candidate-groups:** GET ve POST’ta önceden kimlik doğrulama yoktu; hem yetkisiz erişim hem yetkisiz işlem riski vardı. GET için `requireAuth()`, yazma işlemleri için `requirePermission("evaluations")` eklendi.
- **evaluation-sessions:** GET’te auth yoktu; POST’ta `auth()` kullanılıyordu ancak 401 dönmüyordu. GET için `requireAuth()`, POST için `requirePermission("evaluations")` eklendi.
- **evaluation-sessions/[id] ve [id]/candidates:** GET/PUT/DELETE ve candidates POST için uygun `requireAuth` / `requirePermission("evaluations")` eklendi.
- **Sidebar:** Tüm kullanıcılara tüm menü gösteriliyordu; yetkiye göre filtreleme eklendi.
- **Ayarlar “Kullanıcı Yönetimi” sekmesi:** Yetkisi olmayan kullanıcıya da görünüyordu; `user_management` yetkisine göre gizleme eklendi.

---

## 4. Özet

- Yetkiler veritabanından alınıp giriş sonrası oturuma (JWT/session) yazılıyor; API ve arayüz bu oturum bilgisiyle tutarlı çalışıyor.
- Eksik auth/permission kullanılan candidate-groups ve evaluation-sessions API’leri güvenli hale getirildi; sidebar ve Ayarlar sekmesi yetkiye göre filtreleniyor.
- Sistem yöneticisi, Ayarlar > Kullanıcı Yönetimi’nden kullanıcı bazında yetkileri güncelleyebilir; bir sonraki girişten itibaren yeni yetkiler geçerli olur.
