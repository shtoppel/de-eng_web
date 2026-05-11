const stage = document.querySelector('#stage');
const modeButtons = [...document.querySelectorAll('.modeButton')];
const styleButtons = [...document.querySelectorAll('.styleButton[data-style]')];
const categoryFilter = document.querySelector('#categoryFilter');
const categoryFilterOptions = [...categoryFilter.options];
const deckSizeSelect = document.querySelector('#deckSizeSelect');
const favoriteModeButton = document.querySelector('#favoriteModeButton');
const scoreElement = document.querySelector('#score');
const answeredElement = document.querySelector('#answered');
const accuracyElement = document.querySelector('#accuracy');
const roundElement = document.querySelector('#round');
const promptCard = document.querySelector('#promptCard');
const promptLabel = document.querySelector('#promptLabel');
const promptWord = document.querySelector('#promptWord');
const promptHint = document.querySelector('#promptHint');
const answers = document.querySelector('#answers');
const cardAnswerForm = document.querySelector('#cardAnswerForm');
const cardAnswerInput = document.querySelector('#cardAnswerInput');
const feedback = document.querySelector('#feedback');
const nextButton = document.querySelector('#nextButton');
const showAnswerButton = document.querySelector('#showAnswerButton');
const favoriteButton = document.querySelector('#favoriteButton');
const resetButton = document.querySelector('#resetButton');
const neuronLayer = document.querySelector('#neuronLayer');
const wordForm = document.querySelector('#wordForm');
const categoryInput = document.querySelector('#categoryInput');
const articleInput = document.querySelector('#articleInput');
const formResult = document.querySelector('#formResult');

const AUTO_ADVANCE_MS = 2000;
const FAVORITES_STORAGE_KEY = 'de-eng-favorite-word-ids';
const ARTICLE_MODE_STYLE = 'multi';
const answerPositions = ['top', 'right', 'bottom', 'left'];
const neuronStarts = [
  ['-42vw', '-32vh'], ['42vw', '-32vh'], ['-42vw', '32vh'], ['42vw', '32vh'],
  ['-48vw', '0vh'], ['48vw', '0vh'], ['0vw', '-38vh'], ['0vw', '38vh'],
];

function loadFavoriteIds() {
  const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return new Set(savedFavorites ? JSON.parse(savedFavorites).map(String) : []);
}

function saveFavoriteIds() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...state.favoriteIds].sort()));
}

