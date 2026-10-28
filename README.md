# USTA. — Berber Rezervasyon Sistemi

Next.js App Router, Auth.js v5, Prisma 7 ve PostgreSQL ile Türkçe berber rezervasyonu. Vanilla CSS ile koyu/altın tema; Leaflet + OpenStreetMap ile konum seçimi ve keşif.

## Yerel kurulum

Node.js 22.14+ ve PostgreSQL 17+ kullanın.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

`.env` içindeki `AUTH_SECRET` değerini rastgele bir secret ile değiştirin (`npx auth secret` kullanılabilir). `DATABASE_URL` Docker Compose için örnek dosyada hazırdır. Kendi PostgreSQL/Supabase bağlantınızı da kullanabilirsiniz. Migration kullanıcısının `btree_gist` eklentisini oluşturma yetkisi olmalıdır; yoksa DBA tarafından önceden oluşturulmalıdır.

Docker olmadan yerel PostgreSQL:

```powershell
npm run db:local
```

Komutun verdiği **postgres://** bağlantısını `.env` içindeki `DATABASE_URL` alanına yazın, ardından generate/migrate komutlarını çalıştırın. `npx prisma dev ls` ile yerel sunucuyu inceleyebilir, `npx prisma dev start berber-local` ile tekrar başlatabilirsiniz. Prisma Dev geliştirme içindir; üretimde yönetilen PostgreSQL kullanın.

Örnek işletmeler isteğe bağlıdır:

```powershell
npm run db:seed
```

Seed tekrar çalıştırılabilir; var olan kayıtları değiştirmez. Üç işletmenin adı ve açıklaması **Demo** olarak işaretlenir. Bunlar gerçek işletme değildir. Geliştirme girişi açıkken `demo-owner@example.com` ile demo işletmeleri yönetebilirsiniz. Üretimde seed çalıştırmayın.

## Google girişi

Google Cloud Console’da OAuth istemcisini **Web application** olarak oluşturun. Yetkili callback adresleri:

```text
http://localhost:3000/api/auth/callback/google
https://ALAN-ADINIZ/api/auth/callback/google
```

`AUTH_GOOGLE_ID` ve `AUTH_GOOGLE_SECRET` değerlerini `.env` dosyasına ekleyin. `AUTH_URL` yalnızca uygulamanın kök adresi olmalıdır; `/giris`, `/tr` veya callback yolu eklemeyin. Alan adı/tünel kullanıldığında tarayıcıdan aynı kök adresle erişin; yazma API’leri Origin değerini bu adresle karşılaştırır. Yereldeki farklı kökten API çağrısı 403 alır.

Test amacıyla `AUTH_DEV_LOGIN=true` kullanılabilir. Bu seçenek yalnızca `NODE_ENV=development` iken sağlayıcı oluşturur; üretimde açık bırakılsa bile giriş sağlayıcısı eklenmez. **İnternete açık geliştirme sunucusunda kapalı tutun.** Normal kullanımda Google girişini kullanın. Google kullanıcıları otomatik kaydedilir; işletme oluşturunca rol OWNER olur. Aynı kişi müşteri olarak da rezervasyon yapabilir ve birden fazla işletme yönetebilir.

## Ekranlar ve davranış

| Adres            | İşlev                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `/`              | Landing, işletme keşfi, işletme kayıt yönlendirmesi                                                   |
| `/kesfet`        | Ad/hizmet/şehir/ilçe arama, favoriler, açık işletmeler, konuma göre mesafe, liste/harita              |
| `/berber/[slug]` | Vitrin, hizmetler, ustalar, saatler, doğrulanmış yorumlar ve rezervasyon                              |
| `/randevularim`  | Kişisel randevular, iptal, yorum, iletişim telefonu                                                   |
| `/panel/kurulum` | İşletme bilgileri, harita pini ve kurulum                                                             |
| `/panel`         | İşletme seçimi, günlük usta takvimi, hizmet/usta/saat/mola yönetimi, uzaklaştırmalar, abonelik durumu |

Vitrin ve usta fotoğrafları herkese açık HTTPS görsel adresleriyle eklenir. Harita konumu tıklayarak, pin sürükleyerek, koordinat girerek veya tarayıcı konumuyla seçilir. Geocoding/adres arama servisi ve dosya yükleme servisi bu sürüme dahil değildir.

Randevu akışı hizmet, usta (veya “fark etmez”), tarih ve saat seçimiyle ilerler. Giriş gerekirse seçimler callback URL’sinde korunur. Her onayda sunucu uygunluğu tekrar hesaplar. Fiyat ve hizmet adı randevuya kopyalanır; katalog değişince geçmiş kayıtlar değişmez.

## İş kuralları ve güvenlik

