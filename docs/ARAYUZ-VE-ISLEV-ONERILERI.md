# Arayüz ve İşlev Geliştirme Önerileri

**Tarih:** Mart 2025  
**Kapsam:** F&B Career System — UI/UX ve yeni/iyileştirilmiş işlevler

---

## 1. Arayüz (UI/UX) Önerileri

### 1.1 Genel

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Yüksek** | **Breadcrumb (Admin)** | Admin sayfalarında üst kısımda breadcrumb (örn. Dashboard > Başvurular > Detay). Özellikle Başvurular, On-eleme, Form Builder alt sayfalarında yönlendirmeyi kolaylaştırır. |
| **Yüksek** | **404 / Hata sayfaları marka ile uyumlu** | `not-found.tsx` ve `error.tsx` renkleri mr-navy / mr-gold ile; “Ana Sayfaya Dön” butonu mevcut stille. |
| **Orta** | **Empty state bileşeni** | Liste/tablo boş olduğunda ortak bir empty state (ikon + kısa metin + isteğe bağlı aksiyon). Başvurular, Aday Grupları, Chat oturumları vb. için kullanılabilir. |
| **Orta** | **Loading state tutarlılığı** | Uzun listelerde (başvurular, değerlendirme oturumları) sayfa içi skeleton/placeholder; `AppLoader`/`AppTableSkeleton` zaten var, tüm liste sayfalarında kullanımı yaygınlaştırılabilir. |
| **Düşük** | **Skip to content (erişilebilirlik)** | Body’nin hemen başında “İçeriğe atla” linki; klavye ile gezinmede sidebar’ı atlayıp ana içeriğe gitmeyi sağlar. |

### 1.2 Ana sayfa (Public)

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Orta** | **Açık pozisyon bilgisi** | “Şu anda açık pozisyon bulunmamaktadır” durumunda: form başlığı veya “Yakında açılacak pozisyonlar” gibi kısa bilgi; isteğe bağlı “Bildirim al” (e-posta) CTA. |
| **Düşük** | **Ana sayfada kısa “Nasıl çalışır?”** | 2–3 adım (Başvuru yap → Değerlendirme → Sonuç) ile görsel/ikon; yeni ziyaretçiler için netlik. |

### 1.3 Başvuru akışı (Public)

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Yüksek** | **İlerleme göstergesi** | Wizard’da adım sayısı ve “Adım 2 / 5” gibi net ilerleme; kullanıcının nerede olduğu ve ne kaldığı görünsün. |
| **Orta** | **Taslak kaydetme (isteğe bağlı)** | Uzun formlarda “Daha sonra devam et” ile anonim veya e-posta bazlı taslak; aynı cihazda veya link ile devam. |

### 1.4 Admin paneli

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Yüksek** | **Başvurular listesi: mobil görünüm** | Tablo yerine kart listesi (breakpoint’e göre) veya yatay kaydırma + sabit ilk sütun; mobilde okunabilirlik artar. |
| **Orta** | **Filtrelerin kalıcılığı** | Başvurular sayfasında durum/departman/tarih filtreleri URL query ile (örn. `?status=new&department=1`). Sayfa yenilense veya link paylaşılsa filtreler kalsın. |
| **Orta** | **Dashboard hızlı aksiyonlar** | “Son başvurular” 5–10 satır; “Yeni değerlendirme oturumu”, “Form yayınla” gibi kısayol butonları. |
| **Düşük** | **Sidebar’da aktif sayfa vurgusu** | Mevcut `pathname.startsWith` iyi; alt menü (örn. Form Builder > [form adı]) varsa onun da vurgulanması. |

---

## 2. Yeni veya Geliştirilecek İşlevler

