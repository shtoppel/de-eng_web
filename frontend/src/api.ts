export type CategoryKey = 'noun' | 'verb' | 'adjective' | 'adverb';
export type Mode = 'english' | 'german' | 'articles';
export type AnswerStyle = 'multi' | 'cards';
export type Article = 'der' | 'die' | 'das';

export interface Word {
  id: number;
  category: CategoryKey;
  category_label?: string;
  german: string;
  english: string;
  article: Article | null;
  example?: string;
}

export interface CategoriesPayload {
  categories: Record<CategoryKey, string>;
}

export interface WordPayload {
  category: FormDataEntryValue | null;
  article: FormDataEntryValue | null;
  german: FormDataEntryValue | null;
  english: FormDataEntryValue | null;
  example: FormDataEntryValue | null;
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export function fetchCategories(): Promise<CategoriesPayload> {
  return fetchJson<CategoriesPayload>('/api/categories');
}

export function fetchWords(): Promise<Word[]> {
  return fetchJson<Word[]>('/api/words');
}

export function fetchRandomWord(category?: CategoryKey): Promise<Word> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return fetchJson<Word>(`/api/words/random${query}`);
}

export function createWord(payload: WordPayload): Promise<Word> {
  return fetchJson<Word>('/api/words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
