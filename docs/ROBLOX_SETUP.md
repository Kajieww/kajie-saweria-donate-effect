# Setup Roblox - Kajie Saweria Donate Effect

## File yang harus dipasang

### Server

Letakkan file berikut di `ServerScriptService`:

```txt
roblox/ServerScriptService/KajieSaweriaServer.server.lua
```

### Client

Letakkan file berikut di `StarterPlayer > StarterPlayerScripts`:

```txt
roblox/StarterPlayerScripts/KajieSaweriaClient.client.lua
```

## Topic MessagingService

Pastikan topic di Worker dan Roblox sama:

```txt
KAJIE_SAWERIA_DONATE_V1
```

## Test di Roblox Studio

Jalankan di Command Bar:

```lua
_G.KajieTestDonation("KajieFans", 10000, "Level 1 test")
_G.KajieTestDonation("KajieFans", 50000, "Level 2 test")
_G.KajieTestDonation("KajieFans", 100000, "Level 3 test")
_G.KajieTestDonation("KajieFans", 250000, "Level 4 test")
```

## Test dari Dashboard Web

Untuk test dari web ke Roblox, game harus sudah published dan ada live server aktif.

## Level Donate

```txt
Level 1: Rp10.000 - Rp49.999
Level 2: Rp50.000 - Rp99.999
Level 3: Rp100.000 - Rp249.999
Level 4: Rp250.000 - tak terbatas
```