### 2.1 Aday / başvuru sahibi tarafı

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Yüksek** | **Başvuru durumu sorgulama (public)** | Adaya başvuru sonrası verilen başvuru numarası + e-posta/telefon ile public bir sayfada (örn. `/basvuru/durum`) “Başvurum nerede?” sorgulaması. Sadece durum (Yeni, İncelendi, Ön eleme, Reddedildi, İşe alındı) gösterilir; detay açılmaz. |
| **Orta** | **“Açık pozisyonlardan haberdar ol”** | Ana sayfada veya ayrı formda e-posta toplama; yeni form yayınlandığında (veya periyodik) bilgilendirme e-postası. İsteğe bağlı: basit “abone” tablosu + cron/trigger. |

### 2.2 Admin işlevleri

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Yüksek** | **Toplu durum güncelleme** | Başvurular listesinde çoklu seçim (checkbox) + “Seçilenlere durum ata” (örn. İncelendi, Reddedildi). Tek tek sayfa açmadan hızlı işlem. |
| **Orta** | **Başvuru arama** | Ad, e-posta, başvuru numarası veya telefon ile arama (API’de `search` parametresi; Prisma `where` ile `OR` + `contains`). |
| **Orta** | **E-posta şablonları (ayarlar)** | SMTP zaten var; “Durum değişikliği” ve “Başvuru alındı” e-postaları için metin şablonu (subject + body) ayarlanabilir alan. Varsayılan metinler DB veya config’te. |
| **Düşük** | **Form şablonları / sürüm** | Form Builder’da “Şablondan oluştur” (boş, standart kariyer formu vb.); isteğe bağlı form sürümü (yayın geçmişi) ve geri alma. |
| **Düşük** | **Dashboard basit grafik** | Mevcut status dağılımı kartlarına ek olarak son 7/30 gün başvuru sayısı (çizgi/bar grafik); CSV/Excel export zaten mevcut. |

### 2.3 Raporlama ve dışa aktarma

| Öncelik | Öneri | Açıklama |
|--------|--------|----------|
| **Orta** | **Tarih aralığı ile export** | Başvurular veya değerlendirme listesinde “Tarih aralığı seç + Excel/PDF indir”; mevcut export’lara filtre eklenmesi. |
| **Düşük** | **Özet rapor (PDF)** | Dashboard’daki istatistikleri (toplam, durum dağılımı, departman) tek sayfa PDF olarak indirme. |

---

## 3. Öncelik Sıralaması (Uygulama sırası önerisi)

1. **Başvuru durumu sorgulama (public)** — Aday deneyimi, destek talebini azaltır.  
2. **Breadcrumb (admin)** — Navigasyon ve kullanıcı yönlendirmesi.  
3. **Başvurular: toplu durum güncelleme** — İş yükü azaltır.  
4. **404/error sayfaları marka uyumu** — Tutarlı görünüm.  
5. **Başvuru wizard’da ilerleme göstergesi** — UX netliği.  
6. **Başvurular listesi mobil görünüm** — Mobil kullanım.  
7. **Filtrelerin URL’de kalması** — Paylaşılabilir liste görünümleri.  
8. **Başvuru arama** — Hızlı erişim.  
9. **Empty state bileşeni** — Tutarlı boş liste deneyimi.  
10. **E-posta şablonları / “Bildirim al” / taslak** — İhtiyaca göre.

---

## 4. Teknik Notlar

- **Breadcrumb:** Next.js `usePathname()` ile segment’lere bölünüp, segment–label eşlemesi (örn. `basvurular` → “Başvurular”) bir config veya sözlükten okunabilir.  
- **Başvuru durumu sorgulama:** Yeni public route `GET /api/applications/status?applicationNo=XXX&email=YYY` (rate limit + sadece `status` ve genel bilgi döner).  
- **Toplu güncelleme:** `PATCH /api/admin/applications/bulk-status` body: `{ applicationIds: string[], status: string }`; yetki mevcut `requirePermission` ile.  
- **Filtre + URL:** Başvurular sayfasında `useSearchParams()` ile okuma, filtre değişince `router.push({ query })` ile güncelleme.

Bu öneriler mevcut mimari (Next.js App Router, Prisma, NextAuth, shadcn) ile uyumludur; ihtiyaca göre seçilip sırayla uygulanabilir.
