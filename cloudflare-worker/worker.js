export default {
  async fetch(request, env) {
    const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
    const ANON_KEY = env.SUPABASE_ANON_KEY;

    // Allow CORS for all origins
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Prefer, apikey, Authorization, X-Admin-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the path after /proxy (e.g. /rest/v1/guestbook)
    const url = new URL(request.url);
    if (url.pathname === '/notify') { return handleNotify(request, env, corsHeaders); }
    if (url.pathname === '/contact-file') { return handleContactFile(request, env, corsHeaders); }
    if (url.pathname === '/webhook') { return handleWebhook(request, env, corsHeaders); }
    if (url.pathname.startsWith('/vault/')) { return handleVault(request, env, corsHeaders, url); }
    const supabasePath = url.pathname.replace('/proxy', '');
    const targetURL = SUPABASE_URL + supabasePath + url.search;

    // --- Reserved name guard for chat_messages inserts ---
    if (request.method === 'POST' && supabasePath === '/rest/v1/chat_messages') {
      let body;
      try { body = await request.json(); } catch { body = {}; }
      const RESERVED_WORDS = ['ovi', 'admin', 'administrator', 'moderator', 'mod', 'system'];
      const nameRaw = String(body.name ?? '').trim();
      const cleanName = nameRaw.toLowerCase();
      // Same rule as the chat page: reserved word as a separate word (digits ignored),
      // or letters that spell a reserved word ("O.v.i", "a d m i n")
      const nameWords = cleanName.split(/[^a-z0-9]+/).filter(Boolean).map(w => w.replace(/[0-9]/g, ''));
      const nameCollapsed = cleanName.replace(/[^a-z]/g, '');
      const isReserved = !nameRaw || nameWords.some(w => RESERVED_WORDS.includes(w)) || RESERVED_WORDS.includes(nameCollapsed);
      if (isReserved) {
        // Reserved names are allowed ONLY with a valid admin (Supabase) session token
        const adminToken = request.headers.get('X-Admin-Token') || '';
        let isAdmin = false;
        if (adminToken) {
          try {
            const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
              headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + adminToken },
            });
            if (who.ok) {
              const user = await who.json();
              // Optional extra lock: set ADMIN_EMAIL secret in the worker
              isAdmin = !!user && !!user.id && (!env.ADMIN_EMAIL || String(user.email).toLowerCase() === String(env.ADMIN_EMAIL).toLowerCase());
            }
          } catch { isAdmin = false; }
        }
        if (!isAdmin) return new Response(
          JSON.stringify({ error: 'reserved_name', message: 'This name is reserved.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Re-serialize body since we already consumed the stream
      const supabaseRequest = new Request(targetURL, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY,
          'Prefer': request.headers.get('Prefer') || '',
        },
        body: JSON.stringify(body),
      });
      const response = await fetch(supabaseRequest);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Forward the request to Supabase with auth headers
    const supabaseRequest = new Request(targetURL, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Prefer': request.headers.get('Prefer') || '',
      },
      body: request.method !== 'GET' ? request.body : undefined,
    });

    const response = await fetch(supabaseRequest);

    // Return response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

    return newResponse;
  },
};

async function handleNotify(request, env, corsHeaders) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (request.method !== 'POST') return json({ ok: false }, 405);
  if (request.headers.get('Origin') !== 'https://iamovi.github.io') {
    return json({ ok: false }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }

  const clip = (v, n) => String(v ?? '').slice(0, n);
  let text;
  if (body.type === 'contact') {
    text = `📩 New message\nName: ${clip(body.name, 60)}\nEmail: ${clip(body.email, 100)}\n\n${clip(body.message, 1000)}`;
  } else if (body.type === 'guestbook') {
    text = `📖 New guestbook entry\nName: ${clip(body.name, 40)}\n\n${clip(body.message, 300)}`;
  } else if (body.type === 'reply') {
    text = `💬 New reply\nName: ${clip(body.name, 40)}\n\n${clip(body.message, 300)}`;
  } else if (body.type === 'reaction') {
    text = `👍 New reaction: ${clip(body.reaction, 10)} on ${clip(body.target_type, 20)}:${clip(body.target_id, 40)}`;
  } else {
    return json({ ok: false }, 400);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
    }
  );
  return json({ ok: res.ok }, res.ok ? 200 : 502);
}

