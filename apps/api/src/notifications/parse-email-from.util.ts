export function parseEmailFrom(from: string): { email: string; name?: string } {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);

  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  return { email: trimmed };
}
