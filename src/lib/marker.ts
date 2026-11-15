/**
 * The point marker, shared by the main map and the comparison map so the dot
 * does not vanish on one side of the divider.
 */
export function buildMarkerElement(): HTMLElement {
  const element = document.createElement("div");
  element.className = "place-marker";
  element.setAttribute("aria-hidden", "true");
  const ring = document.createElement("span");
  ring.className = "place-marker__ring";
  const dot = document.createElement("span");
  dot.className = "place-marker__dot";
  element.append(ring, dot);
  return element;
}
