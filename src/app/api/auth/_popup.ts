import { NextResponse } from "next/server";

/** postMessage channel names — the opener listens for one of these. */
export type PopupMessageType = "mg_fb_auth" | "mg_google_auth";

/** Popup-closing HTML that reports the outcome to the opening page.
 *  postMessage is targeted at this exact origin — no wildcard listeners.
 *  Shared by the Facebook and Google OAuth return legs. */
export function popupResult(params: {
  ok: boolean;
  redirect?: string;
  error?: string;
  type: PopupMessageType;
}): NextResponse {
  const payload = JSON.stringify({
    type: params.type,
    ok: params.ok,
    redirect: params.redirect ?? null,
    error: params.error ?? null,
  });
  const safe = payload.replace(/</g, "\\u003c");
  return new NextResponse(
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MOKHTAR GYM</title>
<style>
  body{margin:0;background:#080808;font-family:system-ui,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#f5f5f5}
  .box{text-align:center;padding:32px}
  .emblem{font-size:22px;font-weight:900;letter-spacing:4px;color:#F5C400;margin-bottom:18px}
  .msg{font-size:14px;color:#a3a3a3;line-height:1.8}
  .close{margin-top:22px;display:inline-block;padding:10px 26px;border:1px solid #F5C40066;border-radius:8px;color:#F5C400;font-weight:700;font-size:13px;text-decoration:none}
</style></head>
<body><div class="box">
  <div class="emblem">MOKHTAR GYM</div>
  <div class="msg" id="msg"></div>
  <a class="close" href="#" onclick="window.close();return false">إغلاق النافذة · Fermer</a>
</div>
<script>
  var data = ${safe};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(data, window.location.origin);
    }
  } catch (e) {}
  var msg = document.getElementById('msg');
  if (msg) {
    msg.textContent = data.ok
      ? 'تم تسجيل الدخول بنجاح — جارٍ تحويلك إلى فضاء العضو.'
      : 'تعذّر إتمام تسجيل الدخول. أغلق النافذة وأعد المحاولة، أو استخدم البريد الإلكتروني.';
  }
  if (data.ok) setTimeout(function(){ window.close(); }, 900);
</script>
</body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-frame-options": "DENY",
      },
    }
  );
}
