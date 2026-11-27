export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
  return slug || 'item';
}

export async function buildUniqueSlug(
  value: string,
  findExistingId: (slug: string) => Promise<string | null>,
  ignoreId?: string,
) {
  const base = slugify(value);
  let slug = base;
  let suffix = 1;
  while (true) {
    const existingId = await findExistingId(slug);
    if (!existingId || existingId === ignoreId) {
      return slug;
    }
    suffix += 1;
    slug = `${base.slice(0, 240)}-${suffix}`;
  }
}
