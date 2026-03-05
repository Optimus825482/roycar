# Merit Royal HR — Uygulama Analiz Raporu

**Tarih:** 5 Mart 2025  
**Kapsam:** İşlevsellik, performans, güvenlik, test altyapısı  
**Yöntem:** Backend, frontend, performans, güvenlik ve test uzmanlık alanlarında paralel analiz

---

## 1. Özet

Merit Royal HR (fb-career-system), Next.js 16 + Prisma + NextAuth ile geliştirilmiş bir kariyer/başvuru yönetim sistemidir. Analiz; API katmanı, veritabanı, frontend, performans, güvenlik ve test altyapısı üzerinde yapılmıştır.

**Güçlü yönler:**
- Next.js App Router, Prisma ile tip güvenliği, shadcn UI
- Apply endpoint’inde rate limit, upload güvenliği, path traversal önlemi
- Prisma singleton, uygun index’ler, ISR kullanımı

**Kritik iyileştirme alanları:**
- API’de Zod validasyonu ve tutarlı response formatı eksik
- RBAC yok; giriş yapmış her admin tüm admin API’lere erişebiliyor
- Unit/E2E test altyapısı yok
- react-hook-form ve Toaster kullanılmıyor; büyük sayfa dosyaları ve sınırlı lazy loading

---

## 1.1 Uygulama Durumu (Güncelleme)

Aşağıdaki iyileştirmeler uygulandı ve testler çalıştırıldı.

| # | Öneri | Durum | Not |
|---|--------|--------|-----|
| 1 | RBAC helper | ✅ | `src/lib/auth-helpers.ts`: `requireAuth()`, `requirePermission(permission)` |
| 2 | API validasyon (Zod) | ✅ | `src/lib/api-schemas.ts`: apply, admin user create/update şemaları; `POST /api/admin/users` Zod + requirePermission |
| 3 | Toaster | ✅ | Root layout’a `Providers` (ThemeProvider + Toaster) eklendi |
| 4 | Giriş rate limit | ✅ | Middleware: POST `/api/auth` için IP başına 10/dk limit |
| 5 | callbackUrl güvenliği | ✅ | `getSafeCallbackUrl()` — sadece `/` ile başlayan, `//` içermeyen path |
| 6 | Test altyapısı | ✅ | Vitest, jsdom, @testing-library/react, `test` / `test:watch` / `test:coverage` |
| 7 | Unit testler | ✅ | `utils.test.ts` (22), `api-schemas.test.ts` (8) — toplam 30 test geçiyor |

**Test sonucu:** `npm run test` → 30 passed.

**Bilinen aksaklık:** Windows’ta `output: "standalone"` ile build, köşeli parantezli chunk dosya adları nedeniyle copyfile hatası veriyor; production Linux ortamında sorun olmayabilir.

**Sonraki adımlar:** Diğer admin route’larda `requirePermission` ve Zod kullanımının yaygınlaştırılması; GET `/api/admin/users` için `requireAuth()`; E2E (Playwright) ve API integration testleri.

---

## 2. Backend Analizi

### 2.1 API Route’lar

| Özellik | Durum |
|--------|--------|
| Yapı | Next.js App Router, `src/app/api/` altında route handler’lar |
| Public API | `/api/apply`, `/api/apply/upload`, `/api/apply/active-form`, `/api/apply/form/[formConfigId]`, `/api/apply/qrcode`, `/api/departments`, `/api/org-chart`, `/api/uploads/[...path]` |
| Admin API | `/api/admin/*` (forms, applications, users, screening, evaluations, chat, import, org-chart, settings, candidate-groups, evaluation-sessions) |

**Bulgular:**
- Tutarlı REST/response formatı yok: kiminde `{ success, data }`, kiminde doğrudan `data`.
- Path parametreleri (`id`, `appId`, `formConfigId`) birçok yerde `safeBigInt` ile kontrol edilmiyor; geçersiz ID ile 500 riski.
- Auth: Bazı route’lar `await auth()` kullanıyor, bazıları sadece middleware’e güveniyor; tek tip değil.