const state = {
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

function wordGerman(word) {
  return word.article ? `${word.article} ${word.german}` : word.german;
}

function wordKey(word) {
  return String(word.id);
}

function isFavorite(word) {
  return state.favoriteIds.has(wordKey(word));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sampleOptions(correct, candidates, limit) {
  const uniqueCandidates = [...new Set(candidates.filter((candidate) => candidate && candidate !== correct))];
  return shuffle([correct, ...shuffle(uniqueCandidates).slice(0, limit - 1)]);
}

function currentCategoryWords() {
  if (!state.current) return [];
  return state.words.filter((word) => word.category === state.current.category);
}

function countWordsByCategory() {
  return state.words.reduce((counts, word) => {
    counts[word.category] = (counts[word.category] || 0) + 1;
    return counts;
  }, {});
}

function updateCategoryFilterCounts() {
  const counts = countWordsByCategory();
  categoryFilterOptions.forEach((option) => {
    const label = option.dataset.label || option.textContent.replace(/\s+\(\d+\)$/, '');
    option.dataset.label = label;
    const count = option.value ? counts[option.value] || 0 : state.words.length;
    option.textContent = `${label} (${count})`;
  });
}

function normalizeAnswer(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

function selectedDeckSize() {
  return deckSizeSelect.value;
}

function deckLimit() {
  const size = selectedDeckSize();
  return size === 'infinite' ? Infinity : Number(size);
}

function deckKey() {
  const category = state.mode === 'articles' ? 'noun' : categoryFilter.value || 'all';
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
  state.advanceTimer = setTimeout(() => {
    state.advanceTimer = null;
    nextRound();
  }, AUTO_ADVANCE_MS);
}

function currentPool() {
  let pool;
  if (state.mode === 'articles') {
    pool = state.words.filter((word) => word.category === 'noun' && word.article);
  } else {
    const selectedCategory = categoryFilter.value;
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
  if (!session.deck.length) return null;

  if (session.index >= session.deck.length) {
    if (selectedDeckSize() !== 'infinite') return null;
    session = createDeckSession();
    state.sessionsByDeck.set(deckKey(), session);
  }

  const word = session.deck[session.index];
  session.index += 1;
  return word;
}

function showDeckComplete() {
  clearAdvanceTimer();
  state.current = null;
  state.options = [];
  state.selected = null;
  nextButton.disabled = true;
  showAnswerButton.disabled = true;
  favoriteButton.disabled = true;
  answers.replaceChildren();
  cardAnswerForm.hidden = true;
  promptCard.classList.remove('correct', 'wrong');
  if (state.favoritesOnly && !state.favoriteIds.size) {
    promptLabel.textContent = 'No favorites yet';
    promptWord.textContent = 'Add words';
    promptHint.textContent = 'Use the star button to add words to your favorites list.';
    feedback.className = 'feedback';
    feedback.textContent = 'Favorite words mode is empty.';
  } else {
    promptLabel.textContent = 'Deck complete';
    promptWord.textContent = 'Great job!';
    promptHint.textContent = 'You have seen every word in this deck. Reset the score or choose infinite mode to continue.';
    feedback.className = 'feedback ok';
    feedback.textContent = 'No repeats before reset: this deck is complete.';
  }
  updateChrome();
  renderNeurons();
}

function promptForCurrentMode() {
  if (state.mode === 'articles') {
    promptLabel.textContent = 'German noun';
    promptWord.textContent = state.current.german;
    promptHint.textContent = state.answerStyle === 'cards'
      ? `Type the correct article for “${state.current.english}”.`
      : `Choose the correct article for “${state.current.english}”.`;
    feedback.textContent = 'The German flag marks article training.';
  } else if (state.mode === 'english') {
    promptLabel.textContent = 'German word';
    promptWord.textContent = wordGerman(state.current);
    promptHint.textContent = state.answerStyle === 'cards'
      ? 'Type the matching English translation.'
      : 'Choose the matching English word.';
    feedback.textContent = 'English mode: German prompt in the center, English answers around it.';
  } else {
    promptLabel.textContent = 'English word';
    promptWord.textContent = state.current.english;
    promptHint.textContent = state.answerStyle === 'cards'
      ? 'Type the matching German translation.'
      : 'Choose the matching German word.';
    feedback.textContent = 'German mode: English prompt in the center, German answers around it.';
  }
}

function buildRound() {
  if (!state.words.length) return;
  clearAdvanceTimer();
  state.selected = null;
  nextButton.disabled = true;
  showAnswerButton.disabled = true;
  favoriteButton.disabled = true;
  answers.replaceChildren();
  cardAnswerForm.hidden = true;
  cardAnswerInput.value = '';
  promptCard.classList.remove('correct', 'wrong');
  feedback.className = 'feedback';

  state.current = chooseUnseenWord();
  if (!state.current) {
    showDeckComplete();
    return;
  }

  if (state.mode === 'articles') {
    state.options = ['der', 'die', 'das'];
  } else if (state.mode === 'english') {
    state.options = sampleOptions(state.current.english, currentCategoryWords().map((word) => word.english), 4);
  } else {
    state.options = sampleOptions(wordGerman(state.current), currentCategoryWords().map(wordGerman), 4);
  }

  promptForCurrentMode();
  updateChrome();
  renderCurrentAnswerStyle();
  renderNeurons();
}

function correctAnswer() {
  if (state.mode === 'articles') return state.current.article;
  if (state.mode === 'english') return state.current.english;
  return wordGerman(state.current);
}

function acceptedAnswers() {
  const answers = [correctAnswer()];
  if (state.mode === 'german') {
    answers.push(state.current.german);
  }
  return answers.map(normalizeAnswer);
}

function updateChrome() {
  stage.className = `heroStage ${state.mode === 'english' ? 'british' : state.mode}`;
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
  styleButtons.forEach((button) => {
    const isCardStyle = button.dataset.style === 'cards';
    const cardsUnavailable = state.mode === 'articles' && isCardStyle;
    button.disabled = cardsUnavailable;
    button.classList.toggle('active', button.dataset.style === state.answerStyle);
    button.setAttribute('aria-disabled', String(cardsUnavailable));
  });
  favoriteModeButton.classList.toggle('active', state.favoritesOnly);
  favoriteModeButton.textContent = `Favorite words (${state.favoriteIds.size})`;
  favoriteModeButton.setAttribute('aria-pressed', String(state.favoritesOnly));
  favoriteButton.disabled = !state.current;
  favoriteButton.textContent = state.current && isFavorite(state.current) ? '★ Remove favorite' : '☆ Add to favorites';
  favoriteButton.setAttribute('aria-pressed', String(Boolean(state.current && isFavorite(state.current))));
  showAnswerButton.disabled = !state.current || Boolean(state.selected);
  nextButton.disabled = !state.current;
  scoreElement.textContent = state.score;
  answeredElement.textContent = state.answered;
  accuracyElement.textContent = state.answered ? `${Math.round((state.score / state.answered) * 100)}%` : '0%';
  roundElement.textContent = state.round;
}

function renderCurrentAnswerStyle() {
  if (state.answerStyle === 'cards') {
    renderCardAnswerForm();
  } else {
    renderAnswers();
  }
}

function renderAnswers() {
  cardAnswerForm.hidden = true;
  const options = state.mode === 'articles' ? state.options : shuffle(state.options);
  const fragment = document.createDocumentFragment();
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = `answerButton ${answerPositions[index]}`;
    button.style.animationDelay = `${index * 90}ms`;
    button.textContent = option;
    button.addEventListener('click', () => chooseMultipleChoiceAnswer(option));
    fragment.append(button);
  });
  answers.replaceChildren(fragment);
}

function renderCardAnswerForm() {
  answers.replaceChildren();
  cardAnswerForm.hidden = false;
  cardAnswerInput.disabled = false;
  cardAnswerForm.querySelector('button').disabled = false;
  window.setTimeout(() => cardAnswerInput.focus(), 0);
}

function disableCurrentAnswerControls() {
  [...answers.children].forEach((button) => {
    button.disabled = true;
  });
  cardAnswerInput.disabled = true;
  cardAnswerForm.querySelector('button').disabled = true;
}

function finishAnswer(isCorrect, message) {
  state.selected = true;
  state.answered += 1;
  if (isCorrect) state.score += 1;
  feedback.className = `feedback ${isCorrect ? 'ok' : 'bad'}`;
  feedback.textContent = message;
  nextButton.disabled = false;
  showAnswerButton.disabled = true;
  updateChrome();
  scheduleAutoAdvance();
}

function chooseMultipleChoiceAnswer(answer) {
  if (state.selected) return;
  const expected = correctAnswer();
  const isCorrect = answer === expected;
  [...answers.children].forEach((button) => {
    button.disabled = true;
    if (button.textContent === expected) button.classList.add('correct');
    if (button.textContent === answer && !isCorrect) button.classList.add('wrong');
  });
  finishAnswer(isCorrect, isCorrect ? `Correct: ${expected}` : `Expected: ${expected}`);
}

function showAnswer() {
  if (state.selected || !state.current) return;

  const expected = correctAnswer();
  cardAnswerInput.value = expected;
  state.selected = true;
  state.answered += 1;
  feedback.className = 'feedback bad';
  feedback.textContent = `Answer: ${expected}`;
  promptCard.classList.add('wrong');
  [...answers.children].forEach((button) => {
    button.disabled = true;
    if (button.textContent === expected) button.classList.add('correct');
  });
  disableCurrentAnswerControls();
  updateChrome();
}

function toggleFavorite() {
  if (!state.current) return;

  const id = wordKey(state.current);
  if (state.favoriteIds.has(id)) {
    state.favoriteIds.delete(id);
    feedback.className = 'feedback';
    feedback.textContent = 'Removed from favorites.';
  } else {
    state.favoriteIds.add(id);
    feedback.className = 'feedback ok';
    feedback.textContent = 'Added to favorites.';
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
  if (state.selected || !state.current) return;

  const isCorrect = acceptedAnswers().includes(normalizeAnswer(cardAnswerInput.value));
  promptCard.classList.add(isCorrect ? 'correct' : 'wrong');
  disableCurrentAnswerControls();
  finishAnswer(
    isCorrect,
    isCorrect ? 'Correct. Moving to the next word...' : 'Not quite. Moving to the next word...',
  );
}

function renderNeurons() {
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
  neuronLayer.replaceChildren(fragment);
}

async function loadWords() {
  try {
    state.words = await fetchJson('/api/words');
    updateCategoryFilterCounts();
    buildRound();
  } catch (error) {
    feedback.className = 'feedback bad';
    feedback.textContent = error.message;
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
  buildRound();
}

function resetGame() {
  resetSession();
}

function updateArticleInputState() {
  const isNoun = categoryInput.value === 'noun';
  articleInput.disabled = !isNoun;
  articleInput.required = isNoun;
}

function formPayload() {
  const data = new FormData(wordForm);
  return {
    category: data.get('category'),
    article: categoryInput.value === 'noun' ? data.get('article') : null,
    german: data.get('german'),
    english: data.get('english'),
    example: data.get('example'),
  };
}

async function addCustomWord(event) {
  event.preventDefault();
  const submitButton = wordForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  formResult.className = 'formResult';
  formResult.textContent = '';
  try {
    const createdWord = await fetchJson('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload()),
    });
    state.words.push(createdWord);
    updateCategoryFilterCounts();
    formResult.className = 'formResult ok';
    formResult.textContent = `Added: ${wordGerman(createdWord)} — ${createdWord.english}`;
    wordForm.reset();
    updateArticleInputState();
    state.round += 1;
    buildRound();
  } catch (error) {
    formResult.className = 'formResult bad';
    formResult.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
styleButtons.forEach((button) => button.addEventListener('click', () => setAnswerStyle(button.dataset.style)));
categoryFilter.addEventListener('change', resetSession);
deckSizeSelect.addEventListener('change', resetGame);
nextButton.addEventListener('click', nextRound);
showAnswerButton.addEventListener('click', showAnswer);
favoriteButton.addEventListener('click', toggleFavorite);
favoriteModeButton.addEventListener('click', toggleFavoritesMode);
resetButton.addEventListener('click', resetGame);
cardAnswerForm.addEventListener('submit', checkCardAnswer);
categoryInput.addEventListener('change', updateArticleInputState);
wordForm.addEventListener('submit', addCustomWord);
updateArticleInputState();
loadWords();
