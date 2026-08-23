"use client";

import { Printer } from "lucide-react";
import { Button } from "./form-controls";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer size={18} aria-hidden />
      印刷する
    </Button>
  );
}