### 2.2 Prisma Schema

**Artılar:** İlişkiler ve `onDelete` (Cascade/SetNull) tutarlı; applications, evaluations, screening_results vb. için index’ler mevcut; `@@map` ile snake_case tablo isimleri kullanılmış.

**Eksikler:**
- `AdminUser.permissions` JSON; tip güvenliği ve constraint yok.
- `Application.responseSummary`, `Evaluation.report` vb. JSON alanlar için şema seviyesinde kısıt yok.
- `role` string; enum veya check constraint yok, geçersiz değerler DB’ye yazılabilir.
- `DATABASE_URL` için uygulama başlangıcında kontrol yok; eksikte runtime hatası.

### 2.3 Servisler

Mevcut: `evaluation.service`, `screening.service`, `import.service`, `chat.service`, `email.service`, `memory.service`, `db-query.service`.

**Artılar:** `db-query.service` sadece SELECT/WITH, yasaklı pattern’ler, LIMIT, timeout ile SQL injection azaltılmış; iş mantığı route’lardan servislere taşınmış.

**Eksikler:** Route’lar bazen doğrudan Prisma kullanıyor; tam Controller → Service → Repository ayrımı yok. Hata yönetimi servislerde ortak değil (bazen throw, bazen `{ success, error }`).

### 2.4 Auth (NextAuth)

- NextAuth v5 (beta), Credentials provider, JWT, 30 dk session.
- Middleware: `/admin/*`, `/api/admin/*`, `POST /api/apply` korumalı; apply için IP bazlı rate limit (5/dk).
- bcrypt ile şifre karşılaştırma; production’da `NEXTAUTH_SECRET` yoksa throw; JWT’e `role`, `permissions`, `username` taşınıyor.

**Kritik:** RBAC yok. Giriş yapmış her admin tüm `/api/admin/*` endpoint’lerine erişebiliyor. Sadece `import/logs/[id]` DELETE’te `import_delete` / `data_import` kontrolü var.

### 2.5 Hata Yönetimi

- `apiError()` / `apiSuccess()` birçok route’ta kullanılıyor; BigInt serialize ediliyor.
- Merkezi API error handler yok; her route kendi try/catch ile `apiError(..., 500)` dönüyor.
- `catch` bloklarında sadece `console.error`; production’da stack/log aggregation yok.
- İstemciye jenerik mesaj; detay sadece log’ta; hata kodu (`code`) yok. Bazı yerde `JSON.parse` try/catch’siz.

### 2.6 Validasyon (Zod)

- **Zod package.json’da var ama API katmanında kullanılmıyor.** Validasyon manuel: `if (!x)`, regex (email), `safeBigInt(id)` vb.
- Body/query tipi ve formatı merkezi değil; hatalı body ile DB’ye yazma veya beklenmedik davranış riski.

---

## 3. Frontend Analizi

### 3.1 Next.js ve Route Yapısı

- Route groups: `(admin)` ve `(public)`; API `app/api/` altında.
- Root layout: Server Component; `next/font` (Playfair, Inter, Dancing Script), metadata, `globals.css`.
- Ana sayfa: Server Component, `getActiveForm()` async, `revalidate = 60` (ISR).
- Admin layout: Tamamı `"use client"` (SessionProvider, sidebar, state); server/client ayrımı zayıf.

### 3.2 Bileşenler ve State

- Çoğu sayfa ve form `"use client"`.
- UI: shadcn (new-york), 14 bileşen (button, card, dialog, dropdown-menu, input, label, select, separator, sonner, switch, table, tabs, textarea, badge).
- **react-hook-form ve @hookform/resolvers package.json’da var ama hiçbir yerde kullanılmıyor.** Giriş ve başvuru wizard tamamen `useState` + manuel validasyon.
- Server state: TanStack Query / SWR yok; veri `useEffect` + `fetch` ile alınıyor (cache, refetch, loading/error merkezi değil).