async function handleContactFile(request, env, corsHeaders) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (request.method !== 'POST') return json({ ok: false }, 405);
  if (request.headers.get('Origin') !== 'https://iamovi.github.io') {
    return json({ ok: false }, 403);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string' || file.size > 10 * 1024 * 1024) {
    return json({ ok: false }, 400);
  }

  const clip = (v, n) => String(v ?? '').slice(0, n);
  const name = clip(formData.get('name'), 60);
  const email = clip(formData.get('email'), 100);
  const message = clip(formData.get('message'), 800);

  const caption = clip(`📩 New message + attachment\nName: ${name}\nEmail: ${email}\n\n${message}`, 1024);

  const tgFormData = new FormData();
  tgFormData.append('chat_id', env.TELEGRAM_CHAT_ID);
  tgFormData.append('caption', caption);
  tgFormData.append('document', file);

  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`,
    {
      method: 'POST',
      body: tgFormData,
    }
  );

  return json({ ok: res.ok }, res.ok ? 200 : 502);
}

async function handleWebhook(request, env, corsHeaders) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (request.method !== 'POST') return json({ ok: false }, 405);

  let update;
  try { update = await request.json(); } catch { return json({ ok: false }, 400); }

  const message = update?.message;
  if (!message) return json({ ok: true }); // ignore non-message updates

  const chatId = message.chat?.id;
  const text = message.text?.trim() ?? '';

  // Handle /help and /start commands
  if (text === '/help' || text.startsWith('/help@') || text === '/start' || text.startsWith('/start@')) {
    const helpText =
      `🤖 iamovi site bot — help & commands

Available Commands (5):

🏓 /ping
• Live latency & uptime health check for site and database

✏️ /status <message>
• Updates top banner message ("ovi says —")
• Example: /status Building awesome tools 🚀
• Clear banner: /status clear
• (Restricted to site owner)

📊 /stats
• Live view of today's visits, guestbook count, reactions, & current status

ℹ️ /about
• Site bot overview & notification details

❓ /help
• Shows this command manual

🔒 Administrative controls are restricted to the verified bot owner.`;

    await sendTg(chatId, helpText, env);
  }

  // Handle /about command
  if (text === '/about' || text.startsWith('/about@')) {
    const replyText =
      `🤖 iamovi site bot

I'm the notification bot for iamovi.github.io — Maruf's personal site.

Commands:
🏓 /ping — Health & latency check
✏️ /status <msg> — Update site status banner (Owner only)
📊 /stats — View live site statistics & daily visit counts
ℹ️ /about — Show this information
❓ /help — List all commands and usage guide

Notifications:
📩 Contact form — when someone sends a message
📖 Guestbook — when someone signs the guestbook
💬 Replies — when someone replies to a guestbook entry
👍 Reactions — when someone reacts with an emoji

