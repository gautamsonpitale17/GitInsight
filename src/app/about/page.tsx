import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="app-page-scroll gh-page-with-header gh-container w-full max-w-none py-6 sm:py-8">
    <article className="max-w-2xl space-y-4">
      <h1 className="text-gh-gray-7">About GitInsight</h1>
      <p className="text-readable text-gh-gray-5 leading-relaxed">
        GitInsight turns public GitHub activity into clear charts and stats —
        contributions, languages, stars, streaks, and more — with a layout inspired
        by GitHub&apos;s own design language.
      </p>
      <p className="text-readable text-gh-gray-5 leading-relaxed">
        Enter any GitHub username on the home page to explore their profile
        analytics. No login required; data is fetched from the public GitHub API.
      </p>
    </article>
    </div>
  );
}
