"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const CreateSessionDialog = dynamic(
  () =>
    import("@/components/create-session-dialog").then(
      (m) => m.CreateSessionDialog
    ),
  { ssr: false }
);

type Props = {
  variant?: "default" | "inline";
  label?: string;
};

export function NewSessionButton({ variant = "default", label }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default">
        {label ?? (variant === "inline" ? "Create your first session" : "New Session")}
      </Button>
      <CreateSessionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(session) => {
          setOpen(false);
          router.push(`/sessions/${session.id}`);
        }}
      />
    </>
  );
}