- Tüm takvim günleri `Europe/Istanbul` saat dilimindedir. 30 günlük rezervasyon penceresi ve aynı gün için 15 dakika hazırlık payı vardır.
- Dükkân saatleri, ustaya özel saatler, kapalı günler, tarihli molalar ve mevcut randevular birlikte hesaplanır. Gece yarısını aşan vardiyalar desteklenmez.
- Aktif `PENDING / CONFIRMED` kayıtlar için müşteri + tarih üzerinde **partial unique index** bulunur. Aynı müşteri farklı dükkânlarda da aynı gün yalnızca bir aktif randevu alabilir.
- PostgreSQL **GiST exclusion constraint**, iptal edilmemiş aynı usta randevularının `[startsAt, endsAt)` aralıklarında çakışmasını engeller. Bitişle aynı dakikada sonraki hizmet başlayabilir.
- Rezervasyon ve yönetim işlemleri Serializable transaction ve sınırlı retry kullanır. DB kısıtları doğrudan DB yazımlarında da saat çakışmasını engeller.
- Müşteri kendi aktif randevusunu en geç iki saat önce iptal eder. İşletme sahibi kendi randevularını yönetir. Başkasına ait işletme/kayıt kimliği yetki sağlamaz.
- Tamamlandı/Gelmedi işlemleri randevu bitmeden yapılamaz. “Gelmedi” işleminde 3/7/30 gün veya süresiz uzaklaştırma uygulanabilir. Kısıtlama dükkâna özeldir; panelden kaldırılır. Mevcut gelecek randevular otomatik iptal edilmez; işletmeci bunları ayrıca yönetebilir.
- Yorum yalnızca müşterinin tamamlanan randevusuna eklenir; randevu başına tek yorum, 1–5 puan.
- Yazma API’leri oturum ve aynı-origin doğrulaması yapar. İstek alanları Zod ile doğrulanır. Google hesabına tehlikeli otomatik e-posta bağlama açılmaz.
- Takvim açık sekmede 30 saniyede bir güncellenir. Saat ve personel değişikliklerinin mevcut gelecek randevuları geçersiz kılmasına izin verilmez.

## Bildirim altyapısı (opsiyonel)

Randevu işleminde müşteri ve işletme sahibi için onay/1 saat önce hatırlatma işleri kalıcı outbox’a eklenir. SMS/WhatsApp gönderimi için kendi sağlayıcı köprünüzün URL ve secret değerlerini tanımlayın:

```dotenv
NOTIFICATION_WEBHOOK_URL=https://your-provider-bridge.example/notifications
NOTIFICATION_WEBHOOK_SECRET=YOUR_PROVIDER_SECRET
CRON_SECRET=YOUR_RANDOM_CRON_SECRET
```

Zamanlayıcınız her dakika `POST /api/cron/notifications` isteğini `Authorization: Bearer CRON_SECRET` başlığıyla göndermelidir. **GET desteklenmez**; buna göre bir cron hizmeti kullanın. Sağlayıcı köprüsüne gönderilen JSON; iş kimliği, tür, alıcı adı/e-postası/telefonu ve randevu özeti içerir. `Idempotency-Key` başlığını köprüde uygulayın. İşler lease ile sahiplenilir, başarısız gönderimler 5 dakika sonra en fazla 5 kez denenir. İptal edilmiş veya geçmiş randevular atlanır. En az bir kez teslim semantiği vardır; sağlayıcının idempotency desteği yinelenen mesajları önler.

Gerçek SMS/WhatsApp sağlayıcısı ve zamanlayıcı yapılandırılmadıkça **mesaj gönderilmez**. Webhook yapılandırılmadan cron 503 döner. Bu repo bir operatör hesabı veya ücretli mesaj kredisi içermez. İşletmeci de `/randevularim` ekranından kendi iletişim numarasını kaydedebilir.

Bağımlılık notu: `deepmerge-ts` ve `mysql2` için güvenlik düzeltmeli override sürümleri sabitlendi. Üretim bağımlılık taraması temizdir. Lint araçlarının `braces → micromatch → fast-glob` zincirinde henüz yamalanmamış geliştirme bağımlılığı uyarıları vardır; `npm audit fix --force` ile Next.js sürümünü düşürmeyin.

## Abonelik hazırlığı

Yeni işletme için 14 günlük deneme kaydı oluşturulur. Subscription modeli sağlayıcı müşteri/abonelik kimlikleri, durum ve dönem sonunu saklayabilir. Landing ve panel görünümü hazırdır. Stripe/Iyzico ödeme alımı, webhook doğrulaması ve ücretli plan erişim kısıtları **henüz etkin değildir**; kart bilgisi alınmaz ve deneme süresi dolunca erişim kesilmez.

## Doğrulama

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Entegrasyon testleri açık PostgreSQL üzerinde benzersiz test kullanıcıları/işletmeleri oluşturup yalnızca kendi kayıtlarını temizler. Slot çakışmaları, eşzamanlı istekler, günlük limit, yetki sınırları, iptal penceresi, fiyat snapshot’ı, mola ve uzaklaştırma davranışlarını doğrular.

E2E için seed çalıştırın ve test girişini yalnızca loopback’te açın. Ayrı bir PowerShell terminalinde:

```powershell
$env:AUTH_URL='http://127.0.0.1:3002'
$env:AUTH_DEV_LOGIN='true'
$env:NEXT_DIST_DIR='.local/next-e2e'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3002
```

Diğer terminalde:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3002'
npx playwright install chromium
npm run test:e2e
```

E2E; masaüstü/mobil taşma, harita/filtre, müşteri giriş/rezervasyon/iptal/favori, işletme kurulumu/hizmet/usta, yetkisiz ve farklı-origin istekleri kontrol eder. Ekran görüntüleri `test-results/` altındadır. Gerçek Google OAuth consent ve gerçek mesaj teslimatı harici hesaplarla ayrıca doğrulanmalıdır.

## Kaynaklar

- [Prisma 7 PostgreSQL adapter kurulumu](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Auth.js / Prisma / Next.js entegrasyonu](https://docs.prisma.io/docs/guides/authentication/authjs/nextjs)
- [OpenStreetMap tile kullanım politikası](https://operations.osmfoundation.org/policies/tiles/)

Harita standart OSM tile sunucusunu kullanır. Yüksek trafikte politikaya uygun bir tile sağlayıcısı seçin. Ekranlar gerçek DB kayıtlarını gösterir; seed dışında sahte puan, yorum veya doluluk üretilmez.
