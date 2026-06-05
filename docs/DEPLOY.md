# Deploy Kajie Saweria Donate Effect

## 1. Upload ke GitHub

Buat repository baru, lalu upload semua file dari zip ini.

## 2. Install dependency lokal

```bash
npm install
```

## 3. Login Wrangler

```bash
npx wrangler login
```

## 4. Buat KV

```bash
npx wrangler kv namespace create KAJIE_DONATION_KV
```

Masukkan ID ke `wrangler.toml`.

## 5. Masukkan secret

```bash
npx wrangler secret put ROBLOX_API_KEY
npx wrangler secret put ROBLOX_UNIVERSE_ID
npx wrangler secret put SAWERIA_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TEST_SECRET
npx wrangler secret put MIN_EFFECT_AMOUNT
```

Rekomendasi:

```txt
MIN_EFFECT_AMOUNT = 10000
```

## 6. Deploy

```bash
npm run deploy
```

## 7. Test dashboard

Buka URL Worker:

```txt
https://nama-worker.username.workers.dev/
```

Isi:

```txt
Admin/Test Secret = ADMIN_TEST_SECRET
Username = KajieFans
Nominal Donate = 50000 / 100000 / 250000
Message = Mantap Kajie!
```

Klik `Kirim Test ke Roblox`.

## 8. Pasang webhook Saweria

Gunakan URL:

```txt
https://nama-worker.username.workers.dev/saweria-webhook/SAWERIA_WEBHOOK_SECRET
```
