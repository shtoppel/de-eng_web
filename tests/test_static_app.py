from __future__ import annotations

import subprocess
import textwrap
import unittest
from pathlib import Path


APP_JS = Path(__file__).resolve().parents[1] / "app" / "static" / "app.js"


class StaticAppTests(unittest.TestCase):
    def test_article_mode_switch_from_cards_renders_article_choices(self) -> None:
        node_script = textwrap.dedent(
            f"""
            const fs = require('fs');
            const vm = require('vm');
            const appSource = fs.readFileSync({str(APP_JS)!r}, 'utf8');

            function makeClassList() {{
              const classes = new Set();
              return {{
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                toggle: (name, force) => {{
                  if (force) classes.add(name); else classes.delete(name);
                }},
                contains: (name) => classes.has(name),
              }};
            }}

            function makeElement(dataset = {{}}) {{
              return {{
                dataset,
                classList: makeClassList(),
                children: [],
                disabled: false,
                hidden: false,
                value: '',
                textContent: '',
                style: {{ setProperty() {{}} }},
                setAttribute(name, value) {{ this[name] = value; }},
                addEventListener(type, handler) {{ this['on' + type] = handler; }},
                click() {{ if (this.onclick) this.onclick({{ preventDefault() {{}} }}); }},
                append(child) {{ this.children.push(child); }},
                replaceChildren(...items) {{
                  this.children = [];
                  for (const item of items) {{
                    if (item && Array.isArray(item.children) && item.isFragment) this.children.push(...item.children);
                    else if (item) this.children.push(item);
                  }}
                }},
                querySelector() {{ return makeElement(); }},
                focus() {{}},
                reset() {{}},
              }};
            }}

            const elements = new Map();
            for (const id of [
              'stage', 'categoryFilter', 'deckSizeSelect', 'score', 'answered', 'accuracy', 'round',
              'promptCard', 'promptLabel', 'promptWord', 'promptHint', 'answers', 'cardAnswerForm',
              'cardAnswerInput', 'feedback', 'nextButton', 'resetButton', 'neuronLayer', 'wordForm',
              'categoryInput', 'articleInput', 'formResult',
            ]) elements.set('#' + id, makeElement());
            elements.get('#deckSizeSelect').value = '10';
            elements.get('#categoryFilter').value = '';
            elements.get('#categoryInput').value = 'noun';

            const modeButtons = [makeElement({{ mode: 'english' }}), makeElement({{ mode: 'german' }}), makeElement({{ mode: 'articles' }})];
            const styleButtons = [makeElement({{ style: 'multi' }}), makeElement({{ style: 'cards' }})];

            const document = {{
              querySelector(selector) {{ return elements.get(selector); }},
              querySelectorAll(selector) {{
                if (selector === '.modeButton') return modeButtons;
                if (selector === '.styleButton') return styleButtons;
                return [];
              }},
              createDocumentFragment() {{ return {{ isFragment: true, children: [], append(child) {{ this.children.push(child); }} }}; }},
              createElement() {{ return makeElement(); }},
            }};

            const words = [
              {{ id: 1, category: 'noun', article: 'der', german: 'Hund', english: 'dog' }},
              {{ id: 2, category: 'noun', article: 'die', german: 'Katze', english: 'cat' }},
              {{ id: 3, category: 'noun', article: 'das', german: 'Haus', english: 'house' }},
              {{ id: 4, category: 'verb', article: null, german: 'gehen', english: 'to go' }},
            ];
            const context = {{
              document,
              window: {{ setTimeout: (fn) => {{ fn(); return 1; }} }},
              fetch: async () => ({{ ok: true, json: async () => words }}),
              setTimeout: (fn) => {{ fn(); return 1; }},
              clearTimeout: () => {{}},
              console,
            }};

            vm.runInNewContext(appSource, context);
            setImmediate(() => {{
              styleButtons[1].click();
              if (elements.get('#cardAnswerForm').hidden) throw new Error('Cards form was not shown before switching modes');

              modeButtons[2].click();
              const answerLabels = elements.get('#answers').children.map((child) => child.textContent);
              if (!elements.get('#cardAnswerForm').hidden) throw new Error('Cards form stayed visible in article mode');
              if (answerLabels.join(',') !== 'der,die,das') throw new Error(`Expected article buttons, got ${{answerLabels.join(',')}}`);
              if (!styleButtons[0].classList.contains('active')) throw new Error('Multichoice style is not active in article mode');
              if (!styleButtons[1].disabled) throw new Error('Cards style button is not disabled in article mode');
            }});
            """
        )

        result = subprocess.run(
            ["node", "-e", node_script],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
