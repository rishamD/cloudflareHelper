addEventListener("fetch", (event) => {
  event.respondWith(
    handle(event.request).catch((err) => {
      return new Response(
        JSON.stringify({ error: "uncaught", details: err.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    })
  );
});

async function handle(req) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return new Response(JSON.stringify({ error: "missing url parameter" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "invalid url" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Strip hop-by-hop headers that shouldn't be forwarded
  const forbidden = new Set([
    "host",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
  ]);

  const forwardHeaders = new Headers();
  forwardHeaders.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  forwardHeaders.set("Accept-Language", "en-US,en;q=0.9");

  for (const [key, value] of req.headers.entries()) {
    if (!forbidden.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  const res = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: forwardHeaders,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    redirect: "follow",
  });

  const resHeaders = new Headers(res.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  resHeaders.set("Access-Control-Allow-Headers", "*");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}
