const VIEWPORT_MARGIN = 8;
const TRANSFORM_NUDGE = 8;
const TOOLTIP_ESTIMATE_WIDTH = 220;
const TOOLTIP_ESTIMATE_HEIGHT = 56;

export type ClampedTooltipPosition = {
  left: number;
  top: number;
  transform: string;
};

export type TooltipPositionOptions = {
  preferBelow?: boolean;
  estimateHeight?: number;
  estimateWidth?: number;
};

/**
 * Computes fixed viewport coordinates for a tooltip anchored to a cell rect.
 */
export function getClampedTooltipPosition(
  rect: DOMRect,
  options?: TooltipPositionOptions,
): ClampedTooltipPosition {
  const estimateHeight = options?.estimateHeight ?? TOOLTIP_ESTIMATE_HEIGHT;
  const estimateWidth = options?.estimateWidth ?? TOOLTIP_ESTIMATE_WIDTH;
  const centerX = rect.left + rect.width / 2;

  let flipLeft = centerX > window.innerWidth / 2;
  let flipTop =
    !options?.preferBelow &&
    rect.top < estimateHeight + VIEWPORT_MARGIN + TRANSFORM_NUDGE;

  if (
    rect.bottom + estimateHeight + VIEWPORT_MARGIN + TRANSFORM_NUDGE >
    window.innerHeight
  ) {
    flipTop = true;
  }

  let left = centerX;
  let top = flipTop ? rect.top : rect.bottom;
  let transform = flipLeft
    ? flipTop
      ? "translate(calc(-100% - 8px), calc(-100% - 8px))"
      : "translate(calc(-100% - 8px), 8px)"
    : flipTop
      ? "translate(8px, calc(-100% - 8px))"
      : "translate(8px, 8px)";

  const halfW = estimateWidth / 2;
  if (left - halfW < VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN + halfW;
  } else if (left + halfW > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - VIEWPORT_MARGIN - halfW;
  }

  const visualTop = (anchorTop: number, above: boolean) =>
    above ? anchorTop - estimateHeight - TRANSFORM_NUDGE : anchorTop + TRANSFORM_NUDGE;

  const visualBottom = (anchorTop: number, above: boolean) =>
    visualTop(anchorTop, above) + estimateHeight;

  if (flipTop && visualTop(top, true) < VIEWPORT_MARGIN) {
    flipTop = false;
    top = rect.bottom;
    transform = flipLeft
      ? "translate(calc(-100% - 8px), 8px)"
      : "translate(8px, 8px)";
  }

  if (!flipTop && visualBottom(top, false) > window.innerHeight - VIEWPORT_MARGIN) {
    flipTop = true;
    top = rect.top;
    transform = flipLeft
      ? "translate(calc(-100% - 8px), calc(-100% - 8px))"
      : "translate(8px, calc(-100% - 8px))";
  }

  if (flipTop && visualTop(top, true) < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN + estimateHeight + TRANSFORM_NUDGE;
  }

  if (!flipTop && visualBottom(top, false) > window.innerHeight - VIEWPORT_MARGIN) {
    top =
      window.innerHeight - VIEWPORT_MARGIN - estimateHeight - TRANSFORM_NUDGE;
  }

  return { left, top, transform };
}
