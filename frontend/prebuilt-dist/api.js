export async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok)
        throw new Error(payload.error || 'Request failed');
    return payload;
}
export function fetchCategories() {
    return fetchJson('/api/categories');
}
export function fetchWords() {
    return fetchJson('/api/words');
}
export function fetchRandomWord(category) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJson(`/api/words/random${query}`);
}
export function createWord(payload) {
    return fetchJson('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}