🔒 All notifications & controls are private to the bot owner.`;

    await sendTg(chatId, replyText, env);
  }

  // Handle /stats command
  if (text === '/stats' || text.startsWith('/stats@')) {
    const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
    const ANON_KEY = env.SUPABASE_ANON_KEY;
    const headers = {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
      'Prefer': 'count=exact'
    };

    try {
      const [visitsRes, guestbookRes, reactionsRes, statusRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rpc/get_today_visit_count`, { method: 'POST', headers }),
        fetch(`${SUPABASE_URL}/rest/v1/guestbook?select=id`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/reactions?select=id`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/status?select=message&id=eq.1`, { headers })
      ]);

      const visitsCount = await visitsRes.text();
      const guestbookRange = guestbookRes.headers.get('content-range') || '';
      const totalGuestbook = guestbookRange.split('/')[1] ?? '0';

      const reactionsRange = reactionsRes.headers.get('content-range') || '';
      const totalReactions = reactionsRange.split('/')[1] ?? '0';

      const statusData = await statusRes.json();
      const currentStatus = statusData?.[0]?.message || '(none)';

      const replyText =
        `📊 iamovi site stats

👀 Today's Visits: ${visitsCount.trim()}
📖 Total Guestbook Entries: ${totalGuestbook}
👍 Total Reactions: ${totalReactions}
💬 Current Status: "${currentStatus}"`;

      await sendTg(chatId, replyText, env);
    } catch (err) {
      await sendTg(chatId, '❌ Failed to fetch site stats.', env);
    }
  }

  // Handle /ping command
  if (text === '/ping' || text.startsWith('/ping@')) {
    const pingStart = performance.now();
    const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
    const ANON_KEY = env.SUPABASE_ANON_KEY;

    const cfColo = request.cf?.colo || 'Edge';
    const cfCountry = request.cf?.country || '';

    const checkPing = async (url, options = {}) => {
      let status = '🔴 Offline';
      let ms = 0;
      try {
        const t0 = performance.now();
        const res = await fetch(url, options);
        ms = Math.round(performance.now() - t0);
        if (res.ok) status = '🟢 Online';
        else status = `⚠️ HTTP ${res.status}`;
      } catch {
        status = '🔴 Error';
      }
      return { status, ms };
    };

    const [cfEdge, site, db, imagekit, umami, fonts, jsdelivr] = await Promise.all([
      checkPing('https://1.1.1.1/dns-query?name=cloudflare.com', { method: 'HEAD' }),
      checkPing('https://iamovi.github.io/', { method: 'GET' }),
      checkPing(`${SUPABASE_URL}/rest/v1/status?select=id&limit=1`, {
        headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
      }),
      checkPing('https://ik.imagekit.io/iamovi/nyan_cat.gif', { method: 'HEAD' }),
      checkPing('https://cloud.umami.is/script.js', { method: 'HEAD' }),
      checkPing('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap', { method: 'HEAD' }),
      checkPing('https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css', { method: 'HEAD' })
    ]);

    const execMs = Math.round(performance.now() - pingStart);

    const replyText =
      `⚡ Complete Infrastructure Health & Latency Check

⚡ Cloudflare Worker Edge:
• Status: 🟢 Active (${execMs}ms exec | ${cfEdge.ms}ms core edge)
• Datacenter: ${cfColo} ${cfCountry ? '(' + cfCountry + ')' : ''}

🌐 Portfolio (iamovi.github.io):
• Status: ${site.status} (${site.ms}ms)

🗄️ Supabase DB (supabase.co):
• Status: ${db.status} (${db.ms}ms)

🎵 ImageKit CDN (ik.imagekit.io):
• Status: ${imagekit.status} (${imagekit.ms}ms)

📊 Umami Analytics (cloud.umami.is):
• Status: ${umami.status} (${umami.ms}ms)

🔤 Google Fonts CDN (fonts.googleapis.com):
• Status: ${fonts.status} (${fonts.ms}ms)

📦 jsDelivr Icons CDN (cdn.jsdelivr.net):
• Status: ${jsdelivr.status} (${jsdelivr.ms}ms)`;

    await sendTg(chatId, replyText, env);
  }

  // Handle /status command (Owner only)
  if (text === '/status' || text.startsWith('/status ') || text.startsWith('/status@')) {
    const isOwner = String(chatId) === String(env.TELEGRAM_CHAT_ID);
    if (!isOwner) {
      await sendTg(chatId, '⛔ Unauthorized. Only the site owner can update status.', env);
      return json({ ok: true });
    }

    const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
    const AUTH_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': AUTH_KEY,
      'Authorization': 'Bearer ' + AUTH_KEY,
      'Prefer': 'return=minimal'
    };

    const arg = text.replace(/^\/status(@\w+)?\s*/i, '').trim();

    try {
      if (!arg) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/status?select=message&id=eq.1`, { headers });
        const data = await res.json();
        const currentMsg = data?.[0]?.message || '(none/empty)';
        const replyText =
          `💬 Current site status:
"${currentMsg}"

To update status:
/status <new message>

To clear status:
/status clear`;
        await sendTg(chatId, replyText, env);
      } else {
        const newMsg = arg.toLowerCase() === 'clear' ? '' : arg;
        const res = await fetch(`${SUPABASE_URL}/rest/v1/status?id=eq.1`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ message: newMsg, updated_at: new Date().toISOString() })
        });

        if (res.ok) {
          const replyText = newMsg
            ? `✅ Site status updated to:\n"${newMsg}"`
            : `🧹 Site status cleared (banner hidden).`;
          await sendTg(chatId, replyText, env);
        } else {
          await sendTg(chatId, `❌ Failed to update status (HTTP ${res.status}).`, env);
        }
      }
    } catch (err) {
      await sendTg(chatId, '❌ Error updating status.', env);
    }
  }

  return json({ ok: true });
}

async function sendTg(chatId, text, env) {
  return fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
}


// ---------- PRIVATE PHOTO VAULT (Workers KV) ----------
// Every route requires a valid admin session AND the email in the ADMIN_EMAIL secret.
async function handleVault(request, env, corsHeaders, url) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Fail closed: no KV binding or no ADMIN_EMAIL secret = vault stays locked
  if (!env.VAULT || !env.ADMIN_EMAIL) return json({ error: 'vault_not_configured' }, 500);

  const token = request.headers.get('X-Admin-Token') || '';
  if (!token) return json({ error: 'unauthorized' }, 401);
  let ok = false;
  try {
    const who = await fetch('https://nusyixchzeiplwwmqlbw.supabase.co/auth/v1/user', {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
    });
    if (who.ok) {
      const u = await who.json();
      ok = !!u && !!u.id && String(u.email).toLowerCase() === String(env.ADMIN_EMAIL).toLowerCase();
    }
  } catch { ok = false; }
  if (!ok) return json({ error: 'unauthorized' }, 401);

  const route = url.pathname.replace('/vault', '');
  const validId = (id) => /^[a-z0-9]{6,40}$/.test(id || '');
  const fileHeaders = (type) => ({
    ...corsHeaders,
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
  });

  if (route === '/list' && request.method === 'GET') {
    const items = [];
    let cursor;
    do {
      const page = await env.VAULT.list({ prefix: 'photo:', cursor });
      for (const k of page.keys) items.push({ id: k.name.slice(6), ...(k.metadata || {}) });
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    items.sort((a, b) => (b.t || 0) - (a.t || 0));
    return json({ items });
  }

  if (route.startsWith('/thumb/') && request.method === 'GET') {
    const id = route.slice(7);
    if (!validId(id)) return json({ error: 'bad_id' }, 400);
    const data = await env.VAULT.get('thumb:' + id, 'arrayBuffer');
    if (!data) return json({ error: 'not_found' }, 404);
    return new Response(data, { headers: fileHeaders('image/jpeg') });
  }

  if (route.startsWith('/photo/') && request.method === 'GET') {
    const id = route.slice(7);
    if (!validId(id)) return json({ error: 'bad_id' }, 400);
    const { value, metadata } = await env.VAULT.getWithMetadata('photo:' + id, { type: 'arrayBuffer' });
    if (!value) return json({ error: 'not_found' }, 404);
    return new Response(value, { headers: fileHeaders((metadata && metadata.type) || 'application/octet-stream') });
  }

  if (route === '/upload' && request.method === 'POST') {
    let form;
    try { form = await request.formData(); } catch { return json({ error: 'bad_request' }, 400); }
    const file = form.get('file');
    const thumb = form.get('thumb');
    if (!file || typeof file === 'string') return json({ error: 'no_file' }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ error: 'too_big', message: 'Max 25 MB per photo' }, 413);
    if (!String(file.type).startsWith('image/')) return json({ error: 'not_image' }, 400);

    const rand = crypto.getRandomValues(new Uint8Array(6));
    const id = Date.now().toString(36) + Array.from(rand, (b) => (b % 36).toString(36)).join('');
    const meta = {
      name: String(form.get('name') || file.name || 'photo').slice(0, 200),
      type: file.type,
      size: file.size,
      t: Date.now(),
    };
    await env.VAULT.put('photo:' + id, await file.arrayBuffer(), { metadata: meta });
    if (thumb && typeof thumb !== 'string' && thumb.size < 500 * 1024) {
      await env.VAULT.put('thumb:' + id, await thumb.arrayBuffer());
    }
    return json({ ok: true, id });
  }

  if (route === '/delete' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
    if (!validId(body.id)) return json({ error: 'bad_id' }, 400);
    await env.VAULT.delete('photo:' + body.id);
    await env.VAULT.delete('thumb:' + body.id);
    return json({ ok: true });
  }

  return json({ error: 'not_found' }, 404);
}
