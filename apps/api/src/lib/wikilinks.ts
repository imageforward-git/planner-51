/**
 * Parse [[wikilinks]] from content.
 * Supports [[Title]] and [[Title|alias]] syntax.
 * Returns an array of unique target titles.
 */
export function parseWikilinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const titles = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    titles.add(match[1].trim());
  }
  return Array.from(titles);
}
