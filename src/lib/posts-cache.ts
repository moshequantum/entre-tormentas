import { getCollection, type CollectionEntry } from 'astro:content';

let cachedSortedPosts: CollectionEntry<'posts'>[] | null = null;
let cachedByCategory: Map<string, CollectionEntry<'posts'>[]> | null = null;

/**
 * Returns all published posts sorted by publishedAt descending.
 * Cached in module memory across warm SSR invocations to avoid
 * re-reading and re-sorting 9,400+ entries on every request.
 */
export async function getSortedPostsCached(): Promise<CollectionEntry<'posts'>[]> {
  if (cachedSortedPosts) {
    return cachedSortedPosts;
  }

  const allPosts = await getCollection('posts');
  cachedSortedPosts = allPosts.sort(
    (a, b) => new Date(b.data.publishedAt || 0).getTime() - new Date(a.data.publishedAt || 0).getTime()
  );

  cachedByCategory = new Map();
  for (const post of cachedSortedPosts) {
    const cat = post.data.category || 'regionales';
    let list = cachedByCategory.get(cat);
    if (!list) {
      list = [];
      cachedByCategory.set(cat, list);
    }
    list.push(post);
  }

  return cachedSortedPosts;
}

export async function getPostsByCategoryCached(category: string): Promise<CollectionEntry<'posts'>[]> {
  if (!cachedByCategory) {
    await getSortedPostsCached();
  }
  return cachedByCategory?.get(category) || [];
}

export async function getRelatedPostsCached(
  category: string,
  excludeId: string,
  limit = 4
): Promise<CollectionEntry<'posts'>[]> {
  const categoryList = await getPostsByCategoryCached(category);
  const result: CollectionEntry<'posts'>[] = [];
  for (const item of categoryList) {
    if (item.id !== excludeId) {
      result.push(item);
      if (result.length >= limit) break;
    }
  }
  return result;
}
