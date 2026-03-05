"use client";

import { ClipboardList } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-mr-navy/8 flex items-center justify-center text-mr-navy mb-4">
        {icon ?? <ClipboardList className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-mr-navy">{title}</h3>
      {description && (
        <p className="text-sm text-mr-text-secondary mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
