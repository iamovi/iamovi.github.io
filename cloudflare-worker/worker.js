const SUPABASE_ORIGIN = 'https://nusyixchzeiplwwmqlbw.supabase.co';

export default {
  async fetch(request, env, ctx) {
    const SUPABASE_URL = SUPABASE_ORIGIN;
    const ANON_KEY = env.SUPABASE_ANON_KEY;

    // Allow CORS for all origins
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

    // --- Reserved name guard for chat_messages and guestbook inserts ---
    if (request.method === 'POST' && (supabasePath === '/rest/v1/chat_messages' || supabasePath === '/rest/v1/guestbook')) {
      let body;
      try { body = await request.json(); } catch { body = {}; }
      const RESERVED_WORDS = ['ovi', 'admin', 'administrator', 'moderator', 'mod', 'system', 'bot'];
      const nameRaw = String(body.name ?? '').trim();
      const checkName = nameRaw || (supabasePath === '/rest/v1/guestbook' ? 'anon' : '');
      const cleanName = checkName.toLowerCase();
      // Single name check: only exact single name "ovi" or "admin" (not multiple words/phrases like "GENJUTSU ADMIN 1")
      const isMultiWord = /\s+/.test(cleanName);
      const stripped = cleanName.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
      const collapsed = stripped.replace(/[^a-z]/g, '');
      const isReserved = !checkName || (!isMultiWord && (RESERVED_WORDS.includes(stripped) || RESERVED_WORDS.includes(collapsed)));
      // 'bot' is never allowed from a client, not even with an admin token: the bot's
      // replies are written server-side below, so a client posting as 'bot' is an
      // impersonation attempt. This mirrors the RLS insert policy.
      const isBotName = !isMultiWord && (stripped === 'bot' || collapsed === 'bot');
      if (isBotName) return new Response(
        JSON.stringify({ error: 'reserved_name', message: 'This name is reserved.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

        // The bot posts as the reserved name 'bot', so it can only be triggered here,
        // with the service-role key. Replying server-side (instead of in the browser)
        // is what lets the 'bot' name stay reserved.
        if (response.ok && supabasePath === '/rest/v1/chat_messages') {
          // Generate and write the reply in the background so the sender's POST is
          // never held open: the delay lets the "computing..." indicator show first,
          // and some replies (e.g. "@bot gh") need a network round trip of their own.
          const replyTask = (async () => {
            const reply = await botReplyFor(body.message, body.name);
            if (reply) await writeBotReply(env, reply);
          })();
          if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(replyTask);
          else await replyTask;
        }
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

// Writes the bot's reply after a short pause. Called via ctx.waitUntil() so the
// sender's POST is answered immediately and the reply lands a beat later.
async function writeBotReply(env, reply) {
  const delay = Number(env.BOT_REPLY_DELAY_MS ?? 1000);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  try {
    const AUTH_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    await fetch(SUPABASE_ORIGIN + '/rest/v1/chat_messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': AUTH_KEY,
        'Authorization': 'Bearer ' + AUTH_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ name: 'bot', message: reply, session_id: 'bot' }),
    });
  } catch { /* the user's message is already saved; a failed reply is not fatal */ }
}

// Reply for a chat mention of the bot, or null to stay quiet. The client mirrors
// the mention rule in willTriggerBot() to show its typing indicator, so keep the
// two in sync when changing how mentions are matched.
async function botReplyFor(message, senderName) {
  if (String(senderName || '').toLowerCase() === 'bot') return null;
  const text = String(message || '');
  // "@bot" at the start or after whitespace; the negative lookahead keeps
  // "@bothello" and "email@bot.com" from matching.
  const mention = /(^|\s)@bot(?![a-z0-9_])/i.exec(text);
  if (!mention) return null;

  const sender = String(senderName || '').trim() || 'there';
  // Everything after "@bot" is the command, e.g. "@bot gh torvalds" -> "gh torvalds".
  const command = text.slice(mention.index + mention[0].length).trim();
  const [verb, ...rest] = command.split(/\s+/);

  switch (String(verb || '').toLowerCase()) {
    case 'help':
      return BOT_HELP;
    case 'joke':
      return jokeReply(sender);
    case 'define':
      return defineReply(rest.join(' '));
    case 'weather':
      return weatherReply(rest.join(' '));
    case 'time':
      return timeReply(rest.join(' '));
    case 'gh':
    case 'github':
      return githubProfileReply(rest[0]);
    default:
      return 'hey ' + sender;
  }
}

const BOT_HELP = [
  'hey — here is what i can do:',
  '',
  '@bot joke — tell a random joke',
  '@bot define <word> — look up a word',
  '@bot weather <city> — current weather',
  '@bot time <place> — local time',
  '@bot gh <username> — look up a github profile',
  '@bot help — show this list',
  '',
  'anything else and i will just say hi 👋',
].join('\n');

// Looks up a word and returns its part of speech and first definition. Accepts
// multi-word terms ("machine learning"). Never throws: any failure comes back as
// a friendly message so the bot always replies instead of going silent.
async function defineReply(term) {
  const word = String(term || '').trim();
  if (!word) return 'usage: @bot define <word>  —  e.g. @bot define serendipity';

  let res;
  try {
    res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), {
      headers: { 'Accept': 'application/json' },
    });
  } catch {
    return 'could not reach the dictionary right now — try again in a moment.';
  }
  if (res.status === 404) return `no definition found for "${word}".`;
  if (!res.ok) return `the dictionary returned an error (${res.status}). try again later.`;

  let data;
  try { data = await res.json(); } catch { return 'the dictionary sent back something i could not read.'; }
  if (!Array.isArray(data) || !data.length) return `no definition found for "${word}".`;

  const entry = data[0] || {};
  const phonetic = entry.phonetic
    || (entry.phonetics || []).map((p) => p && p.text).find(Boolean)
    || '';
  const meaning = (entry.meanings || []).find((m) => m && (m.definitions || []).length);
  if (!meaning) return `no definition found for "${word}".`;

  const definition = String(meaning.definitions[0].definition || '').trim();
  const pos = meaning.partOfSpeech ? meaning.partOfSpeech + ' — ' : '';
  const clipped = definition.length > 280 ? definition.slice(0, 279).trimEnd() + '…' : definition;

  const head = entry.word || word;
  return (phonetic ? head + ' ' + phonetic : head) + '\n\n' + pos + clipped;
}

// Fetches a random safe-mode joke and prefixes it with the sender's name. Same
// source as the homepage joke section. Never throws: any failure comes back as
// a friendly message so the bot always replies instead of going silent.
async function jokeReply(senderName) {
  const name = String(senderName || '').trim() || 'there';
  // Blank line after the header so the joke stands apart from the greeting.
  const header = 'here is a joke for ' + name + '\n';

  let res;
  try {
    res = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode', {
      headers: { 'Accept': 'application/json' },
    });
  } catch {
    return header + '\n...but i could not reach the joke server. try again in a moment.';
  }
  if (!res.ok) return header + '\n...but the joke server returned an error (' + res.status + '). try again later.';

  let data;
  try { data = await res.json(); } catch { return header + '\n...but the joke server sent back something i could not read.'; }
  if (data.error) return header + '\n...but the joke server had no joke to give right now.';

  if (data.type === 'twopart' && data.setup && data.delivery) {
    return header + '\n' + data.setup + '\n' + data.delivery;
  }
  const single = data.joke || data.setup || '';
  return single ? header + '\n' + single : header + '\n...but the joke came back empty.';
}

