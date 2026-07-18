"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Linkedin, MessageCircle, Download } from "lucide-react";

/** Share kit for the public profile: copy link, social shares, and a
 *  downloadable QR code (for event banners, business cards, stands). */
export function ShareTools({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 480, margin: 2,
      color: { dark: "#131233", light: "#F7F3EA" },
    }).then(setQr).catch(() => setQr(null));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const text = encodeURIComponent(`${name} — Member of the 193 Countries Consortium`);
  const encoded = encodeURIComponent(url);

  return (
    <div className="rounded-2xl border hairline bg-ink-800/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-mist">Share your profile</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={copy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2 text-sm font-medium text-ink-950 hover:shadow-glow">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 px-4 py-2 text-sm text-ivory-100 hover:bg-gold-500/10">
          <Linkedin className="h-4 w-4" /> LinkedIn
        </a>
        <a href={`https://wa.me/?text=${text}%20${encoded}`} target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 px-4 py-2 text-sm text-ivory-100 hover:bg-gold-500/10">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>

      {qr && (
        <div className="mt-5 flex items-center gap-5 border-t hairline pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Profile QR code" className="h-28 w-28 rounded-xl border hairline" />
          <div>
            <p className="text-sm text-ivory-100">Your profile QR</p>
            <p className="mt-1 text-xs leading-5 text-mist">
              Print it on your Summit stand, banner or business cards — scans straight to your public page.
            </p>
            <a href={qr} download="consortium-profile-qr.png"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-300 underline underline-offset-2">
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
