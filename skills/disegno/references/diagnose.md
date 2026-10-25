# Diagnose

Goal: show the user every place their UI reads as AI generated, with proof, and the fix for each.

## 1. Get a real render

Prefer a real browser over reading source. Computed styles are what the visitor sees; Tailwind classes and CSS
files often disagree with them.

- URL or local dev server: open it with whatever browser tool you have (Playwright, a browser MCP, the agent's
  built in browser). Use two viewports: 1440 by 900 and 390 by 844. Wait for network idle and `document.fonts.ready`.
- Screenshot only: you cannot run detect.js. Say so, and judge every rule by eye, marking all findings as
  "from screenshot, unverified".
- Source only: start the dev server if you can. If you cannot, read the components and say the result is a code
  review, not a render check.

## 2. Run the detector

Load `data/detect.js` into the page and call it.

Playwright example:

```js
const src = fs.readFileSync('data/detect.js', 'utf8');
await page.addScriptTag({ content: src });
const report = await page.evaluate(() => window.disegnoDetect({ highlight: true }));
await page.screenshot({ path: 'diagnose-1440.png', fullPage: true });
```

The report is JSON: `{ url, viewport, findings: [{ ruleId, selector, text, rect, evidence }] }`.
Run it at both widths. Keep the raw JSON; you will need it to prove the swap later.

## 3. Judge the manual rules

Rules with `detect.level: "manual"` cannot be measured from styles alone (for example copy that sounds
generated, or a hero that says nothing specific). Look at the captures and decide. Mark these "judged", not
"measured".

## 4. Report

One table, grouped by rule, highest severity first:

| Rule | What | Where | Count | Fix |
|---|---|---|---|---|
| AC-01 | All caps label with wide letter spacing | `.hero .eyebrow` and 3 more | 4 | sentence-case-eyebrow |

Then a short paragraph: the three changes that would remove most of the generated look, and what you did not
check (other pages, logged in states, dark mode).

Do not shame third party sites by name in anything the user may publish. Diagnose is for the user's own work or
sites they have permission to review.
