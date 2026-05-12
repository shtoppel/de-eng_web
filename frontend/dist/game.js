import { createWord, fetchCategories, fetchRandomWord, fetchWords } from './api.js';
import { elements, answerPositions, deckLimit, onMode, onStyle, renderCategoryOptions, renderNeurons, selectedDeckSize, setFeedback, updateArticleInputState, updateCategoryFilterCounts, updateChrome } from './ui.js';
import { isFavorite, normalizeAnswer, sampleOptions, saveFavoriteIds, shuffle, state, wordGerman, wordKey } from './state.js';
const AUTO_ADVANCE_MS = 2000;
const ARTICLE_MODE_STYLE = 'multi';
function currentCategoryWords() {
    if (!state.current)
        return [];
    return state.words.filter((word) => word.category === state.current?.category);
}
function deckKey() {
    const category = state.mode === 'articles' ? 'noun' : elements.categoryFilter.value || 'all';
    const favorites = state.favoritesOnly ? 'favorites' : 'all';
    return `${state.mode}:${category}:${favorites}:${selectedDeckSize()}`;
}
function clearAdvanceTimer() {
    if (state.advanceTimer) {
        clearTimeout(state.advanceTimer);
        state.advanceTimer = null;
    }
}
function scheduleAutoAdvance() {
    clearAdvanceTimer();
    state.advanceTimer = window.setTimeout(() => {
        state.advanceTimer = null;
        nextRound();
    }, AUTO_ADVANCE_MS);
}
function currentPool() {
    let pool;
    if (state.mode === 'articles') {
        pool = state.words.filter((word) => word.category === 'noun' && word.article);
    }
    else {
        const selectedCategory = elements.categoryFilter.value;
        const filtered = selectedCategory
            ? state.words.filter((word) => word.category === selectedCategory)
            : state.words;
        pool = filtered.length ? filtered : state.words;
    }
    return state.favoritesOnly ? pool.filter(isFavorite) : pool;
}
function createDeckSession() {
    const pool = shuffle(currentPool());
    const limit = deckLimit();
    const deck = Number.isFinite(limit) ? pool.slice(0, limit) : pool;
    return { deck, index: 0 };
}
function sessionForCurrentDeck() {
    const key = deckKey();
    if (!state.sessionsByDeck.has(key)) {
        state.sessionsByDeck.set(key, createDeckSession());
    }
    return state.sessionsByDeck.get(key);
}
function chooseUnseenWord() {
    let session = sessionForCurrentDeck();
    if (!session.deck.length)
        return null;
    if (session.index >= session.deck.length) {
        if (selectedDeckSize() !== 'infinite')
            return null;
        session = createDeckSession();
        state.sessionsByDeck.set(deckKey(), session);
    }
    const word = session.deck[session.index] || null;
    session.index += 1;
    return word;
}
function showDeckComplete() {
    clearAdvanceTimer();
    state.current = null;
    state.options = [];
    state.selected = null;
    elements.nextButton.disabled = true;
    elements.showAnswerButton.disabled = true;
    elements.favoriteButton.disabled = true;
    elements.answers.replaceChildren();
    elements.cardAnswerForm.hidden = true;
    elements.promptCard.classList.remove('correct', 'wrong');
    if (state.favoritesOnly && !state.favoriteIds.size) {
        elements.promptLabel.textContent = 'No favorites yet';
        elements.promptWord.textContent = 'Add words';
        elements.promptHint.textContent = 'Use the star button to add words to your favorites list.';
        setFeedback('Favorite words mode is empty.');
    }
    else {
        elements.promptLabel.textContent = 'Deck complete';
        elements.promptWord.textContent = 'Great job!';
        elements.promptHint.textContent = 'You have seen every word in this deck. Reset the score or choose infinite mode to continue.';
        setFeedback('No repeats before reset: this deck is complete.', 'feedback ok');
    }
    updateChrome();
    renderNeurons();
}
function promptForCurrentMode() {
    if (!state.current)
        return;
    if (state.mode === 'articles') {
        elements.promptLabel.textContent = 'German noun';
        elements.promptWord.textContent = state.current.german;
        elements.promptHint.textContent = state.answerStyle === 'cards'
            ? `Type the correct article for “${state.current.english}”.`
            : `Choose the correct article for “${state.current.english}”.`;
        elements.feedback.textContent = 'The German flag marks article training.';
    }
    else if (state.mode === 'english') {
        elements.promptLabel.textContent = 'German word';
        elements.promptWord.textContent = wordGerman(state.current);
        elements.promptHint.textContent = state.answerStyle === 'cards'
            ? 'Type the matching English translation.'
            : 'Choose the matching English word.';
        elements.feedback.textContent = 'English mode: German prompt in the center, English answers around it.';
    }
    else {
        elements.promptLabel.textContent = 'English word';
        elements.promptWord.textContent = state.current.english;
        elements.promptHint.textContent = state.answerStyle === 'cards'
            ? 'Type the matching German translation.'
            : 'Choose the matching German word.';
        elements.feedback.textContent = 'German mode: English prompt in the center, German answers around it.';
    }
}
function buildRound() {
    if (!state.words.length)
        return;
    clearAdvanceTimer();
    state.selected = null;
    elements.nextButton.disabled = true;
    elements.showAnswerButton.disabled = true;
    elements.favoriteButton.disabled = true;
    elements.answers.replaceChildren();
    elements.cardAnswerForm.hidden = true;
    elements.cardAnswerInput.value = '';
    elements.promptCard.classList.remove('correct', 'wrong');
    elements.feedback.className = 'feedback';
    state.current = chooseUnseenWord();
    if (!state.current) {
        showDeckComplete();
        return;
    }
    if (state.mode === 'articles') {
        state.options = ['der', 'die', 'das'];
    }
    else if (state.mode === 'english') {
        state.options = sampleOptions(state.current.english, currentCategoryWords().map((word) => word.english), 4);
    }
    else {
        state.options = sampleOptions(wordGerman(state.current), currentCategoryWords().map(wordGerman), 4);
    }
    promptForCurrentMode();
    updateChrome();
    renderCurrentAnswerStyle();
    renderNeurons();
}
function renderCurrentAnswerStyle() {
    if (state.answerStyle === 'cards') {
        elements.cardAnswerForm.hidden = false;
        elements.cardAnswerInput.focus();
        elements.nextButton.disabled = false;
        elements.showAnswerButton.disabled = false;
        return;
    }
    elements.answers.replaceChildren(...state.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `answerButton ${answerPositions[index] || 'top'}`;
        button.textContent = option;
        button.addEventListener('click', () => chooseAnswer(option, button));
        return button;
    }));
    elements.nextButton.disabled = false;
    elements.showAnswerButton.disabled = false;
}
function expectedAnswer() {
    if (!state.current)
        return '';
    if (state.mode === 'articles')
        return state.current.article || '';
    if (state.mode === 'english')
        return state.current.english;
    return wordGerman(state.current);
}
function acceptedAnswers() {
    if (!state.current)
        return [];
    if (state.mode === 'articles')
        return [normalizeAnswer(state.current.article)];
    if (state.mode === 'english')
        return [normalizeAnswer(state.current.english)];
    return [normalizeAnswer(wordGerman(state.current)), normalizeAnswer(state.current.german)];
}
function disableCurrentAnswerControls() {
    elements.nextButton.disabled = false;
    elements.showAnswerButton.disabled = true;
    [...elements.answers.children].forEach((button) => {
        if (button instanceof HTMLButtonElement)
            button.disabled = true;
    });
    elements.cardAnswerInput.disabled = true;
}
function finishAnswer(correct, message) {
    state.answered += 1;
    if (correct)
        state.score += 1;
    setFeedback(message, correct ? 'feedback ok' : 'feedback bad');
    updateChrome();
    scheduleAutoAdvance();
}
function chooseAnswer(option, button) {
    if (state.selected)
        return;
    state.selected = option;
    const correct = option === expectedAnswer();
    button.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) {
        [...elements.answers.children].forEach((candidate) => {
            if (candidate.textContent === expectedAnswer())
                candidate.classList.add('correct');
        });
    }
    disableCurrentAnswerControls();
    finishAnswer(correct, correct ? 'Correct!' : `Not quite. Correct answer: ${expectedAnswer()}`);
}
function showAnswer() {
    if (state.selected || !state.current)
        return;
    const expected = expectedAnswer();
    state.selected = expected;
    state.answered += 1;
    elements.cardAnswerInput.value = expected;
    elements.feedback.className = 'feedback bad';
    elements.feedback.textContent = `Answer: ${expected}`;
    elements.promptCard.classList.add('wrong');
    [...elements.answers.children].forEach((button) => {
        if (button instanceof HTMLButtonElement)
            button.disabled = true;
        if (button.textContent === expected)
            button.classList.add('correct');
    });
    disableCurrentAnswerControls();
    updateChrome();
}
function toggleFavorite() {
    if (!state.current)
        return;
    const id = wordKey(state.current);
    if (state.favoriteIds.has(id)) {
        state.favoriteIds.delete(id);
        setFeedback('Removed from favorites.');
    }
    else {
        state.favoriteIds.add(id);
        setFeedback('Added to favorites.', 'feedback ok');
    }
    saveFavoriteIds();
    updateChrome();
}
function toggleFavoritesMode() {
    state.favoritesOnly = !state.favoritesOnly;
    resetSession();
}
function checkCardAnswer(event) {
    event.preventDefault();
    if (state.selected || !state.current)
        return;
    const isCorrect = acceptedAnswers().includes(normalizeAnswer(elements.cardAnswerInput.value));
    elements.promptCard.classList.add(isCorrect ? 'correct' : 'wrong');
    disableCurrentAnswerControls();
    finishAnswer(isCorrect, isCorrect ? 'Correct. Moving to the next word...' : 'Not quite. Moving to the next word...');
}
async function loadWords() {
    try {
        const [categoriesPayload, words] = await Promise.all([fetchCategories(), fetchWords()]);
        renderCategoryOptions(categoriesPayload.categories);
        state.words = words;
        updateCategoryFilterCounts();
        void fetchRandomWord().catch(() => undefined);
        buildRound();
    }
    catch (error) {
        setFeedback(error instanceof Error ? error.message : String(error), 'feedback bad');
    }
}
function resetSession() {
    clearAdvanceTimer();
    state.score = 0;
    state.answered = 0;
    state.round = 1;
    state.sessionsByDeck.clear();
    buildRound();
}
function setMode(mode) {
    state.mode = mode;
    if (mode === 'articles') {
        state.answerStyle = ARTICLE_MODE_STYLE;
    }
    resetSession();
}
function setAnswerStyle(answerStyle) {
    if (state.mode === 'articles' && answerStyle === 'cards') {
        return;
    }
    state.answerStyle = answerStyle;
    resetSession();
}
function nextRound() {
    clearAdvanceTimer();
    state.round += 1;
    elements.cardAnswerInput.disabled = false;
    buildRound();
}
function resetGame() {
    elements.cardAnswerInput.disabled = false;
    resetSession();
}
function formPayload() {
    const data = new FormData(elements.wordForm);
    return {
        category: data.get('category'),
        article: elements.categoryInput.value === 'noun' ? data.get('article') : null,
        german: data.get('german'),
        english: data.get('english'),
        example: data.get('example'),
    };
}
async function addCustomWord(event) {
    event.preventDefault();
    const submitButton = elements.wordForm.querySelector('button[type="submit"]');
    if (!submitButton)
        return;
    submitButton.disabled = true;
    elements.formResult.className = 'formResult';
    elements.formResult.textContent = '';
    try {
        const createdWord = await createWord(formPayload());
        state.words.push(createdWord);
        updateCategoryFilterCounts();
        elements.formResult.className = 'formResult ok';
        elements.formResult.textContent = `Added: ${wordGerman(createdWord)} — ${createdWord.english}`;
        elements.wordForm.reset();
        updateArticleInputState();
        state.round += 1;
        buildRound();
    }
    catch (error) {
        elements.formResult.className = 'formResult bad';
        elements.formResult.textContent = error instanceof Error ? error.message : String(error);
    }
    finally {
        submitButton.disabled = false;
    }
}
export function initGame() {
    onMode(setMode);
    onStyle(setAnswerStyle);
    elements.categoryFilter.addEventListener('change', resetSession);
    elements.deckSizeSelect.addEventListener('change', resetGame);
    elements.nextButton.addEventListener('click', nextRound);
    elements.showAnswerButton.addEventListener('click', showAnswer);
    elements.favoriteButton.addEventListener('click', toggleFavorite);
    elements.favoriteModeButton.addEventListener('click', toggleFavoritesMode);
    elements.resetButton.addEventListener('click', resetGame);
    elements.cardAnswerForm.addEventListener('submit', checkCardAnswer);
    elements.categoryInput.addEventListener('change', updateArticleInputState);
    elements.wordForm.addEventListener('submit', addCustomWord);
    updateArticleInputState();
    void loadWords();
}
