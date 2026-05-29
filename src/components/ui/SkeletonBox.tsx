import { Shimmer } from "@/components/ui/Shimmer";
import { cn } from "@/lib/utils";

type SkeletonBoxProps = {
  h: number;
  className?: string;
};

export function SkeletonBox({ h, className }: SkeletonBoxProps) {
  return (
    <Shimmer
      className={cn("w-full rounded-md", className)}
      style={{ height: h }}
    />
  );
}
