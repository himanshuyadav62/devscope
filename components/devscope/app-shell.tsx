"use client";

import { AddResourceDialog } from "@/components/devscope/add-resource-dialog";
import { navItems, type DevscopeView } from "@/components/devscope/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NewResource, Resource } from "@/lib/database.types";
import {
  Bell,
  Database,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

function getView(pathname: string): DevscopeView {
  if (pathname === "/library") return "library";
  if (pathname === "/inbox") return "inbox";
  if (pathname === "/plugins") return "plugins";
  return "today";
}

export function AppShell({
  children,
  topics,
  savedStoriesCount,
  user,
}: {
  children: ReactNode;
  topics: string[];
  savedStoriesCount: number;
  user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const view = getView(pathname);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("devscope-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

    document.documentElement.classList.toggle("dark", shouldUseDark);
    queueMicrotask(() => setDarkMode(shouldUseDark));
  }, []);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("devscope-theme", next ? "dark" : "light");
      return next;
    });
  }

  async function addResource(input: NewResource) {
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as Resource | { error: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Save failed.");

    setShowAdd(false);
    router.push("/library");
    router.refresh();
    setNotice("Resource saved to the database.");
  }

  return (
    <div className="devscope-shell min-h-screen bg-[#f5f6f3] text-[#1c211f] transition-colors dark:bg-[#101513] dark:text-[#edf1ee]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#dfe2dc] bg-[#fafbf8] transition-colors dark:border-[#2b3530] dark:bg-[#151b18] lg:block">
        <SidebarContent
          view={view}
          navigate={(href) => router.push(href)}
          topics={topics}
          savedStoriesCount={savedStoriesCount}
          user={user}
        />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-64 max-w-64 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Switch between your Devscope views.</SheetDescription>
          </SheetHeader>
          <SidebarContent
            view={view}
            navigate={(href) => router.push(href)}
            topics={topics}
            savedStoriesCount={savedStoriesCount}
            user={user}
            onNavigate={() => setMobileNav(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#dfe2dc] bg-[#f5f6f3]/95 px-4 backdrop-blur dark:border-[#2b3530] dark:bg-[#101513]/95 md:px-8">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-3 lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a938e]" />
            <Input placeholder="Search stories, sources, topics..." className="pl-9" />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="ml-auto"
            aria-label={darkMode ? "Use light mode" : "Use dark mode"}
            title={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" className="mr-2" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add resource</span>
          </Button>
        </header>

        {notice ? (
          <Button onClick={() => setNotice(null)} className="fixed bottom-5 right-5 z-30 shadow-xl">
            {notice}
            <X className="size-3.5" />
          </Button>
        ) : null}

        {children}
      </main>

      <AddResourceDialog open={showAdd} onOpenChange={setShowAdd} onAdd={addResource} />
    </div>
  );
}

function SidebarContent({
  view,
  navigate,
  topics,
  savedStoriesCount,
  user,
  onNavigate,
}: {
  view: DevscopeView;
  navigate: (href: string) => void;
  topics: string[];
  savedStoriesCount: number;
  user: {
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  onNavigate?: () => void;
}) {
  function go(href: string) {
    navigate(href);
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="flex h-10 items-center px-2">
        <Button variant="ghost" className="h-auto justify-start gap-2.5 px-0" onClick={() => go("/")}>
          <span className="grid size-7 place-items-center bg-[#1e5f4d] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[17px] font-bold">devscope</span>
        </Button>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={view === item.id ? "secondary" : "ghost"}
              onClick={() => go(item.href)}
              className="h-10 w-full justify-start gap-3 px-3"
            >
              <Icon className="size-4" />
              {item.label}
              {item.id === "inbox" ? (
                <Badge variant="secondary" className="ml-auto">
                  {savedStoriesCount}
                </Badge>
              ) : null}
            </Button>
          );
        })}
      </nav>

      {topics.length ? (
        <div className="mt-8 px-3">
          <p className="text-[11px] font-semibold uppercase text-[#969e99]">Topics</p>
          <div className="mt-3 space-y-2.5">
            {topics.slice(0, 6).map((item) => (
              <Button
                key={item}
                variant="ghost"
                className="h-auto w-full justify-start gap-2.5 px-0 py-0"
                onClick={() => go(`/?topic=${encodeURIComponent(item)}`)}
              >
                <span className="size-1.5 rounded-full bg-[#1e5f4d]" />
                <span className="truncate">{item}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 px-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dce8e2] text-xs font-bold text-[#1e5f4d]">
            {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user.name ?? "Signed in"}</p>
            <p className="truncate text-[11px] text-[#77807b]">{user.email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-3">
          <Button type="submit" variant="ghost" className="h-9 w-full justify-start gap-3 px-3">
            <Settings className="size-4" />
            Sign out
          </Button>
        </form>
        <p className="mt-2 flex items-center gap-2 px-3 text-[11px] text-[#77807b]">
          <Database className="size-3.5 text-[#1e5f4d]" />
          Private Supabase workspace
        </p>
      </div>
    </div>
  );
}
