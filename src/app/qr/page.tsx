"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

function decodeBase64(b64: string) {
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export default function QRPreview({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [payload, setPayload] = useState<string>("");

  useEffect(() => {
    const p = (searchParams?.p as string) || "";
    const decoded = p ? decodeBase64(p) : "";
    if (!decoded) {
      setError("Invalid or missing QR payload.");
      return;
    }
    setPayload(decoded);

    let cancelled = false;
    (async () => {
      try {
        const url = await QRCode.toDataURL(decoded, {
          width: 512,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (error) {
        if (!cancelled)
          setError((error as Error).message || "Failed to render QR.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function onDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">AfraTech Contact QR Preview</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
         
      <div className="flex flex-col items-center gap-4">
         <h1 className="text-xl font-semibold text-black">AfraTech Contact QR Preview</h1>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={256}
            height={256}
            className="border rounded-md p-3 bg-white"
          />
        ) : (
          <p className="text-muted-foreground">Generating QR…</p>
        )}

        <div className="flex gap-2">
          <Button onClick={onDownload} disabled={!qrDataUrl} className="bg-[#2564a6] hover:bg-[#7ab8dc]">
            Download PNG
          </Button>
        </div>
      </div>
    </main>
  );
}