### 3.3 Kritik Bulgular

1. **Toaster mount yok:** Root layout’ta `<Toaster />` olmadığı için `toast()` çağrıları görünmeyebilir.
2. **Çok büyük sayfa dosyaları:** `on-eleme/[sessionId]/page.tsx` 2400+ satır, `chat/page.tsx` 1200+ satır; bakım ve chunk boyutu riski.
3. **Sınırlı dynamic import:** Sadece `react-easy-crop` (CameraPhotoCapture) ve `react-markdown` (chat); ağır admin bileşenleri lazy değil.
4. **Bundle ölçümü yok:** `@next/bundle-analyzer` kullanılmıyor.

---

## 4. Performans Analizi

### 4.1 Bundle

- Ağır bağımlılıklar: `jspdf`, `jspdf-autotable`, `xlsx`, `openai`, `react-easy-crop`, `react-markdown`, `papaparse` — main/route chunk’lara girebiliyor.
- `import.service` içinde `xlsx` ve `papaparse` statik import; veri aktarımı sayfası ilk açılışta bu kütüphaneleri çekiyor.

### 4.2 Core Web Vitals

- Root layout’ta 3 Google font (Playfair_Display, Inter, Dancing_Script), çoklu weight — FCP/LCP’yi etkileyebilir.
- LCP: Logo/hero için `next/image` + `priority` kullanılmış (iyi).
- **CLS riski:** 6 yerde ham `<img>` (ApplicationDetailModal foto, WizardContainer, ImageUploader, CameraPhotoCapture, opengraph); width/height veya aspect-ratio eksik olabilir.
- Production’da Web Vitals raporlama (next/script veya GTM) yok.

### 4.3 Lazy Loading ve Görsel Optimizasyonu

- Sadece 2 dynamic import (react-easy-crop, react-markdown). Ağır admin sayfaları (form-builder, on-eleme, veri-aktarimi) route bazlı ayrılmamış.
- `next/config`: `formats: ["image/avif", "image/webp"]` tanımlı. 6 dosyada ham `<img>` Next Image pipeline’ından geçmiyor.

### 4.4 API ve Veritabanı

- Route’larda süre log’u veya metrics yok; yavaş endpoint’ler tespit edilemiyor.
- Ağır adaylar: `GET /api/admin/applications` (filtre + derin include), `GET /api/admin/applications/[id]` (responses, evaluations, fieldValues, otherApplications).
- Prisma singleton kullanılıyor; N+1 yok. Applications list’te evaluations tam çekiliyor; sadece son skor gerekiyorsa `select` + `take: 1` veya ayrı aggregation önerilir.

---

## 5. Güvenlik Analizi

### 5.1 Auth ve RBAC

| Konu | Durum |
|------|--------|
| Admin auth | Middleware ile 401; route’da ek session kontrolü kısmen var. |
| RBAC | Sadece import delete’te permission kontrolü; diğer admin işlemlerde yok. |
| Rate limit | Sadece POST `/api/apply`. Admin ve diğer public endpoint’ler limitsiz. |
| Brute-force | Giriş sayfası için rate limit yok. |

### 5.2 Input ve XSS/CSRF

- Apply: email regex, zorunlu alan, upload’ta MIME + uzantı + 5MB.
- Zod API body’lerde kullanılmıyor; `role`, `permissions` vb. şema ile doğrulanmıyor.
- `sanitizeInput` tanımlı ama kullanılmıyor; kullanıcı metinleri doğrudan render edilebiliyor.
- `dangerouslySetInnerHTML` yok. CSRF: SameSite cookie ile risk az; CSP header’ları yok.

### 5.3 Env ve API Güvenliği

- `.gitignore`’da `.env*` var; production’da secret yoksa hata var.
- `.env.example` yok; hangi değişkenlerin gerekli olduğu dokümante değil.
- `/api/uploads/[...path]`: path traversal engellenmiş; upload tipi ve boyut sınırları apply’da var, import’ta boyut belirsiz.

