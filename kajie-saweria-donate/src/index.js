const SYSTEM_NAME = "Kajie Saweria Donate Effect";
const TOPIC = "KAJIE_SAWERIA_DONATE_V1";

const LEVELS = [
  {
    level: 1,
    name: "Kajie Spark",
    min: 10000,
    max: 49999,
    color: "#38bdf8",
    effect: "Confetti ringan + popup biru",
  },
  {
    level: 2,
    name: "Kajie Gold Rain",
    min: 50000,
    max: 99999,
    color: "#facc15",
    effect: "Gold rain + popup premium",
  },
  {
    level: 3,
    name: "Kajie Royal Burst",
    min: 100000,
    max: 249999,
    color: "#a855f7",
    effect: "Royal burst + flash + shake ringan",
  },
  {
    level: 4,
    name: "Kajie Mega Storm",
    min: 250000,
    max: null,
    color: "#fb7185",
    effect: "Mega storm + flash + camera shake",
  },
];

const DEFAULT_MIN_EFFECT_AMOUNT = 10000;

function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });
}

function responseHtml(content) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value, maxLength = 60, fallback = "") {
  const cleaned = String(value ?? "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || fallback;
}

function parseAmount(value) {
  if (typeof value === "number") {
    return Math.max(0, Math.floor(value));
  }

  const raw = String(value ?? "").replace(/[^\d]/g, "");
  return Math.max(0, Math.floor(Number(raw) || 0));
}

function formatRupiah(amount) {
  return "Rp" + Number(amount || 0).toLocaleString("id-ID");
}

function getLevel(amount) {
  for (const level of LEVELS) {
    const passMin = amount >= level.min;
    const passMax = level.max === null || amount <= level.max;

    if (passMin && passMax) {
      return level;
    }
  }

  return null;
}

function normalizeDonation(body, source = "saweria") {
  const nested = body?.data && typeof body.data === "object" ? body.data : {};
  const etc = body?.etc && typeof body.etc === "object" ? body.etc : {};

  const id = cleanText(
    body?.id ||
      body?.transaction_id ||
      body?.payment_id ||
      body?.order_id ||
      nested?.id ||
      nested?.transaction_id ||
      `${source}-${Date.now()}-${crypto.randomUUID()}`,
    100,
    `${source}-${Date.now()}`
  );

  const username = cleanText(
    body?.username ||
      body?.donator_name ||
      body?.name ||
      body?.sender ||
      body?.from ||
      nested?.username ||
      nested?.donator_name ||
      nested?.name ||
      "Anonim",
    32,
    "Anonim"
  );

  const message = cleanText(
    body?.message ||
      body?.donator_message ||
      body?.support_message ||
      nested?.message ||
      nested?.donator_message ||
      "",
    100,
    ""
  );

  const amount = parseAmount(
    body?.amount_raw ??
      body?.amount ??
      body?.total ??
      body?.nominal ??
      nested?.amount_raw ??
      nested?.amount ??
      nested?.total ??
      etc?.amount_to_display ??
      0
  );

  const type = cleanText(
    body?.type || body?.event || nested?.type || "donation",
    30,
    "donation"
  ).toLowerCase();

  return {
    id,
    source,
    type,
    username,
    amount,
    message,
    level: getLevel(amount),
    createdAt: new Date().toISOString(),
  };
}

function getRequiredEnv(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing environment secret: ${key}`);
  }
  return value;
}

async function alreadyProcessed(env, donationId) {
  if (!env.KAJIE_DONATION_KV) return false;
  const existing = await env.KAJIE_DONATION_KV.get(`donation:${donationId}`);
  return existing !== null;
}

async function saveDonation(env, donation, publishResult = null) {
  if (!env.KAJIE_DONATION_KV) return;

  const record = {
    ...donation,
    roblox: publishResult,
  };

  await env.KAJIE_DONATION_KV.put(
    `donation:${donation.id}`,
    JSON.stringify(record),
    { expirationTtl: 60 * 60 * 24 * 90 }
  );

  const recentKey = "recent:donations";
  const currentRaw = await env.KAJIE_DONATION_KV.get(recentKey);
  let current = [];

  if (currentRaw) {
    try {
      current = JSON.parse(currentRaw);
    } catch {
      current = [];
    }
  }

  current.unshift({
    id: donation.id,
    source: donation.source,
    username: donation.username,
    amount: donation.amount,
    message: donation.message,
    level: donation.level ? donation.level.level : 0,
    levelName: donation.level ? donation.level.name : "No Effect",
    robloxSent: Boolean(publishResult?.sent),
    createdAt: donation.createdAt,
  });

  const unique = [];
  const seen = new Set();
  for (const item of current) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= 25) break;
  }

  await env.KAJIE_DONATION_KV.put(recentKey, JSON.stringify(unique));
}

async function getRecentDonations(env) {
  if (!env.KAJIE_DONATION_KV) return [];

  const raw = await env.KAJIE_DONATION_KV.get("recent:donations");
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function publishToRoblox(env, donation) {
  if (!donation.level) {
    return {
      sent: false,
      reason: "Donation below Kajie minimum effect",
    };
  }

  const robloxApiKey = getRequiredEnv(env, "ROBLOX_API_KEY");
  const universeId = getRequiredEnv(env, "ROBLOX_UNIVERSE_ID");

  const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}:publishMessage`;

  const robloxPayload = {
    sys: "KajieSaweria",
    id: donation.id,
    u: donation.username,
    a: donation.amount,
    m: donation.message,
    l: donation.level.level,
    ln: donation.level.name,
    c: donation.level.color,
    t: Date.now(),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": robloxApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: TOPIC,
      message: JSON.stringify(robloxPayload),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Roblox publish failed: ${response.status} ${text}`);
  }

  return {
    sent: true,
    topic: TOPIC,
    level: donation.level.level,
    levelName: donation.level.name,
  };
}

function dashboardPage() {
  const levelRows = LEVELS.map((level) => {
    const maxText = level.max === null ? "tak terbatas" : formatRupiah(level.max);

    return `
      <tr>
        <td><b>Level ${level.level}</b></td>
        <td>${level.name}</td>
        <td>${formatRupiah(level.min)} - ${maxText}</td>
        <td><span class="badge" style="border-color:${level.color}; color:${level.color};">${level.effect}</span></td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${SYSTEM_NAME}</title>
  <style>
    :root {
      --bg: #070b14;
      --panel: rgba(15, 23, 42, 0.84);
      --text: #e5e7eb;
      --muted: #94a3b8;
      --line: rgba(148, 163, 184, 0.23);
      --accent: #38bdf8;
      --green: #22c55e;
      --red: #fb7185;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 10% 10%, rgba(56,189,248,.18), transparent 36%),
        radial-gradient(circle at 88% 10%, rgba(168,85,247,.13), transparent 34%),
        radial-gradient(circle at 90% 90%, rgba(251,113,133,.16), transparent 36%),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .wrap {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 30px 0 56px;
    }

    .hero, .card {
      border: 1px solid var(--line);
      background: linear-gradient(135deg, rgba(15, 23, 42, .94), rgba(30, 41, 59, .72));
      border-radius: 28px;
      box-shadow: 0 20px 70px rgba(0,0,0,.34);
      backdrop-filter: blur(12px);
    }

    .hero { padding: clamp(22px, 4vw, 34px); }
    .card { padding: 20px; }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border: 1px solid rgba(56, 189, 248, .36);
      border-radius: 999px;
      color: #bae6fd;
      background: rgba(14, 165, 233, .08);
      font-weight: 900;
      letter-spacing: .4px;
    }

    h1 {
      margin: 22px 0 12px;
      font-size: clamp(34px, 6vw, 66px);
      line-height: .97;
      letter-spacing: -1.8px;
    }

    h2 { margin: 0 0 14px; font-size: 20px; }

    p { color: var(--muted); line-height: 1.7; }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 18px;
    }

    label {
      display: block;
      margin: 12px 0 7px;
      color: #cbd5e1;
      font-size: 14px;
      font-weight: 800;
    }

    input, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 13px 14px;
      background: rgba(2, 6, 23, .82);
      color: var(--text);
      outline: none;
    }

    textarea { min-height: 88px; resize: vertical; }

    button {
      margin-top: 14px;
      width: 100%;
      border: none;
      border-radius: 14px;
      padding: 14px 16px;
      background: linear-gradient(135deg, #38bdf8, #a855f7);
      color: white;
      font-weight: 1000;
      letter-spacing: .2px;
      cursor: pointer;
      box-shadow: 0 12px 36px rgba(56,189,248,.18);
    }

    button:disabled { opacity: .58; cursor: not-allowed; }

    .endpoint, .result {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: rgba(2, 6, 23, .82);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px;
      word-break: break-all;
    }

    .result {
      white-space: pre-wrap;
      min-height: 94px;
      color: #bbf7d0;
      font-size: 13px;
    }

    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 16px; }
    th, td { padding: 13px; border-bottom: 1px solid var(--line); text-align: left; color: #dbeafe; font-size: 14px; }
    th { color: #93c5fd; background: rgba(15, 23, 42, .82); }

    .badge {
      display: inline-flex;
      padding: 7px 10px;
      border: 1px solid;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      background: rgba(255,255,255,.03);
    }

    .recent-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
    }

    .recent-item:last-child { border-bottom: none; }
    .recent-item b { color: white; }
    .muted { color: var(--muted); }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }

    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 11px;
      color: #cbd5e1;
      background: rgba(2,6,23,.4);
      font-size: 13px;
      font-weight: 800;
    }

    @media (max-width: 880px) {
      .grid { grid-template-columns: 1fr; }
      h1 { letter-spacing: -1px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="logo">⚡ KAJIE SYSTEM</div>
      <h1>${SYSTEM_NAME}</h1>
      <p>
        Dashboard test dan webhook untuk menghubungkan donasi Saweria ke Roblox live server.
        Test bisa langsung isi username, nominal donate, dan message, lalu dikirim ke MessagingService Roblox.
      </p>
      <div class="pill-row">
        <div class="pill">Topic: ${TOPIC}</div>
        <div class="pill">Minimum Effect: ${formatRupiah(DEFAULT_MIN_EFFECT_AMOUNT)}</div>
        <div class="pill">Status: Worker Active</div>
      </div>
    </section>

    <div class="grid">
      <section class="card">
        <h2>Test Donate Effect</h2>
        <label>Admin/Test Secret</label>
        <input id="secret" type="password" placeholder="Isi ADMIN_TEST_SECRET" />

        <label>Username Donatur</label>
        <input id="username" placeholder="Contoh: KajieFans" value="KajieFans" />

        <label>Nominal Donate</label>
        <input id="amount" type="number" min="0" placeholder="Contoh: 50000" value="50000" />

        <label>Message</label>
        <textarea id="message" placeholder="Pesan donatur">Mantap Kajie!</textarea>

        <button id="sendBtn" onclick="sendTest()">Kirim Test ke Roblox</button>

        <label>Result</label>
        <div id="result" class="result">Belum ada test.</div>
      </section>

      <section class="card">
        <h2>Informasi Endpoint</h2>
        <p>Pasang URL ini di webhook Saweria:</p>
        <div class="endpoint" id="webhookUrl">/saweria-webhook/SAWERIA_WEBHOOK_SECRET</div>

        <p>Endpoint test dashboard:</p>
        <div class="endpoint">POST /api/test</div>

        <p>Payload test yang dikirim:</p>
        <div class="endpoint">username, amount, message, level</div>
      </section>
    </div>

    <section class="card" style="margin-top:18px;">
      <h2>Level Donate Kajie</h2>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Nama Effect</th>
            <th>Range Donate</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>${levelRows}</tbody>
      </table>
    </section>

    <section class="card" style="margin-top:18px;">
      <h2>Recent Donations</h2>
      <div id="recent">Loading...</div>
    </section>
  </div>

  <script>
    const baseUrl = location.origin;
    document.getElementById("webhookUrl").textContent = baseUrl + "/saweria-webhook/ISI_SAWERIA_WEBHOOK_SECRET";

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function sendTest() {
      const btn = document.getElementById("sendBtn");
      const result = document.getElementById("result");

      btn.disabled = true;
      result.textContent = "Mengirim test ke Roblox...";

      try {
        const response = await fetch("/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: document.getElementById("secret").value,
            username: document.getElementById("username").value,
            amount: document.getElementById("amount").value,
            message: document.getElementById("message").value,
          }),
        });

        const data = await response.json();
        result.textContent = JSON.stringify(data, null, 2);
        loadRecent();
      } catch (err) {
        result.textContent = "ERROR: " + err.message;
      }

      btn.disabled = false;
    }

    async function loadRecent() {
      const recent = document.getElementById("recent");

      try {
        const response = await fetch("/api/recent");
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
          recent.innerHTML = '<p class="muted">Belum ada donation.</p>';
          return;
        }

        recent.innerHTML = data.items.map((item) => {
          return '<div class="recent-item">'
            + '<b>' + escapeHtml(item.username) + '</b> donate <b>Rp' + Number(item.amount || 0).toLocaleString("id-ID") + '</b>'
            + '<br />'
            + '<span class="muted">Level ' + escapeHtml(item.level) + ' - ' + escapeHtml(item.levelName) + ' | Roblox sent: ' + (item.robloxSent ? "yes" : "no") + '</span>'
            + '<br />'
            + '<span>' + escapeHtml(item.message || "") + '</span>'
            + '</div>';
        }).join("");
      } catch {
        recent.innerHTML = '<p class="muted">Gagal load recent donation.</p>';
      }
    }

    loadRecent();
  </script>
