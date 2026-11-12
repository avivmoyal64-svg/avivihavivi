// Private-site gate: everything except the legal pages needs the shared password.
// The password is NOT in the code: set SITE_PASSWORD in Vercel -> Settings -> Environment Variables.
export const config = {
  matcher: ["/((?!terms\\.html|privacy\\.html|copyright\\.html|contact\\.html|legal\\.css|gate-bg\\.jpg|favicon\\.ico|manifest\\.webmanifest|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|sw\\.js).*)"],
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
<style>*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:#050b1f;color:#e8eeff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
.bg{position:fixed;inset:0;background:url(/gate-bg.jpg) center 30%/cover no-repeat}
.bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,11,31,.15) 0%,rgba(5,11,31,.25) 45%,rgba(5,11,31,.92) 100%),linear-gradient(180deg,rgba(10,30,90,.25),rgba(5,11,31,.55))}
.wrap{position:relative;height:100%;display:flex;align-items:center;justify-content:flex-end;padding:0 6vw}
form{width:min(360px,88vw);padding:28px;border-radius:16px;background:rgba(10,24,64,.86);backdrop-filter:blur(6px);border:1px solid #2f6bff66;border-top:3px solid #e5243b;text-align:center;box-shadow:0 18px 50px #0008}
h1{font-size:18px;margin:0 0 6px;letter-spacing:.08em;text-transform:uppercase}p{margin:0 0 16px;font-size:13px;color:#a9b9e6}
input{width:100%;padding:12px;border-radius:10px;border:1px solid #2f6bff88;background:#070f2b;color:#fff;font-size:16px;margin-bottom:10px}
button{width:100%;padding:12px;border:0;border-radius:10px;background:#e5243b;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
button:hover{background:#ff3550}.e{color:#ff8a98;font-size:13px;margin-bottom:10px}a{color:#8fb0ff;font-size:12px}
.cr{position:fixed;left:10px;bottom:6px;font-size:10px;color:#ffffffaa;text-shadow:0 1px 3px #000}
@media(max-width:700px){.bg{bottom:auto;height:58vh;background-position:center 20%}.bg:after{background:linear-gradient(180deg,rgba(10,30,90,.1) 40%,#050b1f 100%)}
.wrap{align-items:flex-end;justify-content:center;padding:0 0 4vh}}</style></head><body><div class="bg"></div><div class="wrap">
<form method="POST" action="/__login"><h1>Private site</h1><p>Enter the password to continue.</p>${msg ? `<div class="e">${msg}</div>` : ""}
<input type="password" name="pw" placeholder="Password" autocomplete="current-password" autofocus required><button>Enter</button>
<p style="margin-top:14px">Don't have the password? Ask Aviv</p>
<p style="margin-top:6px"><a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · <a href="/copyright.html">Copyright</a> · <a href="/contact.html">Contact</a></p></form></div>
<div class="cr"><a href="/copyright.html" style="color:#ffffffaa;font-size:10px">Photo: U.S. Army, public domain</a></div></body></html>`,
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
