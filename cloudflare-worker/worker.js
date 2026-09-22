export default {
  async fetch(request, env) {
    const SUPABASE_URL = 'https://nusyixchzeiplwwmqlbw.supabase.co';
    const ANON_KEY = env.SUPABASE_ANON_KEY;

    // Allow CORS for all origins
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Prefer, apikey, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the path after /proxy (e.g. /rest/v1/guestbook)
    const url = new URL(request.url);
    if (url.pathname === '/notify') { return handleNotify(request, env, corsHeaders); }
    if (url.pathname === '/webhook') { return handleWebhook(request, env, corsHeaders); }
    const supabasePath = url.pathname.replace('/proxy', '');
    const targetURL = SUPABASE_URL + supabasePath + url.search;

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

  // Handle /about command
  if (text === '/about' || text.startsWith('/about@')) {
    const replyText =
`🤖 iamovi site bot

I'm the notification bot for iamovi.github.io — Maruf's personal site.

Commands:
📊 /stats — View live site statistics & daily visit counts
ℹ️ /about — Show this information

Notifications:
📩 Contact form — when someone sends a message
📖 Guestbook — when someone signs the guestbook
💬 Replies — when someone replies to a guestbook entry
👍 Reactions — when someone reacts with an emoji

🔒 All notifications are private to the bot owner.`;

    await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: replyText }),
      }
    );
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

      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText }),
        }
      );
    } catch (err) {
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '❌ Failed to fetch site stats.' }),
        }
      );
    }
  }

  return json({ ok: true });
}
