# Math Fluency + Working Memory Trainer

Browser-only web app.

## Pages

- **`index.html`** — landing page, served at the site root. Describes both tasks
  (multiplication and fraction comparison), the shared solve → hold → recall → review trial,
  the span rules, the practice trial in lessons 1–3, the two conditions, and the measures
  recorded. Links into both tasks.
- **`fraction.html`** / `fraction.js` — the Fraction Comparison task.
- **`multiplication.html`** / `multiplication.js` — the Multiplication task. `task.css` is shared by both tasks.

## Fraction Comparison task

Enter name, ID, lesson (1–15) and condition, then Start.

- **Items** are seeded from the lesson number, so every student in a lesson meets the same
  pairs in the same order in both conditions. Denominators are drawn from 2, 3, 4, 5, 6, 8,
  10 and 12. Lessons 1–4 use shared-denominator and shared-numerator pairs, the latter
  beginning with unit fractions; lessons 5–15 add a fraction greater than one half compared
  with one half.
- **Span** starts at 2, rises by one after two consecutive sequences recalled correctly and
  falls by one after two consecutive sequences recalled incorrectly, with a floor of 2.
- **Practice** — lessons 1–3 open with a 2-minute practice trial that marks each comparison
  right or wrong and shows the correct recall order. Practice is recorded but kept separate.
- **Trial** — 5 minutes. Nothing is marked right or wrong while a set runs. After the recall
  response is entered, that set's pairs are shown briefly as inequalities (`3/8 < 5/8`). No
  feedback is given on the recall sequence.
- **Fraction-only condition** — the same pairs in the same order, answered as they come, with
  no retain-or-recall step.

## Multiplication task

Same structure as the fraction task: name, ID, lesson (1–15) and condition.

- **Items** — lessons 1–5 use the facts from 1 to 5, lessons 6–15 the full 1–9 range. Problems
  are seeded from the lesson number, so every student in a lesson meets the same problems in
  the same order in both conditions. Each problem offers four answers to choose from: the correct product plus near misses (a factor off by one, the product off by one or two, and the sum).
- **Span** starts at 2, rises by one after three consecutive sequences recalled correctly and
  falls by one after three consecutive sequences recalled incorrectly, with a floor of 2.
- **Practice** — lessons 1–3 open with a 2-minute practice trial that marks each calculation
  right or wrong and shows the correct recall order.
- **Trial** — 5 minutes, no feedback. Recall is done by tapping the answers from a pool. After recall, every problem in that set is shown with its
  correct answer (`3 × 4 = 12`).
- **Multiplication-only condition** — the same problems in the same order, answered as they
  come, with no retain-or-recall step.

## How the span moves

In a scored trial the span rises and falls on the **recall sequence alone**. Recall is scored
against the answer the student gave, not the correct one: a student who computes 3 × 4 as 13
but recalls 13 in the right position has produced a correct sequence and still advances.
Calculation accuracy is recorded separately and never affects the span. In practice, where the
student is corrected on the spot, recall is scored against the correct answer.

## Records

Both tasks record every item and every sequence, in practice as well as in the scored trial.
Data is saved to browser `localStorage` and exported as CSV with **one row per item**, carrying
`phase` (practice/trial), `set`, `span`, `set_complete`, the item, the correct answer, the
student's response, `answer_correct`, and the set's `sequence_correct`. Trial accuracy below
50% is flagged on the summary screen.


## Run locally

```bash
cd math-fluency-app
python3 -m http.server 4177
```

On Windows without Python, use the bundled PowerShell server instead:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .tools/serve.ps1 -Port 4177
```

Open **http://localhost:4177/** in your browser.

## Host on GitHub Pages

1. `git init` → `git add .` → `git commit -m "Add math fluency app"`
2. Create repo on GitHub, then: `git remote add origin <url>` → `git push -u origin main`
3. Settings → Pages → Deploy from branch `main`, folder `/root`
