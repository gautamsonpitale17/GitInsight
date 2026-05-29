"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigation-events";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import { SearchFieldSpinner } from "@/components/ui/SearchFieldSpinner";
import { ghBtnPrimary, ghBtnSecondary } from "@/lib/interactive-classes";

const inter = Inter({
  subsets: ["latin"],
  weight: ["700"],
});

const EXAMPLE_USERNAMES = ["torvalds", "karpathy", "gautamsonpitale17"] as const;

export function HomeSearchHero() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [isPending, startTransition] = useTransition();
  const trimmedUsername = username.trim();
  const isValidating =
    trimmedUsername.length > 0 && trimmedUsername !== debouncedUsername;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username.trim());
    }, 600);

    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (!debouncedUsername) {
      return;
    }

    void fetch(`/api/github/user?username=${encodeURIComponent(debouncedUsername)}`, {
      priority: "low",
    }).catch(() => {});

    router.prefetch(`/${debouncedUsername}`);
  }, [debouncedUsername, router]);

  function navigateToUser(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    emitNavigationStart();
    startTransition(() => {
      router.push(`/${trimmed}`);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToUser(username);
  }

  return (
    <section className="home-search-hero flex w-full flex-col items-center justify-center">
      <div className="w-full max-w-xl px-1 text-center sm:px-0">
        <h1
          className={`${inter.className} text-[28px] font-bold leading-tight tracking-tight text-gh-gray-7 sm:text-[40px] sm:leading-[1.1]`}
        >
          GitHub Activity Dashboard
        </h1>

        <p className="text-gh-body-large text-readable-hero mt-4 text-gh-gray-5">
          Paste any GitHub username to explore their public contribution data
        </p>

        <form onSubmit={handleSubmit} className="no-print mt-8 w-full">
          <div className="flex flex-col gap-2 rounded-full border border-gh-gray-2 bg-gh-surface p-1.5 shadow-sm focus-within:border-gh-blue focus-within:ring-2 focus-within:ring-gh-blue/20 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 sm:px-4">
              {isValidating ? (
                <SearchFieldSpinner />
              ) : (
                <Search
                  className="h-5 w-5 shrink-0 text-gh-gray-4"
                  aria-hidden
                />
              )}
              <label htmlFor="github-username" className="sr-only">
                GitHub username
              </label>
              <input
                id="github-username"
                type="search"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="GitHub username"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-gh-gray-7 placeholder:text-gh-gray-5"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className={`${ghBtnPrimary} tap-target-mobile shrink-0 gap-2 rounded-full px-6 py-2.5 sm:mr-0.5 disabled:cursor-wait disabled:opacity-90`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Loading</span>
                </>
              ) : (
                "Explore"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="w-full text-xs text-gh-gray-5 sm:w-auto sm:pr-1">
            Try:
          </span>
          {EXAMPLE_USERNAMES.map((name) => (
            <Link
              key={name}
              href={`/${name}`}
              prefetch={true}
              onClick={(event) => {
                event.preventDefault();
                navigateToUser(name);
              }}
              className={`${ghBtnSecondary} tap-target-mobile rounded-full px-3 py-1 text-gh-gray-6 max-sm:px-4`}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
