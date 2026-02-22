"use client";

import { Button } from "@/components/ui/button";

interface FormModeToggleProps {
  mode: "static" | "dynamic";
  onChange: (mode: "static" | "dynamic") => void;
  disabled?: boolean;
}

export function FormModeToggle({
  mode,
  onChange,
  disabled,
}: FormModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={mode === "static" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("static")}
        disabled={disabled}
        className={
          mode === "static" ? "bg-mr-navy text-white" : "text-mr-text-secondary"
        }
      >
        Statik
      </Button>
      <Button
        variant={mode === "dynamic" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("dynamic")}
        disabled={disabled}
        className={
          mode === "dynamic"
            ? "bg-mr-navy text-white"
            : "text-mr-text-secondary"
        }
      >
        Dinamik
      </Button>
    </div>
  );
}
