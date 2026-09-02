// DiceBear needs no API key and serves images over a plain GET, so the URL
// is built client-side from a seed rather than proxied through the backend.
// PNG (not SVG) so <Image> can load it with no extra SVG-rendering
// dependency (see SCHEDULING_FUNCTIONAL_REQUIREMENTS.md FR-1.2).
export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(seed)}`;
}
