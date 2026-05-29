import { SectionErrorState } from "./SectionErrorState";

type SectionMessageProps = {
  message: string;
  resetAt?: string | null;
  variant?: "error" | "empty";
};

export function SectionMessage({
  message,
  resetAt,
  variant = "empty",
}: SectionMessageProps) {
  if (variant === "error") {
    return <SectionErrorState message={message} resetAt={resetAt} />;
  }

  return (
    <p className="text-readable text-sm text-gh-gray-5">{message}</p>
  );
}
