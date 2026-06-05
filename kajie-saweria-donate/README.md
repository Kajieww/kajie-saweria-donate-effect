# Kajie Saweria Donate Effect

Project siap deploy untuk menghubungkan donasi Saweria ke Roblox dengan Cloudflare Workers.

Fitur utama:

- Web dashboard profesional untuk test donate effect.
- Input username, nominal donate, dan message.
- Level effect otomatis:
  - Level 1: Rp10.000 - Rp49.999
  - Level 2: Rp50.000 - Rp99.999
  - Level 3: Rp100.000 - Rp249.999
  - Level 4: Rp250.000 - tak terbatas
- Endpoint webhook Saweria.
- Anti duplicate donation ID memakai Cloudflare KV.
- Publish event ke Roblox Open Cloud MessagingService.
- Script Roblox server dan client sudah disediakan.

---

## Struktur File

```txt
kajie-saweria-donate-effect
├── src
│   └── index.js
├── roblox
│   ├── ServerScriptService
│   │   └── KajieSaweriaServer.server.lua
│   └── StarterPlayerScripts
│       └── KajieSaweriaClient.client.lua
├── docs
│   ├── DEPLOY.md
│   └── ROBLOX_SETUP.md
├── .github
│   └── workflows
│       └── deploy-cloudflare-worker.yml
├── .dev.vars.example
├── .gitignore
├── package.json
├── wrangler.toml
└── README.md
```

---

## Cara Cepat Deploy

### 1. Upload ke GitHub

Upload isi folder ini ke repository GitHub baru.

### 2. Install Dependency

```bash
npm install
```

### 3. Login Cloudflare

```bash
npx wrangler login
```

### 4. Buat KV Namespace

```bash
npx wrangler kv namespace create KAJIE_DONATION_KV
```

Copy `id` yang muncul, lalu ganti di `wrangler.toml`:

```toml
id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"
```

### 5. Simpan Secret Production

```bash
npx wrangler secret put ROBLOX_API_KEY
npx wrangler secret put ROBLOX_UNIVERSE_ID
npx wrangler secret put SAWERIA_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TEST_SECRET
npx wrangler secret put MIN_EFFECT_AMOUNT
```

Isi `MIN_EFFECT_AMOUNT` dengan:

```txt
10000
```

### 6. Deploy

```bash
npm run deploy
```

Setelah deploy, Cloudflare akan memberi URL seperti:

```txt
https://kajie-saweria-donate-effect.username.workers.dev
```

---

## URL Penting

Dashboard test:

```txt
https://domain-kamu.workers.dev/
```

Webhook Saweria:

```txt
https://domain-kamu.workers.dev/saweria-webhook/ISI_SAWERIA_WEBHOOK_SECRET
```

Health check:

```txt
https://domain-kamu.workers.dev/api/health
```

Daftar level:

```txt
https://domain-kamu.workers.dev/api/levels
```

---

## Setup Roblox

1. Buka Roblox Studio.
2. Masukkan file ini ke `ServerScriptService`:

```txt
roblox/ServerScriptService/KajieSaweriaServer.server.lua
```

3. Masukkan file ini ke `StarterPlayer > StarterPlayerScripts`:

```txt
roblox/StarterPlayerScripts/KajieSaweriaClient.client.lua
```

4. Publish game.
5. Pastikan ada server live saat test dari web dashboard.

Test cepat di Roblox Studio Command Bar:

```lua
_G.KajieTestDonation("KajieFans", 250000, "Mantap Kajie!")
```

---

## Roblox Open Cloud API Key

Buat API Key di Roblox Creator Dashboard dengan permission untuk experience kamu:

```txt
universe-messaging-service:publish
```

Lalu simpan ke Cloudflare secret:

```bash
npx wrangler secret put ROBLOX_API_KEY
```

Universe ID game kamu simpan ke:

```bash
npx wrangler secret put ROBLOX_UNIVERSE_ID
```

---

## Catatan Saweria

Format webhook Saweria bisa berbeda-beda tergantung integrasi. Worker ini sudah mencoba membaca field umum seperti:

```txt
id, transaction_id, payment_id, username, donator_name, name, amount, amount_raw, message
```

Kalau payload Saweria kamu berbeda, edit fungsi ini di `src/index.js`:

```js
normalizeDonation(body, source)
```

---

## GitHub Actions Opsional

File workflow sudah disediakan di:

```txt
.github/workflows/deploy-cloudflare-worker.yml
```

Tambahkan repository secrets di GitHub:

```txt
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Lalu push ke branch `main` untuk deploy otomatis.

---

## Keamanan

Jangan pernah memasukkan API key Roblox atau secret Saweria ke script Roblox. Semua secret harus disimpan di Cloudflare Worker Secret.
