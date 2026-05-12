import type { AnswerStyle, Mode, Word } from './api.js';

const FAVORITES_STORAGE_KEY = 'de-eng-favorite-word-ids';

export interface DeckSession {
  deck: Word[];
  index: number;
}

export interface AppState {
  words: Word[];
  mode: Mode;
  answerStyle: AnswerStyle;
  current: Word | null;
  options: string[];
  selected: string | null;
  score: number;
  answered: number;
  round: number;
  favoriteIds: Set<string>;
  favoritesOnly: boolean;
  sessionsByDeck: Map<string, DeckSession>;
  advanceTimer: number | null;
}

function loadFavoriteIds(): Set<string> {
  const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return new Set(savedFavorites ? (JSON.parse(savedFavorites) as unknown[]).map(String) : []);
}

export const state: AppState = {
  words: [],
  mode: 'english',
  answerStyle: 'multi',
  current: null,
  options: [],
  selected: null,
  score: 0,
  answered: 0,
  round: 1,
  favoriteIds: loadFavoriteIds(),
  favoritesOnly: false,
  sessionsByDeck: new Map(),
  advanceTimer: null,
};

export function saveFavoriteIds(): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favoriteIds].sort()));
}

export function wordGerman(word: Word): string {
  return word.article ? `${word.article} ${word.german}` : word.german;
}

export function wordKey(word: Word): string {
  return String(word.id);
}

export function isFavorite(word: Word): boolean {
  return state.favoriteIds.has(wordKey(word));
}

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function sampleOptions(correct: string, candidates: string[], limit: number): string[] {
  const uniqueCandidates = [...new Set(candidates.filter((candidate) => candidate && candidate !== correct))];
  return shuffle([correct, ...shuffle(uniqueCandidates).slice(0, limit - 1)]);
}

export function normalizeAnswer(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function countWordsByCategory(): Record<string, number> {
  return state.words.reduce<Record<string, number>>((counts, word) => {
    counts[word.category] = (counts[word.category] || 0) + 1;
    return counts;
  }, {});
}
