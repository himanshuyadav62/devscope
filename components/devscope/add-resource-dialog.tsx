"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NewResource, Resource } from "@/lib/database.types";
import { FormEvent, useState } from "react";

export function AddResourceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (resource: NewResource) => Promise<void>;
}) {
  const [type, setType] = useState<Resource["type"]>("Link");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await onAdd({ title: String(data.get("title")), url: String(data.get("url")) || null, type });
      setSaving(false);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Could not save resource.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="text-xs font-semibold uppercase text-[#1e6b55]">Personal collection</p>
          <DialogTitle>Add a resource</DialogTitle>
          <DialogDescription>
            Save a link, PDF, or note to your personal library.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-6">
          <ToggleGroup
            value={[type]}
            onValueChange={(value) => {
              const nextType = value.at(-1) as Resource["type"] | undefined;
              if (nextType) setType(nextType);
            }}
            spacing={0}
            variant="outline"
            size="sm"
            className="grid w-full grid-cols-3"
          >
            {(["Link", "PDF", "Note"] as const).map((option) => (
              <ToggleGroupItem type="button" key={option} value={option} className="w-full">
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="mt-5 block text-xs font-semibold" htmlFor="title">Title</label>
          <Input id="title" name="title" required autoFocus className="mt-2" />
          <label className="mt-4 block text-xs font-semibold" htmlFor="url">{type === "Note" ? "Reference URL (optional)" : "URL"}</label>
          <Input id="url" name="url" type={type === "Note" ? "text" : "url"} required={type !== "Note"} className="mt-2" />
          {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add to library"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
