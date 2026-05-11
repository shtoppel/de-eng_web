const stage = document.querySelector('#stage');
const modeButtons = [...document.querySelectorAll('.modeButton')];
const categoryFilter = document.querySelector('#categoryFilter');
const scoreElement = document.querySelector('#score');
const roundElement = document.querySelector('#round');
const promptLabel = document.querySelector('#promptLabel');
const promptWord = document.querySelector('#promptWord');
const promptHint = document.querySelector('#promptHint');
const answers = document.querySelector('#answers');
const feedback = document.querySelector('#feedback');
const nextButton = document.querySelector('#nextButton');
const resetButton = document.querySelector('#resetButton');
const neuronLayer = document.querySelector('#neuronLayer');
const wordForm = document.querySelector('#wordForm');
const categoryInput = document.querySelector('#categoryInput');
const articleInput = document.querySelector('#articleInput');
const formResult = document.querySelector('#formResult');

const answerPositions = ['top', 'right', 'bottom', 'left'];
const neuronStarts = [
  ['-42vw', '-32vh'], ['42vw', '-32vh'], ['-42vw', '32vh'], ['42vw', '32vh'],
  ['-48vw', '0vh'], ['48vw', '0vh'], ['0vw', '-38vh'], ['0vw', '38vh'],
];

const state = {
  words: [],
  mode: 'english',
  current: null,
  options: [],
  selected: null,
  score: 0,
  round: 1,
  usedByDeck: new Map(),
};

function wordGerman(word) {
  return word.article ? `${word.article} ${word.german}` : word.german;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sampleOptions(correct, candidates, limit) {
  const uniqueCandidates = [...new Set(candidates.filter((candidate) => candidate && candidate !== correct))];
  return shuffle([correct, ...shuffle(uniqueCandidates).slice(0, limit - 1)]);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

function deckKey() {
  const category = state.mode === 'articles' ? 'noun' : categoryFilter.value || 'all';
  return `${state.mode}:${category}`;
}

function currentPool() {
  if (state.mode === 'articles') {
    return state.words.filter((word) => word.category === 'noun' && word.article);
  }

  const selectedCategory = categoryFilter.value;
  const filtered = selectedCategory
    ? state.words.filter((word) => word.category === selectedCategory)
    : state.words;
  return filtered.length ? filtered : state.words;
}

function usedSetForCurrentDeck() {
  const key = deckKey();
  if (!state.usedByDeck.has(key)) {
    state.usedByDeck.set(key, new Set());
  }
  return state.usedByDeck.get(key);
}

function chooseUnseenWord() {
  const pool = currentPool();
  const used = usedSetForCurrentDeck();
  const available = pool.filter((word) => !used.has(word.id));
  if (!available.length) return null;

  const word = available[Math.floor(Math.random() * available.length)];
  used.add(word.id);
  return word;
}

function showDeckComplete() {
  state.current = null;
  state.options = [];
  state.selected = null;
  nextButton.disabled = true;
  answers.replaceChildren();
  promptLabel.textContent = 'Deck complete';
  promptWord.textContent = 'Great job!';
  promptHint.textContent = 'You have seen every word in this mode. Reset the score to start again.';
  feedback.className = 'feedback ok';
  feedback.textContent = 'No repeats before reset: this deck is complete.';
  updateChrome();
  renderNeurons();
}

function buildRound() {
  if (!state.words.length) return;
  state.selected = null;
  nextButton.disabled = true;
  answers.replaceChildren();
  feedback.className = 'feedback';

  state.current = chooseUnseenWord();
  if (!state.current) {
    showDeckComplete();
    return;
  }

  if (state.mode === 'articles') {
    state.options = ['der', 'die', 'das'];
    promptLabel.textContent = 'German noun';
    promptWord.textContent = state.current.german;
    promptHint.textContent = `Choose the correct article for “${state.current.english}”.`;
    feedback.textContent = 'The German flag marks article training.';
  } else if (state.mode === 'english') {
    state.options = sampleOptions(state.current.english, state.words.map((word) => word.english), 4);
    promptLabel.textContent = 'German word';
    promptWord.textContent = wordGerman(state.current);
    promptHint.textContent = 'Choose the matching English word.';
    feedback.textContent = 'English mode: German prompt in the center, English answers around it.';
  } else {
    state.options = sampleOptions(wordGerman(state.current), state.words.map(wordGerman), 4);
    promptLabel.textContent = 'English word';
    promptWord.textContent = state.current.english;
    promptHint.textContent = 'Choose the matching German word.';
    feedback.textContent = 'German mode: English prompt in the center, German answers around it.';
  }

  updateChrome();
  renderAnswers();
  renderNeurons();
}

function correctAnswer() {
  if (state.mode === 'articles') return state.current.article;
  if (state.mode === 'english') return state.current.english;
  return wordGerman(state.current);
}

function updateChrome() {
  stage.className = `heroStage ${state.mode === 'english' ? 'british' : state.mode}`;
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
  scoreElement.textContent = state.score;
  roundElement.textContent = state.round;
}

function renderAnswers() {
  const options = state.mode === 'articles' ? state.options : shuffle(state.options);
  const fragment = document.createDocumentFragment();
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = `answerButton ${answerPositions[index]}`;
    button.style.animationDelay = `${index * 90}ms`;
    button.textContent = option;
    button.addEventListener('click', () => chooseAnswer(option));
    fragment.append(button);
  });
  answers.replaceChildren(fragment);
}

function chooseAnswer(answer) {
  if (state.selected) return;
  state.selected = answer;
  const expected = correctAnswer();
  const isCorrect = answer === expected;
  if (isCorrect) state.score += 1;
  feedback.className = `feedback ${isCorrect ? 'ok' : 'bad'}`;
  feedback.textContent = isCorrect ? `Correct: ${expected}` : `Expected: ${expected}`;
  [...answers.children].forEach((button) => {
    button.disabled = true;
    if (button.textContent === expected) button.classList.add('correct');
    if (button.textContent === answer && !isCorrect) button.classList.add('wrong');
  });
  nextButton.disabled = false;
  updateChrome();
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
    buildRound();
  } catch (error) {
    feedback.className = 'feedback bad';
    feedback.textContent = error.message;
  }
}

function setMode(mode) {
  state.mode = mode;
  state.round += 1;
  buildRound();
}

function nextRound() {
  state.round += 1;
  buildRound();
}

function resetGame() {
  state.score = 0;
  state.round = 1;
  state.usedByDeck.clear();
  buildRound();
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
categoryFilter.addEventListener('change', nextRound);
nextButton.addEventListener('click', nextRound);
resetButton.addEventListener('click', resetGame);
categoryInput.addEventListener('change', updateArticleInputState);
wordForm.addEventListener('submit', addCustomWord);
updateArticleInputState();
loadWords();
