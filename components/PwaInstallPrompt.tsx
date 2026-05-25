"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Listens for Chrome/Edge's `beforeinstallprompt` event and surfaces a
 * small floating chip on portal pages. Tapping the chip triggers the
 * native install flow.
 *
 * Behaviour:
 * - Only shows once the browser fires `beforeinstallprompt` (so iOS
 *   Safari, which doesn't, sees nothing — there's a separate hint in
 *   the user menu's "Install app" affordance you can add later).
 * - Dismissal is persisted to localStorage for 30 days so we don't
 *   nag the user every navigation.
 * - Hides itself once the app is installed (`appinstalled` event).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "meclones-pwa-prompt-dismissed-until";

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip entirely if previously dismissed (and the cool-off hasn't expired).
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const until = parseInt(raw, 10);
        if (Number.isFinite(until) && until > Date.now()) return;
      }
    } catch { /* localStorage unavailable */ }

    // Already running as an installed PWA → no prompt needed.
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return; // iOS

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") snooze();
    } catch { /* user closed */ }
    setVisible(false);
    setDeferred(null);
  };

  const snooze = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } catch { /* localStorage unavailable */ }
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-40 max-w-xs animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white rounded-2xl shadow-lift border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 ring-2 ring-gold-400/30 flex items-center justify-center shrink-0">
            <span className="text-gold-300 font-serif font-bold text-lg leading-none">M</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-900 text-sm">Install Meclones</p>
            <p className="text-xs text-slate-500 mt-0.5">Add the portal to your home screen for faster access and a real-app feel.</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                <Download className="h-3.5 w-3.5" /> Install
              </button>
              <button
                type="button"
                onClick={snooze}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={snooze}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-slate-700 p-1 -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
