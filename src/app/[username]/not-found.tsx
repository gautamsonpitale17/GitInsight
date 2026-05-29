"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { OctocatIllustration } from "@/components/dashboard/OctocatIllustration";
import { USER_NOT_FOUND_TITLE } from "@/lib/format";
import { ghBtnPrimaryMd, ghBtnSecondaryMd } from "@/lib/interactive-classes";

function getUsernameFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) {
    return "unknown";
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default function UsernameNotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const username = getUsernameFromPath(pathname);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center sm:py-16">
      <OctocatIllustration className="h-40 w-40 sm:h-48 sm:w-48" />

      <p className="mt-6 text-sm font-medium uppercase tracking-wide text-gh-gray-4">
        404
      </p>

      <h1 className="mt-2 text-gh-gray-7">
        {USER_NOT_FOUND_TITLE}
      </h1>

      <p className="text-readable mt-3 text-sm leading-relaxed text-gh-gray-5">
        <span className="font-mono font-semibold text-gh-gray-7">@{username}</span>{" "}
        doesn&apos;t exist on GitHub or isn&apos;t publicly accessible.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className={ghBtnPrimaryMd}
        >
          Try another username
        </button>
        <Link
          href="/"
          className={ghBtnSecondaryMd}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
