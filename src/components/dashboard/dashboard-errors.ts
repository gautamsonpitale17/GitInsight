import type { DashboardSection, DashboardSectionError } from "@/types/github";

export function getSectionErrorEntry(
  errors: DashboardSectionError[],
  section: DashboardSection,
): DashboardSectionError | undefined {
  return errors.find((entry) => entry.section === section);
}

export function getSectionError(
  errors: DashboardSectionError[],
  section: DashboardSection,
): string | undefined {
  return getSectionErrorEntry(errors, section)?.message;
}