### 5.4 SQL ve Open Redirect

- Raw SQL: `validateSql` + `db-query.service` (SELECT-only, timeout, LIMIT); `$queryRawUnsafe` kullanımı devam ediyor.
- Giriş sonrası `callbackUrl` query’den alınıyor; sadece güvenli path’lere kısıtlanmıyor (open redirect riski).

---

## 6. Test Altyapısı

| Öğe | Durum (güncel) |
|-----|--------|
| Unit test çerçevesi | ✅ Vitest + jsdom + @testing-library/react |
| E2E çerçevesi | Yok (Playwright/Cypress yok) |
| Test script | ✅ `test`, `test:watch`, `test:coverage` |
| Test dosyaları | ✅ `src/lib/utils.test.ts`, `src/lib/api-schemas.test.ts` (30 test) |
| Coverage | ✅ `vitest run --coverage` (v8) |

**Önerilen hedefler:** `src/lib` (utils ✅, api-schemas ✅, auth-helpers mock ile), `src/services`, API route’ları, bileşenler (WizardContainer, form-builder, UI); ardından E2E (giriş, başvuru, admin kritik sayfalar).

---

## 7. Geliştirme Önerileri (Öncelik Sıralı)

### 7.1 Yüksek Öncelik

| # | Alan | Öneri |
|---|------|--------|
| 1 | RBAC | Tüm admin API’lerde resource/aksiyona göre permission kontrolü (form_builder, user_management, evaluations, settings, data_import, import_delete). Yetkisi yoksa 403. |
| 2 | API validasyon | Tüm API body/query için Zod şemaları; route girişinde `parse`/`safeParse`, hatalarda 400 + tek tip `{ success, error, code? }`. Path param’lar için merkezi `safeBigInt`; geçersizse 400. |
| 3 | Toaster | Root `layout.tsx`’e `<Toaster />` (@/components/ui/sonner) ekleyin. |
| 4 | Form stratejisi | Ya react-hook-form + zod + @hookform/resolvers ile giriş ve wizard formlarını standartlaştırın ya da bu bağımlılıkları kaldırın. |
| 5 | Giriş rate limit | Giriş/Credentials callback için IP başına rate limit (örn. 5–10 deneme/dk). |
| 6 | callbackUrl | Giriş sonrası `callbackUrl`’i sadece güvenli path’lere kısıtlayın (örn. `/` ile başlayan, `//` ile başlamayan). |

### 7.2 Orta Öncelik

| # | Alan | Öneri |
|---|------|--------|
| 7 | Hata yönetimi | Merkezi API error handler (wrapper veya error boundary); log’a tam hata, client’a sabit formatta `{ success, error, code? }`. `JSON.parse` ve dış kaynaklı veriyi try/catch ile sar. |
| 8 | Server state | Liste/detay ve tekrarlayan fetch’ler için TanStack Query (veya SWR); loading/error/cache tek yerde. |
| 9 | Büyük sayfalar | `on-eleme/[sessionId]` ve `chat` sayfalarını mantıksal bileşenlere bölün; gerekenleri `dynamic(..., { ssr: false })` ile lazy yükleyin. |
| 10 | Lazy loading | Veri aktarımı sayfasında xlsx/papaparse’i dinamik import ile yükleyin. FormAiAssistant, EvaluationAiAssistant, jspdf/xlsx kullanan export bileşenleri için `dynamic()` kullanın. |
| 11 | Applications API | List’te evaluations’ı sadece son skor/status ile sınırlayın veya ayrı endpoint’e taşıyın; detayda gerekli include’ları tutun. |
| 12 | Admin rate limit | Admin API’de IP veya kullanıcı bazlı rate limit ekleyin. |
| 13 | Import upload | Dosya boyutu limiti koyun ve dokümante edin. |

### 7.3 Düşük Öncelik