</body>
</html>`;
}

async function handleTest(request, env) {
  const body = await request.json();

  if (!body || body.secret !== env.ADMIN_TEST_SECRET) {
    return responseJson({ ok: false, error: "Invalid admin/test secret" }, 403);
  }

  const donation = normalizeDonation({
    id: `test-${Date.now()}-${crypto.randomUUID()}`,
    username: body.username,
    amount: body.amount,
    message: body.message,
    type: "donation",
  }, "dashboard-test");

  const minAmount = Number(env.MIN_EFFECT_AMOUNT || DEFAULT_MIN_EFFECT_AMOUNT);
  if (donation.amount < minAmount) {
    await saveDonation(env, donation, { sent: false, reason: "Below MIN_EFFECT_AMOUNT" });
    return responseJson({
      ok: true,
      system: SYSTEM_NAME,
      test: true,
      ignored: true,
      minimum: minAmount,
      donation,
    });
  }

  const publishResult = await publishToRoblox(env, donation);
  await saveDonation(env, donation, publishResult);

  return responseJson({
    ok: true,
    system: SYSTEM_NAME,
    test: true,
    donation,
    roblox: publishResult,
  });
}

async function handleSaweriaWebhook(request, env) {
  const body = await request.json();
  const donation = normalizeDonation(body, "saweria");

  if (await alreadyProcessed(env, donation.id)) {
    return responseJson({ ok: true, duplicate: true, id: donation.id });
  }

  const minAmount = Number(env.MIN_EFFECT_AMOUNT || DEFAULT_MIN_EFFECT_AMOUNT);
  if (donation.amount < minAmount || !donation.level) {
    await saveDonation(env, donation, { sent: false, reason: "Below Kajie minimum effect" });
    return responseJson({
      ok: true,
      ignored: true,
      reason: "Donation below Kajie minimum effect",
      minimum: minAmount,
      donation,
    });
  }

  const publishResult = await publishToRoblox(env, donation);
  await saveDonation(env, donation, publishResult);

  return responseJson({
    ok: true,
    system: SYSTEM_NAME,
    donation,
    roblox: publishResult,
  });
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") {
        return responseJson({ ok: true });
      }

      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return responseHtml(dashboardPage());
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        return responseJson({ ok: true, system: SYSTEM_NAME, topic: TOPIC, now: new Date().toISOString() });
      }

      if (request.method === "GET" && url.pathname === "/api/levels") {
        return responseJson({ ok: true, system: SYSTEM_NAME, topic: TOPIC, levels: LEVELS });
      }

      if (request.method === "GET" && url.pathname === "/api/recent") {
        if (env.RECENT_PUBLIC === "false") {
          return responseJson({ ok: false, error: "Recent donations are private" }, 403);
        }

        return responseJson({ ok: true, items: await getRecentDonations(env) });
      }

      if (request.method === "POST" && url.pathname === "/api/test") {
        return await handleTest(request, env);
      }

      const webhookSecret = getRequiredEnv(env, "SAWERIA_WEBHOOK_SECRET");
      if (request.method === "POST" && url.pathname === `/saweria-webhook/${webhookSecret}`) {
        return await handleSaweriaWebhook(request, env);
      }

      return responseJson({ ok: false, error: "Not found" }, 404);
    } catch (err) {
      return responseJson({ ok: false, error: err.message || "Internal server error" }, 500);
    }
  },
};
