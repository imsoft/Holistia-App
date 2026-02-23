import { SupabaseClient } from '@supabase/supabase-js';

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slug.length >= 3 && slug.length <= 200 && slugRegex.test(slug);
}

export async function checkSlugExists(
  slug: string,
  currentPostId: string | null,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    let query = supabase.from('blog_posts').select('id').eq('slug', slug);
    if (currentPostId) query = query.neq('id', currentPostId);
    const { data, error } = await query;
    if (error) return false;
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

export async function generateUniqueSlug(
  baseSlug: string,
  currentPostId: string | null,
  supabase: SupabaseClient
): Promise<string> {
  let slug = baseSlug || 'post';
  let counter = 1;
  while (await checkSlugExists(slug, currentPostId, supabase)) {
    slug = `${baseSlug || 'post'}-${counter}`;
    counter++;
  }
  return slug;
}
