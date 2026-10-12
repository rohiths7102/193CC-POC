"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> Print / save PDF
    </Button>
  );
}
