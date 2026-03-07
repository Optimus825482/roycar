# Coolify ile Deploy

## Aynı projede App + Postgres (iki ayrı container)

Uygulama ve PostgreSQL aynı projede ayrı container olarak deploy ediliyorsa, Coolify'ın veritabanı için ürettiği kullanıcı/şifre **uygulama container'ına** da geçmeli. `docker-compose.yaml` artık şu env'leri **dışarıdan** alacak şekilde ayarlı:

- `DATABASE_URL` veya `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Coolify'da yapmanız gereken:** Projede veritabanını uygulamaya **bağlayın** (link / connect database to application). Coolify bu bağlantıyı kurunca genelde `DATABASE_URL` (veya `DB_*`) değişkenlerini uygulama servisine otomatik enjekte eder. Böylece app container, Postgres container'ın gerçek kullanıcı/şifresiyle bağlanır. Bağlamayı yaptıktan sonra projeyi yeniden deploy edin.

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
