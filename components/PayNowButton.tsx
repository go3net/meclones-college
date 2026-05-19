"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

interface Props {
  feeId: string;
  defaultAmount: number;
  /** Balance — cap the input so parents can't try to pay more than is owed. */
  maxAmount: number;
  /** Pass false on rows with zero balance to disable the button. */
  enabled?: boolean;
}

export function PayNowButton({ feeId, defaultAmount, maxAmount, enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeId, amount }),
      });
      const json = await res.json();
      if (!res.ok || !json.authorization_url) {
        throw new Error(json.error ?? "Could not start payment");
      }
      window.location.href = json.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  if (!enabled || maxAmount <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
        ✓ Paid
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 bg-gold-400 hover:bg-gold-300 text-brand-900 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
      >
        <CreditCard className="h-3.5 w-3.5" /> Pay now
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && setOpen(false)}>
          <div className="bg-white rounded-xl shadow-lift max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-brand-900 mb-1">Pay online via Paystack</h3>
            <p className="text-xs text-slate-500 mb-4">Outstanding balance: <strong className="text-brand-900">₦{maxAmount.toLocaleString("en-NG")}</strong></p>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Amount (₦)</label>
                <input
                  type="number"
                  min={100}
                  max={maxAmount}
                  step={100}
                  required
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <p className="text-[11px] text-slate-500 mt-1">You can pay part or all of the balance — the difference stays owed.</p>
              </div>

              {error && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} disabled={loading} className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2">Cancel</button>
                <button type="submit" disabled={loading || amount <= 0 || amount > maxAmount} className="inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-300 text-brand-900 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</> : <><CreditCard className="h-4 w-4" /> Continue to Paystack</>}
                </button>
              </div>
            </form>

            <p className="text-[10px] text-slate-400 mt-4 text-center">Secured by Paystack — your card details never touch our server.</p>
          </div>
        </div>
      )}
    </>
  );
}
