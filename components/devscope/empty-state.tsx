import { Database } from "lucide-react";

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-20 text-center">
      <Database className="mx-auto size-6 text-[#98a09c]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[#7b847f]">{text}</p>
    </div>
  );
}
