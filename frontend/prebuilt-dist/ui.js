import { countWordsByCategory, isFavorite, state } from './state.js';
function qs(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`Missing required element: ${selector}`);
    return element;
}
export const elements = {
    stage: qs('#stage'),
    modeButtons: [...document.querySelectorAll('.modeButton')],
    styleButtons: [...document.querySelectorAll('.styleButton[data-style]')],
    categoryFilter: qs('#categoryFilter'),
    deckSizeSelect: qs('#deckSizeSelect'),
    favoriteModeButton: qs('#favoriteModeButton'),
    scoreElement: qs('#score'),
    answeredElement: qs('#answered'),
    accuracyElement: qs('#accuracy'),
    roundElement: qs('#round'),
    promptCard: qs('#promptCard'),
    promptLabel: qs('#promptLabel'),
    promptWord: qs('#promptWord'),
    promptHint: qs('#promptHint'),
    promptExample: qs('#promptExample'),
    answers: qs('#answers'),
    cardAnswerForm: qs('#cardAnswerForm'),
    cardAnswerInput: qs('#cardAnswerInput'),
    feedback: qs('#feedback'),
    nextButton: qs('#nextButton'),
    showAnswerButton: qs('#showAnswerButton'),
    favoriteButton: qs('#favoriteButton'),
    resetButton: qs('#resetButton'),
    neuronLayer: qs('#neuronLayer'),
    wordForm: qs('#wordForm'),
    categoryInput: qs('#categoryInput'),
    articleInput: qs('#articleInput'),
    formResult: qs('#formResult'),
};
export const categoryFilterOptions = [...elements.categoryFilter.options];
export const answerPositions = ['top', 'right', 'bottom', 'left'];
export const neuronStarts = [
    ['-42vw', '-32vh'], ['42vw', '-32vh'], ['-42vw', '32vh'], ['42vw', '32vh'],
    ['-48vw', '0vh'], ['48vw', '0vh'], ['0vw', '-38vh'], ['0vw', '38vh'],
];
export function renderCategoryOptions(categories) {
    const allLabel = categoryFilterOptions[0]?.dataset.label || 'All categories';
    const practiceOptions = [new Option(allLabel, '')];
    const formOptions = [];
    Object.entries(categories).forEach(([value, label]) => {
        practiceOptions.push(new Option(label, value));
        formOptions.push(new Option(label, value));
    });
    elements.categoryFilter.replaceChildren(...practiceOptions);
    elements.categoryInput.replaceChildren(...formOptions);
    elements.categoryInput.value = 'noun';
    categoryFilterOptions.splice(0, categoryFilterOptions.length, ...elements.categoryFilter.options);
}
export function updateCategoryFilterCounts() {
    const counts = countWordsByCategory();
    categoryFilterOptions.forEach((option) => {
        const label = option.dataset.label || option.textContent?.replace(/\s+\(\d+\)$/, '') || '';
        option.dataset.label = label;
        const count = option.value ? counts[option.value] || 0 : state.words.length;
        option.textContent = `${label} (${count})`;
    });
}
export function selectedDeckSize() {
    return elements.deckSizeSelect.value;
}
export function deckLimit() {
    const size = selectedDeckSize();
    return size === 'infinite' ? Infinity : Number(size);
}
export function setFeedback(message, className = 'feedback') {
    elements.feedback.className = className;
    elements.feedback.textContent = message;
}
export function updateChrome() {
    elements.scoreElement.textContent = String(state.score);
    elements.answeredElement.textContent = String(state.answered);
    elements.accuracyElement.textContent = state.answered ? `${Math.round((state.score / state.answered) * 100)}%` : '0%';
    elements.roundElement.textContent = String(state.round);
    elements.modeButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    elements.styleButtons.forEach((button) => {
        const style = button.dataset.style;
        button.classList.toggle('active', style === state.answerStyle);
        button.disabled = state.mode === 'articles' && style === 'cards';
    });
    elements.stage.classList.toggle('articleTheme', state.mode === 'articles');
    elements.favoriteButton.disabled = !state.current;
    elements.favoriteButton.setAttribute('aria-pressed', state.current && isFavorite(state.current) ? 'true' : 'false');
    elements.favoriteButton.textContent = state.current && isFavorite(state.current) ? '★ Remove favorite' : '☆ Add to favorites';
    elements.favoriteModeButton.classList.toggle('active', state.favoritesOnly);
    elements.favoriteModeButton.textContent = `Favorite words (${state.favoriteIds.size})`;
}
export function renderNeurons() {
    const fragment = document.createDocumentFragment();
    neuronStarts.forEach(([x, y], index) => {
        const dot = document.createElement('span');
        dot.className = 'neuronDot';
        dot.style.setProperty('--from-x', x);
        dot.style.setProperty('--from-y', y);
        dot.style.animationDelay = `${index * 70}ms`;
        fragment.append(dot);
    });
    const pulse = document.createElement('span');
    pulse.className = 'centerPulse';
    fragment.append(pulse);
    elements.neuronLayer.replaceChildren(fragment);
}
export function updateArticleInputState() {
    const isNoun = elements.categoryInput.value === 'noun';
    elements.articleInput.disabled = !isNoun;
    elements.articleInput.required = isNoun;
}
export function onMode(handler) {
    elements.modeButtons.forEach((button) => button.addEventListener('click', () => handler(button.dataset.mode)));
}
export function onStyle(handler) {
    elements.styleButtons.forEach((button) => button.addEventListener('click', () => handler(button.dataset.style)));
}
