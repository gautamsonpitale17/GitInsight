import Loader2 from "lucide-react/dist/esm/icons/loader-2.mjs";
import { cn } from "@/lib/utils";

type SearchFieldSpinnerProps = {
  className?: string;
  label?: string;
};

/** Spinner shown in the search field while username validation is in progress. */
export function SearchFieldSpinner({
  className,
  label = "Checking username",
}: SearchFieldSpinnerProps) {
  return (
    <span className={cn("inline-flex shrink-0", className)} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-gh-gray-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
