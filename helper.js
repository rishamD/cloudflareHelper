addEventListener("fetch", (event) => event.respondWith(handle(event.request)));

async function handle(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get("user");
  if (!user || user.includes("/")) {
    return new Response(JSON.stringify({ error: "invalid user" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await new Promise(r => setTimeout(r, 400));   // polite delay

  const target = `http://api.scraperapi.com/?api_key=YOUR_KEY&url=https://letterboxd.com/${user}/films/`;
  const res = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "upstream failed" }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const html = await res.text();
  const slugs = [...new Set([...html.matchAll(/href="\/film\/([^"/]+)\//g)].map((m) => m[1]))].slice(0, 50);

  return new Response(JSON.stringify({ slugs }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
      "X-Version": "v2.1",
    },
  });
}
