const FAVORITES_STORAGE_KEY = 'de-eng-favorite-word-ids';
function loadFavoriteIds() {
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return new Set(savedFavorites ? JSON.parse(savedFavorites).map(String) : []);
}
export const state = {
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
export function saveFavoriteIds() {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favoriteIds].sort()));
}
export function wordGerman(word) {
    return word.article ? `${word.article} ${word.german}` : word.german;
}
export function wordKey(word) {
    return String(word.id);
}
export function isFavorite(word) {
    return state.favoriteIds.has(wordKey(word));
}
export function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
}
export function sampleOptions(correct, candidates, limit) {
    const uniqueCandidates = [...new Set(candidates.filter((candidate) => candidate && candidate !== correct))];
    return shuffle([correct, ...shuffle(uniqueCandidates).slice(0, limit - 1)]);
}
export function normalizeAnswer(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
export function countWordsByCategory() {
    return state.words.reduce((counts, word) => {
        counts[word.category] = (counts[word.category] || 0) + 1;
        return counts;
    }, {});
}
