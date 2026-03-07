# Coolify ile Deploy

## Aynı projede App + Postgres (iki ayrı container)

Compose artık **yereldekiyle aynı** varsayılanları kullanıyor: kullanıcı `postgres`, şifre `518518Erkan`, veritabanı adı `royal_careerdb`. Böylece hem yerel hem Coolify aynı bağlantıyı kullanabilir.

### Coolify'da ilk kez veya şifre uyumsuzsa

1. **Postgres volume daha önce oluşturulduysa** (logda "Skipping initialization" görüyorsanız) Postgres ilk açılışta kullandığı şifre hâlâ geçerli; yeni `POSTGRES_PASSWORD` okunmaz. İki seçenek:
   - **A)** Coolify'da Postgres servisinin **volume'unu silin**, sonra projeyi yeniden deploy edin. Bu sefer Postgres `POSTGRES_PASSWORD=518518Erkan` ve `POSTGRES_DB=royal_careerdb` ile ilklenecek; uygulama da aynı değerlerle bağlanacak.
   - **B)** Mevcut Postgres şifresini değiştirmeyin; Coolify'da **Application** → Environment Variables'a gidip `DATABASE_URL` veya `DB_PASSWORD` + `DB_NAME` değerlerini, Postgres sayfasında gördüğünüz kullanıcı/şifre/veritabanı ile aynı yapın.

2. **Proje ilk kez deploy ediliyorsa** compose'taki varsayılanlar (`518518Erkan`, `royal_careerdb`) kullanılır; ekstra env tanımlamanıza gerek yok. Sadece deploy edin.

3. İsterseniz Coolify'da tüm proje için şu env'leri tek yerde tanımlayabilirsiniz (opsiyonel; varsayılanlar zaten bunlar):
   - `POSTGRES_DB=royal_careerdb`
   - `POSTGRES_PASSWORD=518518Erkan`
   - `DB_NAME=royal_careerdb`
   - `DB_PASSWORD=518518Erkan`

---

## Veritabanı bağlantı hatası: "password authentication failed for user postgres"

Bu hata, uygulama container'ının PostgreSQL'e **varsayılan** kullanıcı/şifre (`postgres` / `postgres`) ile bağlanmaya çalıştığını gösterir. Coolify’da oluşturduğunuz PostgreSQL’in kullanıcı ve şifresi farklıdır; bu yüzden **mutlaka** doğru bağlantı bilgisini environment olarak vermeniz gerekir.

### Çözüm: DATABASE_URL tanımlayın

1. Coolify’da **Application** → ilgili servis → **Environment Variables** bölümüne gidin.
2. **DATABASE_URL** değişkenini ekleyin (veya düzenleyin).
3. Değer olarak Coolify’da oluşturduğunuz **PostgreSQL** servisinin bağlantı bilgisini kullanın.

Coolify’da veritabanı oluşturduğunuzda genelde şu formatta bir connection string verilir:

```text
postgresql://KULLANICI:SIFRE@HOST:5432/VERITABANI_ADI
```

Örnek (Coolify’ın gösterdiği Internal URL’i kullanın):

```text
postgresql://coolify_user:rastgele_uretilen_sifre@10.0.9.2:5432/coolify_db
```

- **KULLANICI / SIFRE:** Coolify’ın o veritabanı için gösterdiği kullanıcı ve şifre.
- **HOST:** Aynı ağdaki veritabanı container’ı için Coolify’da gösterilen host (ör. `db` veya bir iç IP).
- **VERITABANI_ADI:** Veritabanı adı.

Bu değeri **DATABASE_URL** olarak kaydedin; uygulama hem migration hem normal çalışma için bunu kullanır.

### Alternatif: DB_* değişkenleri

DATABASE_URL yerine ayrı ayrı da verebilirsiniz:

| Değişken     | Açıklama        | Örnek        |
|-------------|-----------------|--------------|
| `DB_HOST`   | PostgreSQL host | `db` veya IP |
| `DB_PORT`   | Port            | `5432`       |
| `DB_NAME`   | Veritabanı adı  | `fb_careerdb` |
| `DB_USER`   | Kullanıcı       | Coolify’daki kullanıcı |
| `DB_PASSWORD` | Şifre         | Coolify’daki şifre     |

Bu durumda entrypoint script’i bunlardan `DATABASE_URL` üretir.

### Kontrol

- Deploy sonrası loglarda şunu görmelisiniz:  
  `>>> Using database: postgresql://***@HOST:5432/...`  
  (Şifre maskelenir.)
- Hâlâ "password authentication failed for user postgres" alıyorsanız:
  - Coolify’da bu uygulama için tanımlı **Environment** içinde gerçekten **DATABASE_URL** (veya **DB_USER** / **DB_PASSWORD**) var mı kontrol edin.
  - Veritabanı servisinin kullanıcı/şifre bilgisini Coolify arayüzünden tekrar kopyalayıp DATABASE_URL’e yapıştırın (önde/sonda boşluk, tırnak olmasın).
