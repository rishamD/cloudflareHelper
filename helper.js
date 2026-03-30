addEventListener("fetch", (event) => event.respondWith(handle(event.request)));

async function handle(req) {
  const user = PROXY_USER;   // Cloudflare env
  const pass = PROXY_PASS;
  const proxyUrl = `http://${user}:${pass}@gw.dataimpulse.com:823`;

  try {
    const url = new URL(req.url);
    const lbUser = url.searchParams.get("user");
    if (!lbUser || lbUser.includes("/")) {
      return new Response(JSON.stringify({ error: "invalid user" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    await new Promise(r => setTimeout(r, 400)); // polite delay

    const target = `https://letterboxd.com/${lbUser}/films/`;

    // native HTTP proxy fetch
    const res = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // Node-style proxy agent – Workers support it natively
      dispatcher: new URL(proxyUrl),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "upstream failed" }), {
        status: res.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const html = await res.text();
    const slugs = [...new Set([...html.matchAll(/href="\/film\/([^"/]+)\//g)].map((m) => m[1]))].slice(0, 50);

    return new Response(JSON.stringify({ slugs }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "worker exception", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
