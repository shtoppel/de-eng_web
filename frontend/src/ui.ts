import type { AnswerStyle, CategoryKey, Mode } from './api.js';
import { countWordsByCategory, isFavorite, state } from './state.js';

function qs<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

export const elements = {
  stage: qs<HTMLElement>('#stage'),
  modeButtons: [...document.querySelectorAll<HTMLButtonElement>('.modeButton')],
  styleButtons: [...document.querySelectorAll<HTMLButtonElement>('.styleButton[data-style]')],
  categoryFilter: qs<HTMLSelectElement>('#categoryFilter'),
  deckSizeSelect: qs<HTMLSelectElement>('#deckSizeSelect'),
  favoriteModeButton: qs<HTMLButtonElement>('#favoriteModeButton'),
  scoreElement: qs<HTMLElement>('#score'),
  answeredElement: qs<HTMLElement>('#answered'),
  accuracyElement: qs<HTMLElement>('#accuracy'),
  roundElement: qs<HTMLElement>('#round'),
  promptCard: qs<HTMLElement>('#promptCard'),
  promptLabel: qs<HTMLElement>('#promptLabel'),
  promptWord: qs<HTMLElement>('#promptWord'),
  promptHint: qs<HTMLElement>('#promptHint'),
  promptExample: qs<HTMLElement>('#promptExample'),
  answers: qs<HTMLElement>('#answers'),
  cardAnswerForm: qs<HTMLFormElement>('#cardAnswerForm'),
  cardAnswerInput: qs<HTMLInputElement>('#cardAnswerInput'),
  feedback: qs<HTMLElement>('#feedback'),
  nextButton: qs<HTMLButtonElement>('#nextButton'),
  showAnswerButton: qs<HTMLButtonElement>('#showAnswerButton'),
  favoriteButton: qs<HTMLButtonElement>('#favoriteButton'),
  resetButton: qs<HTMLButtonElement>('#resetButton'),
  neuronLayer: qs<HTMLElement>('#neuronLayer'),
  wordForm: qs<HTMLFormElement>('#wordForm'),
  categoryInput: qs<HTMLSelectElement>('#categoryInput'),
  articleInput: qs<HTMLSelectElement>('#articleInput'),
  formResult: qs<HTMLElement>('#formResult'),
};

export const categoryFilterOptions = [...elements.categoryFilter.options];
export const answerPositions = ['top', 'right', 'bottom', 'left'] as const;
export const neuronStarts = [
  ['-42vw', '-32vh'], ['42vw', '-32vh'], ['-42vw', '32vh'], ['42vw', '32vh'],
  ['-48vw', '0vh'], ['48vw', '0vh'], ['0vw', '-38vh'], ['0vw', '38vh'],
] as const;


export function renderCategoryOptions(categories: Record<CategoryKey, string>): void {
  const allLabel = categoryFilterOptions[0]?.dataset.label || 'All categories';
  const practiceOptions = [new Option(allLabel, '')];
  const formOptions: HTMLOptionElement[] = [];

  Object.entries(categories).forEach(([value, label]) => {
    practiceOptions.push(new Option(label, value));
    formOptions.push(new Option(label, value));
  });

  elements.categoryFilter.replaceChildren(...practiceOptions);
  elements.categoryInput.replaceChildren(...formOptions);
  elements.categoryInput.value = 'noun';
  categoryFilterOptions.splice(0, categoryFilterOptions.length, ...elements.categoryFilter.options);
}

export function updateCategoryFilterCounts(): void {
  const counts = countWordsByCategory();
  categoryFilterOptions.forEach((option) => {
    const label = option.dataset.label || option.textContent?.replace(/\s+\(\d+\)$/, '') || '';
    option.dataset.label = label;
    const count = option.value ? counts[option.value] || 0 : state.words.length;
    option.textContent = `${label} (${count})`;
  });
}

export function selectedDeckSize(): string {
  return elements.deckSizeSelect.value;
}

export function deckLimit(): number {
  const size = selectedDeckSize();
  return size === 'infinite' ? Infinity : Number(size);
}

export function setFeedback(message: string, className = 'feedback'): void {
  elements.feedback.className = className;
  elements.feedback.textContent = message;
}

export function updateChrome(): void {
  elements.scoreElement.textContent = String(state.score);
  elements.answeredElement.textContent = String(state.answered);
  elements.accuracyElement.textContent = state.answered ? `${Math.round((state.score / state.answered) * 100)}%` : '0%';
  elements.roundElement.textContent = String(state.round);

  elements.modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === state.mode);
  });
  elements.styleButtons.forEach((button) => {
    const style = button.dataset.style as AnswerStyle | undefined;
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

export function renderNeurons(): void {
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

export function updateArticleInputState(): void {
  const isNoun = elements.categoryInput.value === 'noun';
  elements.articleInput.disabled = !isNoun;
  elements.articleInput.required = isNoun;
}

export function onMode(handler: (mode: Mode) => void): void {
  elements.modeButtons.forEach((button) => button.addEventListener('click', () => handler(button.dataset.mode as Mode)));
}

export function onStyle(handler: (style: AnswerStyle) => void): void {
  elements.styleButtons.forEach((button) => button.addEventListener('click', () => handler(button.dataset.style as AnswerStyle)));
}