| # | Alan | Öneri |
|---|------|--------|
| 14 | Prisma/DB | `AdminUser.role` için enum veya DB check constraint. Uygulama başlangıcında `DATABASE_URL` kontrolü; yoksa anlamlı hata ile çık. |
| 15 | Font | Sadece kullanılan weight’leri tanımlayın; isteğe bağlı font’u ilgili layout segment’inde lazy yükleyin. |
| 16 | Görseller | **Uygulandı.** Ham `<img>` kullanımlarına sabit width/height eklendi (WizardContainer, ImageUploader, CameraPhotoCapture, basvurular sayfası, ApplicationDetailModal). |
| 17 | CSP / headers | **Uygulandı.** `next.config.ts` headers: `X-Content-Type-Options: nosniff`, `Content-Security-Policy`. |
| 18 | XSS | Kullanıcı metinlerinde `sanitizeInput` veya güvenli HTML sanitizer kullanın. |
| 19 | Dokümantasyon | **Uygulandı.** Proje kökünde `.env.example` eklendi (AUTH_SECRET, DATABASE_URL, SMTP_*, AI key’leri vb.). |
| 20 | Bundle analiz | `@next/bundle-analyzer` ekleyip `ANALYZE=true npm run build` ile chunk dağılımını ölçün. |
| 21 | API süreleri | Kritik endpoint’lerde süre log’u (sampling ile); yavaş route’ları tespit edin. |
| 22 | Loading UX | `loading.tsx`’leri sayfa içeriğine uygun skeleton (liste, form, kart) ile değiştirin. |
| 23 | Admin layout | Mümkünse dış layout’u Server Component bırakıp sadece sidebar ve interaktif kısımları client component yapın. |

### 7.4 Test Altyapısı

| # | Öneri |
|---|--------|
| 24 | Vitest veya Jest + React Testing Library kurulumu; `test`, `test:watch`, `test:coverage` script’leri. |
| 25 | Öncelikli unit test: `src/lib/utils.ts`, `auth`, `export-utils`; servisler (evaluation, screening, import, email, chat, db-query) mock ile. |
| 26 | API/integration testleri: auth, apply, admin applications/forms/evaluations. |
| 27 | Bileşen testleri: WizardContainer, form-builder, kritik UI bileşenleri. |
| 28 | E2E (Playwright): giriş, başvuru formu, admin kritik sayfalar. |

---

## 8. Sonuç

Uygulama, modern stack (Next.js 16, Prisma, NextAuth, shadcn) ile işlevsel bir kariyer/başvuru sistemi sunuyor.

**Yapılan iyileştirmeler (bu turda):**
- RBAC helper (`requireAuth`, `requirePermission`) ve `/api/admin/users` POST’ta kullanımı.
- Zod şemaları (apply, admin user create/update) ve users POST’ta body validasyonu.
- Toaster + ThemeProvider root layout’ta; giriş sayfasında güvenli `callbackUrl`; giriş için rate limit (middleware).
- Vitest + RTL ile 30 unit test; `utils` ve `api-schemas` kapsanıyor.

**Öncelikli kalan adımlar:**
1. **Güvenlik:** Diğer admin route’larda `requirePermission` — **uygulandı** (forms, settings, evaluations, screening, import, chat).
2. **Tutarlılık:** Merkezi hata yanıtı (`apiError` + `handleRouteError`), form stratejisi (react-hook-form kaldırıldı) — **uygulandı**.
3. **Performans:** xlsx lazy load, applications `evaluations=latest`, görsel width/height — **uygulandı**; chat sayfası bölme ileride.
4. **Kalite:** API/integration testleri ve bileşen testleri eklendi; `.env.example` ve Windows build (`SKIP_STANDALONE=1`) — **uygulandı**. E2E (Playwright) sonraya bırakıldı.

Test altyapısı kurulduğu için yeni değişiklikler `npm run test` ile doğrulanabilir; aksayan kısımlar tespit edilip rapor güncellenebilir.
