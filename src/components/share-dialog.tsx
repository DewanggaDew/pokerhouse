"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareCode: string;
};

export function ShareDialog({ open, onOpenChange, shareCode }: Props) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${shareCode}`
      : "";

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Results</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="rounded-lg border p-4 bg-white">
            <QRCodeSVG value={shareUrl} size={200} level="M" />
          </div>
          <div className="w-full space-y-2">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs font-mono" />
              <Button variant="outline" onClick={copyLink} className="shrink-0">
                Copy
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Anyone with this link can view the session results
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
