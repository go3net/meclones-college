/*!
 * SchoolBot website widget — https://schoolbot.com.ng
 *
 * Usage (one line on any page of the school's website):
 *   <script src="https://schoolbot.com.ng/embed/v1.js" data-key="sb_…" async></script>
 *
 * Optional attributes:
 *   data-mode="chat" | "whatsapp"   chat (default) = AI assistant + WhatsApp handoff;
 *                                    whatsapp = just a WhatsApp button
 *   data-position="right" | "left"  which corner (default right)
 *   data-color="#0B1F4B"            override the school's primary colour
 *
 * Everything renders inside a Shadow DOM so the host page's CSS and the
 * widget's CSS never collide. No dependencies.
 */
(function () {
  "use strict";
  if (window.__schoolbotWidgetLoaded) return;
  window.__schoolbotWidgetLoaded = true;

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf("/embed/v1.js") !== -1) { script = all[i]; break; }
    }
  }
  if (!script) return;

  var key = script.getAttribute("data-key");
  if (!key) { console.warn("[schoolbot] data-key missing on the widget script tag"); return; }
  var base = script.src.replace(/\/embed\/v1\.js.*$/, "");
  var mode = (script.getAttribute("data-mode") || "chat").toLowerCase();
  var position = (script.getAttribute("data-position") || "right").toLowerCase() === "left" ? "left" : "right";
  var colorOverride = script.getAttribute("data-color");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Minimal, safe formatting for assistant replies: escape everything
  // first, then allow **bold** and turn bare URLs into links.
  function fmt(text) {
    return esc(text)
      .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noreferrer noopener">$1</a>');
  }

  var WA_ICON ='<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>';
  var CHAT_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  function css(primary, accent, side) {
    return [
      ":host{all:initial}",
      "*{box-sizing:border-box}",
      ".sb-root{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;color:#0f172a}",
      ".sb-fab{display:inline-flex;align-items:center;gap:10px;border:0;cursor:pointer;border-radius:999px;padding:10px 18px 10px 12px;color:#fff;background:" + primary + ";box-shadow:0 10px 30px rgba(2,6,23,.25);font-weight:600;font-size:14px}",
      ".sb-fab:hover{filter:brightness(1.08)}",
      ".sb-fab.wa{background:#25D366}",
      ".sb-fab .sb-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;position:relative}",
      ".sb-fab .sb-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}",
      ".sb-dot{position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:50%;background:#34d399;box-shadow:0 0 0 2px #fff}",
      ".sb-panel{position:fixed;bottom:0;" + side + ":0;width:100%;height:80vh;max-height:80vh;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 25px 60px rgba(2,6,23,.35);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0}",
      "@media(min-width:640px){.sb-panel{bottom:20px;" + side + ":20px;width:380px;height:560px;border-radius:16px}}",
      ".sb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:" + primary + ";color:#fff}",
      ".sb-head .sb-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;position:relative;flex:none}",
      ".sb-head .sb-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}",
      ".sb-title{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".sb-sub{font-size:11px;color:#a7f3d0;display:flex;align-items:center;gap:6px}",
      ".sb-sub i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399}",
      ".sb-x{background:none;border:0;color:rgba(255,255,255,.85);cursor:pointer;padding:4px;border-radius:6px}",
      ".sb-x:hover{color:#fff}",
      ".sb-msgs{flex:1;overflow-y:auto;background:#f8fafc;padding:14px 12px;display:flex;flex-direction:column;gap:10px}",
      ".sb-row{display:flex}.sb-row.user{justify-content:flex-end}",
      ".sb-bub{max-width:85%;border-radius:16px;padding:8px 12px;white-space:pre-wrap;word-wrap:break-word}",
      ".sb-row.user .sb-bub{background:" + primary + ";color:#fff;border-bottom-right-radius:4px}",
      ".sb-row.bot .sb-bub{background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}",
      ".sb-row.bot .sb-bub a{color:" + primary + ";text-decoration:underline;word-break:break-all}",
      ".sb-typing{display:inline-block;width:32px;text-align:left;letter-spacing:2px;color:#94a3b8}",
      ".sb-quick{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 4px;border-top:1px solid #f1f5f9;background:#fff}",
      ".sb-quick button{font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:" + primary + ";cursor:pointer}",
      ".sb-quick button:hover{background:#f1f5f9}",
      ".sb-input{border-top:1px solid #f1f5f9;background:#fff;padding:12px}",
      ".sb-input form{display:flex;align-items:flex-end;gap:8px}",
      ".sb-input textarea{flex:1;resize:none;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;font:inherit;min-height:40px;max-height:120px;outline:none}",
      ".sb-input textarea:focus{border-color:" + primary + ";box-shadow:0 0 0 3px rgba(11,31,75,.12)}",
      ".sb-send{display:inline-flex;align-items:center;justify-content:center;background:" + primary + ";color:#fff;border:0;border-radius:10px;width:40px;height:40px;cursor:pointer}",
      ".sb-send:disabled{opacity:.5;cursor:not-allowed}",
      ".sb-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:10px;color:#64748b}",
      ".sb-foot a{color:#047857;font-weight:600;text-decoration:none}",
      ".sb-foot a:hover{text-decoration:underline}",
      ".sb-brand{font-size:10px;color:#94a3b8;text-align:center;padding:4px 0 6px;background:#fff}",
      ".sb-brand a{color:#94a3b8;text-decoration:none}",
      ".sb-brand b{color:" + accent + "}",
    ].join("");
  }

  function waLink(cfg) {
    return "https://wa.me/" + encodeURIComponent(cfg.school.whatsapp) + "?text=" + encodeURIComponent(cfg.chat.whatsappText);
  }

  function boot(cfg) {
    var primary = colorOverride || cfg.brand.primaryHex || "#0B1F4B";
    var accent = cfg.brand.accentHex || "#D4A017";
    var host = document.createElement("div");
    host.setAttribute("data-schoolbot-widget", "");
    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var style = document.createElement("style");
    style.textContent = css(primary, accent, position);
    root.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "sb-root";
    root.appendChild(wrap);

    var avatarHtml = cfg.brand.logoUrl
      ? '<img src="' + esc(cfg.brand.logoUrl) + '" alt="">'
      : CHAT_ICON;

    // WhatsApp-only mode: a single green button.
    if (mode === "whatsapp" || !cfg.chat.enabled) {
      var a = document.createElement("a");
      a.className = "sb-fab wa";
      a.href = waLink(cfg);
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      a.setAttribute("aria-label", "Chat with " + cfg.school.shortName + " on WhatsApp");
      a.innerHTML = WA_ICON + "<span>Chat on WhatsApp</span>";
      wrap.appendChild(a);
      return;
    }

    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "sb-fab";
    fab.setAttribute("aria-label", "Chat with the " + cfg.school.shortName + " assistant");
    fab.innerHTML = '<span class="sb-avatar">' + avatarHtml + '<span class="sb-dot"></span></span><span>Chat with us</span>';
    wrap.appendChild(fab);

    var panel = document.createElement("div");
    panel.className = "sb-panel";
    panel.style.display = "none";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", cfg.school.shortName + " assistant");
    panel.innerHTML =
      '<div class="sb-head">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0">' +
          '<span class="sb-avatar">' + avatarHtml + '<span class="sb-dot"></span></span>' +
          '<div style="min-width:0"><div class="sb-title">' + esc(cfg.school.shortName) + ' Assistant</div>' +
          '<div class="sb-sub"><i></i>Online · usually replies instantly</div></div>' +
        '</div>' +
        '<button type="button" class="sb-x" aria-label="Close chat">' + CLOSE_ICON + '</button>' +
      '</div>' +
      '<div class="sb-msgs"></div>' +
      '<div class="sb-quick"></div>' +
      '<div class="sb-input"><form>' +
        '<textarea rows="1" placeholder="Type your question…" aria-label="Your question"></textarea>' +
        '<button type="submit" class="sb-send" aria-label="Send">' + SEND_ICON + '</button>' +
      '</form>' +
        '<div class="sb-foot"><span>For your child’s records, log in to the portal.</span>' +
        '<a href="' + esc(waLink(cfg)) + '" target="_blank" rel="noreferrer noopener">Prefer WhatsApp? Tap here →</a></div>' +
      '</div>' +
      '<div class="sb-brand"><a href="https://schoolbot.com.ng" target="_blank" rel="noreferrer noopener">Powered by <b>SchoolBot</b></a></div>';
    wrap.appendChild(panel);

    var msgs = panel.querySelector(".sb-msgs");
    var quick = panel.querySelector(".sb-quick");
    var form = panel.querySelector("form");
    var input = panel.querySelector("textarea");
    var sendBtn = panel.querySelector(".sb-send");
    var history = [{ role: "assistant", content: cfg.chat.greeting }];
    var busy = false;

    function render() {
      msgs.innerHTML = "";
      for (var i = 0; i < history.length; i++) {
        var m = history[i];
        var row = document.createElement("div");
        row.className = "sb-row " + (m.role === "user" ? "user" : "bot");
        var bub = document.createElement("div");
        bub.className = "sb-bub";
        if (!m.content && busy && i === history.length - 1) {
          bub.innerHTML = '<span class="sb-typing">•••</span>';
        } else if (m.role === "user") {
          bub.textContent = m.content;
        } else {
          bub.innerHTML = fmt(m.content);
        }
        row.appendChild(bub);
        msgs.appendChild(row);
      }
      msgs.scrollTop = msgs.scrollHeight;
      quick.style.display = history.length <= 1 && !busy ? "" : "none";
    }

    (cfg.chat.quickPrompts || []).forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = p;
      b.addEventListener("click", function () { send(p); });
      quick.appendChild(b);
    });

    function setLast(text) {
      history[history.length - 1] = { role: "assistant", content: text };
      render();
    }

    function send(raw) {
      var text = String(raw || "").trim();
      if (!text || busy) return;
      input.value = "";
      var outbound = history.concat([{ role: "user", content: text }]);
      history = outbound.concat([{ role: "assistant", content: "" }]);
      busy = true;
      sendBtn.disabled = true;
      render();

      fetch(base + "/api/embed/chat?key=" + encodeURIComponent(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outbound }),
      }).then(function (res) {
        if (!res.ok || !res.body) {
          return res.json().catch(function () { return {}; }).then(function (err) {
            setLast(err && err.message ? err.message : "Sorry, I hit a snag. Please call " + cfg.school.phone + ".");
          });
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var acc = "";
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buffer += decoder.decode(r.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (var i = 0; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              try {
                var evt = JSON.parse(lines[i]);
                if (evt.type === "delta" && typeof evt.text === "string") {
                  acc += evt.text;
                  setLast(acc);
                }
              } catch (e) { /* skip bad chunk */ }
            }
            return pump();
          });
        }
        return pump();
      }).catch(function () {
        setLast("Sorry, I couldn’t reach the assistant just now. Please call " + cfg.school.phone + " or email " + cfg.school.email + ".");
      }).then(function () {
        busy = false;
        sendBtn.disabled = false;
        render();
        input.focus();
      });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
    input.addEventListener("keydown", function (e) {
      var isEnter = e.key === "Enter" || e.key === "Return" || e.keyCode === 13;
      if (isEnter && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    fab.addEventListener("click", function () {
      panel.style.display = "flex";
      fab.style.display = "none";
      render();
      setTimeout(function () { input.focus(); }, 50);
    });
    panel.querySelector(".sb-x").addEventListener("click", function () {
      panel.style.display = "none";
      fab.style.display = "";
    });
    render();
  }

  function start() {
    fetch(base + "/api/embed/config?key=" + encodeURIComponent(key), { credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error("config " + r.status); return r.json(); })
      .then(boot)
      .catch(function (e) { console.warn("[schoolbot] widget not loaded:", e && e.message ? e.message : e); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