// Fetches current weather for a place name via Open-Meteo (no API key). Never
// throws: any failure comes back as a friendly message so the bot always
// replies instead of going silent.
async function weatherReply(place) {
  const query = String(place || '').trim();
  if (!query) return 'usage: @bot weather <city>  —  e.g. @bot weather london';

  const hit = await geocodePlace(query);
  if (typeof hit === 'string') return hit;

  let res;
  try {
    res = await fetch(
      'https://api.open-meteo.com/v1/forecast?current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&latitude=' +
      encodeURIComponent(hit.latitude) + '&longitude=' + encodeURIComponent(hit.longitude),
      { headers: { 'Accept': 'application/json' } }
    );
  } catch {
    return 'could not reach the weather service right now — try again in a moment.';
  }
  if (!res.ok) return `the weather service returned an error (${res.status}). try again later.`;

  let data;
  try { data = await res.json(); } catch { return 'the weather service sent back something i could not read.'; }
  const cur = data && data.current;
  if (!cur || typeof cur.temperature_2m !== 'number') {
    return 'the weather service did not return any readings for that place.';
  }

  const lines = [placeLabel(hit)];
  lines.push(
    `${weatherCodeText(cur.weather_code)} · ${Math.round(cur.temperature_2m)}°C` +
    (typeof cur.apparent_temperature === 'number' ? ` (feels ${Math.round(cur.apparent_temperature)}°C)` : '')
  );
  if (typeof cur.wind_speed_10m === 'number') lines.push(`wind ${Math.round(cur.wind_speed_10m)} km/h`);
  return lines.join('\n');
}

