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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

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

  // Headers that should never be forwarded
  const forbidden = new Set([
    "host",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
    "cf-ew-via",
    "cf-worker",
    "cdn-loop",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
    "user-agent", // we set our own below
  ]);

  const forwardHeaders = new Headers();

  // Spoof a real Chrome browser
  forwardHeaders.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  forwardHeaders.set("Accept-Language", "en-US,en;q=0.9");
  forwardHeaders.set(
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
  );

  // Forward remaining headers from the client
  for (const [key, value] of req.headers.entries()) {
    if (!forbidden.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  const isBodyMethod = !["GET", "HEAD"].includes(req.method);
  let body = undefined;
  if (isBodyMethod) {
    body = await req.arrayBuffer();
  }

  const res = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: forwardHeaders,
    body: isBodyMethod && body.byteLength > 0 ? body : undefined,
    redirect: "follow",
  });

  const resHeaders = new Headers(res.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  resHeaders.set("Access-Control-Allow-Headers", "*");
  // Remove encoding headers since Workers decode it automatically
  resHeaders.delete("content-encoding");
  resHeaders.delete("transfer-encoding");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}
