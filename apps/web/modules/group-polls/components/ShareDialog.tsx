"use client";

import { useState, useRef, useCallback } from "react";
import QRCode from "react-qr-code";

import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollTitle: string;
  shareSlug: string;
}

export function ShareDialog({ open, onOpenChange, pollTitle, shareSlug }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Build the share URL
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/poll/${shareSlug}` : `/poll/${shareSlug}`;

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast("Link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast("Failed to copy link", "error");
    }
  }, [shareUrl]);

  const downloadQR = useCallback(() => {
    if (!qrRef.current) return;

    // Get the SVG element
    const svg = qrRef.current.querySelector("svg");
    if (!svg) {
      showToast("QR code not found", "error");
      return;
    }

    // Create a canvas and draw the SVG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showToast("Canvas not supported", "error");
      return;
    }

    // Set canvas size (QR code size + padding)
    const size = 256;
    const padding = 16;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(svgUrl);

      // Download the canvas as PNG
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("Failed to generate image", "error");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${pollTitle.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("QR code downloaded!", "success");
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      showToast("Failed to load QR code", "error");
    };
    img.src = svgUrl;
  }, [pollTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Share Poll"
          subtitle="Anyone with this link can submit availability"
        />
        <div className="flex flex-col items-center gap-6 py-6">
          {/* QR Code */}
          <div
            ref={qrRef}
            className="rounded-lg border border-subtle bg-white p-4"
          >
            <QRCode
              value={shareUrl}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* URL Display */}
          <div className="w-full">
            <label className="text-subtle mb-1 block text-sm font-medium">
              Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="border-subtle bg-muted text-default flex-1 rounded-md border px-3 py-2 text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                color="secondary"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={downloadQR}>
            Download QR
          </Button>
          <Button onClick={copyToClipboard}>
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
