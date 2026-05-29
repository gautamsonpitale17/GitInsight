"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import { emitNavigationStart } from "@/lib/navigation-events";
import { DASHBOARD_USER_SEARCH_ID } from "@/lib/dashboard-actions";
import { cn } from "@/lib/utils";

type DashboardUserSearchProps = {
  currentUsername: string;
  className?: string;
};

export function DashboardUserSearch({
  currentUsername,
  className,
}: DashboardUserSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const login = currentUsername.trim();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsername = query.trim();
    if (!nextUsername || nextUsername.toLowerCase() === login.toLowerCase()) {
      return;
    }
    emitNavigationStart();
    router.push(`/${encodeURIComponent(nextUsername)}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        "no-print flex w-full min-w-0 items-center gap-2 rounded-md border border-gh-gray-2 bg-gh-surface px-3 py-1.5 shadow-sm focus-within:border-gh-blue focus-within:ring-2 focus-within:ring-gh-blue/20 sm:max-w-xs",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-gh-gray-4" aria-hidden />
      <label htmlFor={DASHBOARD_USER_SEARCH_ID} className="sr-only">
        Search another user
      </label>
      <input
        id={DASHBOARD_USER_SEARCH_ID}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search another user…"
        autoComplete="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-gh-gray-7 placeholder:text-gh-gray-5"
      />
    </form>
  );
}
