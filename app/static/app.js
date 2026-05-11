const modeLabel = document.querySelector('#modeLabel');
const word = document.querySelector('#word');
const translation = document.querySelector('#translation');
const example = document.querySelector('#example');
const result = document.querySelector('#result');
const nextButton = document.querySelector('#nextButton');
const showButton = document.querySelector('#showButton');
const articleOptions = document.querySelector('#articleOptions');
const menuButtons = [...document.querySelectorAll('#menu button')];
const wordForm = document.querySelector('#wordForm');
const categoryInput = document.querySelector('#categoryInput');
const articleInput = document.querySelector('#articleInput');
const formResult = document.querySelector('#formResult');
const labels = {
  noun: 'Nouns',
  verb: 'Verbs',
  adjective: 'Adjectives',
  adverb: 'Adverbs',
  random: 'Random mode',
  articles: 'Article training',
};
let mode = 'random';
let current = null;

function setLoading(isLoading) {
  nextButton.disabled = isLoading;
  showButton.disabled = isLoading;
  menuButtons.forEach((button) => { button.disabled = isLoading; });
}

function showError(message) {
  result.className = 'result bad';
  result.textContent = message;
}

function showFormStatus(message, isSuccess) {
  formResult.className = `result ${isSuccess ? 'ok' : 'bad'}`;
  formResult.textContent = message;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function setMode(nextMode) {
  mode = nextMode;
  menuButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  loadNext();
}

function renderArticleOptions(options) {
  const buttons = options.map((article) => {
    const button = document.createElement('button');
    button.dataset.article = article;
    button.textContent = article;
    return button;
  });
  articleOptions.replaceChildren(...buttons);
}

function renderWordCard(nextWord, label = null) {
  current = nextWord;
  modeLabel.textContent = label || current.category_label;
  word.textContent = current.article ? `${current.article} ${current.german}` : current.german;
  translation.textContent = 'Translation hidden';
  example.textContent = current.example;
}

async function loadNext() {
  setLoading(true);
  result.textContent = '';
  articleOptions.hidden = mode !== 'articles';
  showButton.hidden = mode === 'articles';
  try {
    if (mode === 'articles') {
      current = await fetchJson('/api/articles/random');
      modeLabel.textContent = labels[mode];
      word.textContent = current.noun;
      translation.textContent = current.english;
      example.textContent = 'Choose the correct German article.';
      renderArticleOptions(current.options);
      return;
    }
    const query = mode === 'random' ? '' : `?category=${mode}`;
    const nextWord = await fetchJson(`/api/words/random${query}`);
    renderWordCard(nextWord, mode === 'random' ? `${labels[mode]} · ${nextWord.category_label}` : labels[mode]);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

async function checkArticle(article) {
  if (!current) return;
  setLoading(true);
  try {
    const answer = await fetchJson('/api/articles/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: current.id, article }),
    });
    result.className = `result ${answer.correct ? 'ok' : 'bad'}`;
    result.textContent = answer.correct ? `Correct: ${answer.full_word}` : `Expected: ${answer.full_word}`;
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
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
  try {
    const createdWord = await fetchJson('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload()),
    });
    showFormStatus(`Added: ${createdWord.german}`, true);
    wordForm.reset();
    updateArticleInputState();
    articleOptions.hidden = true;
    showButton.hidden = false;
    renderWordCard(createdWord, `Added word · ${createdWord.category_label}`);
  } catch (error) {
    showFormStatus(error.message, false);
  } finally {
    submitButton.disabled = false;
  }
}

menuButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
nextButton.addEventListener('click', loadNext);
showButton.addEventListener('click', () => {
  if (current && mode !== 'articles') translation.textContent = current.english;
});
articleOptions.addEventListener('click', (event) => {
  if (event.target.dataset.article) checkArticle(event.target.dataset.article);
});
categoryInput.addEventListener('change', updateArticleInputState);
wordForm.addEventListener('submit', addCustomWord);
updateArticleInputState();
setMode('random');
