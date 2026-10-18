import { useState } from "react";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the input below still lets them select and copy manually
    }
  }

  return (
    <div className="row">
      <input value={url} readOnly onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
      <button type="button" className="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
