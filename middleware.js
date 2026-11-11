// Private-site gate: everything except the legal pages needs the shared password.
// The password is NOT in the code: set SITE_PASSWORD in Vercel -> Settings -> Environment Variables.
export const config = {
  matcher: ["/((?!terms\\.html|privacy\\.html|copyright\\.html|contact\\.html|legal\\.css|favicon\\.ico).*)"],
};

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function token(pw) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode("ufc-roster-private-gate-v1")));
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const page = (msg, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1f15;color:#e4ede7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
form{width:min(340px,86vw);padding:28px;border-radius:16px;background:#12301f;border:1px solid #1f9d5a55;text-align:center}
h1{font-size:18px;margin:0 0 6px;letter-spacing:.04em}p{margin:0 0 16px;font-size:13px;color:#9db8a8}
input{width:100%;padding:12px;border-radius:10px;border:1px solid #1f9d5a66;background:#0b1f15;color:#fff;font-size:16px;margin-bottom:10px}
button{width:100%;padding:12px;border:0;border-radius:10px;background:#1f9d5a;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
.e{color:#ff8a8a;font-size:13px;margin-bottom:10px}a{color:#9db8a8;font-size:12px}</style></head><body>
<form method="POST" action="/__login"><h1>Private site</h1><p>Enter the password to continue.</p>${msg ? `<div class="e">${msg}</div>` : ""}
<input type="password" name="pw" placeholder="Password" autocomplete="current-password" autofocus required><button>Enter</button>
<p style="margin-top:14px"><a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · <a href="/copyright.html">Copyright</a> · <a href="/contact.html">Contact</a></p></form></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } }
  );

export default async function middleware(request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return page("Site password is not set yet.", 503); // fail closed
  const url = new URL(request.url);
  const want = await token(pw);

  if (url.pathname === "/__login" && request.method === "POST") {
    let given = "";
    try { given = String((await request.formData()).get("pw") || ""); } catch {}
    if (given && same(await token(given), want)) {
      return new Response(null, {
        status: 303,
        headers: { location: "/", "set-cookie": `gate=${want}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`, "cache-control": "no-store" },
      });
    }
    return page("Wrong password.", 401);
  }

  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)gate=([0-9a-f]+)/);
  if (m && same(m[1], want)) return new Response(null, { headers: { "x-middleware-next": "1" } });
  return page("");
}