// WMO weather interpretation codes, grouped so the wording stays short.
function weatherCodeText(code) {
  const c = Number(code);
  if (c === 0) return 'clear sky';
  if (c === 1) return 'mainly clear';
  if (c === 2) return 'partly cloudy';
  if (c === 3) return 'overcast';
  if (c === 45 || c === 48) return 'foggy';
  if (c >= 51 && c <= 57) return 'drizzle';
  if (c >= 61 && c <= 67) return 'rain';
  if (c >= 71 && c <= 77) return 'snow';
  if (c >= 80 && c <= 82) return 'rain showers';
  if (c === 85 || c === 86) return 'snow showers';
  if (c >= 95) return 'thunderstorm';
  return 'unknown conditions';
}

// Joins the place parts, dropping repeats so a country lookup does not read
// "Bangladesh, Bangladesh".
function placeLabel(hit) {
  const parts = [hit.name, hit.admin1, hit.country]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i)
    .join(', ');
}

// Current local time for a place, via Open-Meteo's geocoding timezone (no API
// key). Never throws: any failure comes back as a friendly message so the bot
// always replies instead of going silent.
async function timeReply(place) {
  const query = String(place || '').trim();
  if (!query) return 'usage: @bot time <place>  —  e.g. @bot time japan';

  const hit = await geocodePlace(query);
  if (typeof hit === 'string') return hit;

  const now = new Date();
  let time;
  let date;
  try {
    time = new Intl.DateTimeFormat('en-GB', {
      timeZone: hit.timezone, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
    date = new Intl.DateTimeFormat('en-GB', {
      timeZone: hit.timezone, weekday: 'short', day: 'numeric', month: 'short',
    }).format(now);
  } catch {
    return `i could not work out the time for "${query}".`;
  }

  return `${placeLabel(hit)}\n${time} (${date})\n${hit.timezone}`;
}

// Resolves a place name to a geocoding result. Returns the first hit, or a
// friendly message string on any failure so callers can pass it straight back.
async function geocodePlace(query) {
  let res;
  try {
    res = await fetch(
      'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' +
      encodeURIComponent(query),
      { headers: { 'Accept': 'application/json' } }
    );
  } catch {
    return 'could not reach the location service right now — try again in a moment.';
  }
  if (!res.ok) return `the location service returned an error (${res.status}). try again later.`;

  let data;
  try { data = await res.json(); } catch { return 'the location service sent back something i could not read.'; }
  const hit = data && Array.isArray(data.results) && data.results[0];
  if (!hit) return `i could not find a place called "${query}".`;
  return hit;
}

// Looks up a GitHub user and formats a short profile card. Never throws: any
// failure (bad name, rate limit, network) comes back as a friendly message so
// the bot always replies instead of going silent.
async function githubProfileReply(username) {
  const login = String(username || '').trim().replace(/^@/, '');
  if (!login) return 'usage: @bot gh <username>  —  e.g. @bot gh torvalds';
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i.test(login)) {
    return `"${login}" does not look like a github username.`;
  }

  let res;
  try {
    res = await fetch('https://api.github.com/users/' + encodeURIComponent(login), {
      headers: {
        'User-Agent': 'iamovi-chatguys-bot',
        'Accept': 'application/vnd.github+json',
      },
    });
  } catch {
    return 'could not reach github right now — try again in a moment.';
  }

  if (res.status === 404) return `no github user named "${login}".`;
  if (res.status === 403 || res.status === 429) {
    return 'github is rate-limiting me right now — try again later.';
  }
  if (!res.ok) return `github returned an error (${res.status}). try again later.`;

  let user;
  try { user = await res.json(); } catch { return 'github sent back something i could not read.'; }

  const lines = [`@${user.login}`];
  if (user.name) lines.push(user.name);
  if (user.bio) lines.push(user.bio);
  lines.push(
    `${user.public_repos} repos · ${user.followers} followers`,
    user.html_url
  );
  return lines.join('\n');
}

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

I'm the notification bot for iamovi.github.io — Ovi's personal site.

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


// ---------- PRIVATE PHOTO VAULT (Backblaze B2) ----------
// Every route requires a valid admin session AND the email in the ADMIN_EMAIL secret.
async function handleVault(request, env, corsHeaders, url) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Fail closed: missing B2 config or ADMIN_EMAIL = vault stays locked
  if (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET || !env.B2_ENDPOINT || !env.B2_REGION || !env.ADMIN_EMAIL) {
    return json({ error: 'vault_not_configured' }, 500);
  }

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

  try {
    if (route === '/list' && request.method === 'GET') {
      const items = await b2ReadIndex(env);
      items.sort((a, b) => (b.t || 0) - (a.t || 0));
      return json({ items });
    }

    if ((route.startsWith('/thumb/') || route.startsWith('/photo/')) && request.method === 'GET') {
      const isThumb = route.startsWith('/thumb/');
      const id = route.slice(7);
      if (!validId(id)) return json({ error: 'bad_id' }, 400);
      const r = await b2Fetch(env, 'GET', (isThumb ? 'thumb/' : 'photo/') + id);
      if (r.status === 404) return json({ error: 'not_found' }, 404);
      if (!r.ok) return json({ error: 'storage_error' }, 502);
      const type = isThumb ? 'image/jpeg' : (r.headers.get('content-type') || 'application/octet-stream');
      return new Response(r.body, { headers: fileHeaders(type) });
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
        id,
        name: String(form.get('name') || file.name || 'photo').slice(0, 200),
        type: file.type,
        size: file.size,
        t: Date.now(),
      };

      const put = await b2Fetch(env, 'PUT', 'photo/' + id, { body: await file.arrayBuffer(), contentType: file.type });
      if (!put.ok) return json({ error: 'storage_error' }, 502);
      if (thumb && typeof thumb !== 'string' && thumb.size < 500 * 1024) {
        await b2Fetch(env, 'PUT', 'thumb/' + id, { body: await thumb.arrayBuffer(), contentType: 'image/jpeg' });
      }
      const items = await b2ReadIndex(env);
      items.push(meta);
      await b2WriteIndex(env, items);
      return json({ ok: true, id });
    }

    if (route === '/delete' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
      if (!validId(body.id)) return json({ error: 'bad_id' }, 400);
      await b2Fetch(env, 'DELETE', 'photo/' + body.id);
      await b2Fetch(env, 'DELETE', 'thumb/' + body.id);
      const items = (await b2ReadIndex(env)).filter((it) => it.id !== body.id);
      await b2WriteIndex(env, items);
      return json({ ok: true });
    }
  } catch (e) {
    return json({ error: 'storage_error', detail: String((e && e.message) || e).slice(0, 120) }, 502);
  }

  return json({ error: 'not_found' }, 404);
}

// ---------------------------------------------------------------------------
// Backblaze B2 (S3-compatible API) helpers — AWS SigV4 using WebCrypto only.
// ---------------------------------------------------------------------------
const _enc = new TextEncoder();
const _hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const _sha256Hex = async (data) => _hex(await crypto.subtle.digest('SHA-256', data));
async function _hmac(keyBytes, data) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, _enc.encode(data));
}

// Pure signer (easy to test). `headers` keys must be lowercase.
async function sigV4({ method, host, path, query = '', headers, payloadHash, region, service = 's3', keyId, secret, amzDate }) {
  const dateStamp = amzDate.slice(0, 8);
  const all = { ...headers, host };
  const names = Object.keys(all).sort();
  const canonHeaders = names.map((n) => `${n}:${String(all[n]).trim()}\n`).join('');
  const signedHeaders = names.join(';');
  const canonical = [method, path, query, canonHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await _sha256Hex(_enc.encode(canonical))].join('\n');
  let k = await _hmac(_enc.encode('AWS4' + secret), dateStamp);
  k = await _hmac(k, region);
  k = await _hmac(k, service);
  k = await _hmac(k, 'aws4_request');
  const sig = _hex(await _hmac(k, toSign));
  return `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
}

// One signed request to the bucket. key e.g. "photo/abc123" (path-style URL).
async function b2Fetch(env, method, key, { body, contentType } = {}) {
  const host = env.B2_ENDPOINT; // e.g. s3.us-east-005.backblazeb2.com
  const path = '/' + env.B2_BUCKET + '/' + key.split('/').map(encodeURIComponent).join('/');
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const payloadHash = await _sha256Hex(body ?? new Uint8Array(0));
  const headers = { 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const authorization = await sigV4({
    method, host, path, headers, payloadHash, amzDate,
    region: env.B2_REGION, keyId: env.B2_KEY_ID, secret: env.B2_APP_KEY,
  });
  const reqHeaders = { ...headers, Authorization: authorization };
  if (contentType) reqHeaders['Content-Type'] = contentType;
  return fetch('https://' + host + path, { method, headers: reqHeaders, body });
}

// index.json holds the photo list (B2 listings don't return custom metadata).
async function b2ReadIndex(env) {
  const r = await b2Fetch(env, 'GET', 'index.json');
  if (r.status === 404) return [];
  if (!r.ok) throw new Error('b2_index_read_' + r.status);
  return r.json();
}
async function b2WriteIndex(env, items) {
  const r = await b2Fetch(env, 'PUT', 'index.json', {
    body: _enc.encode(JSON.stringify(items)),
    contentType: 'application/json',
  });
  if (!r.ok) throw new Error('b2_index_write_' + r.status);
}
