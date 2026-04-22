# Why `.cGrid` Didn't Collapse: Media Query vs Container Query

## TL;DR

`@media` queries always check the **browser viewport width**, not the width of the element you're styling. Your `.cGrid` looked cramped at ~500px, but the viewport was 1200px, so `@media (width < 700px)` was always false. The fix is `@container`, which queries an actual ancestor element's width.

---

## 1. The original (broken) CSS

```css
.cGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
}

@media (width < 700px) {
  .cGrid {
    grid-template-columns: 1fr;
  }
}
```

Intent: "when `.cGrid` is narrow, collapse to one column."
Reality: "when the whole browser window is narrower than 700px, collapse."

Those are very different things in this app.

---

## 2. Why it doesn't work — the layout stack

The article embed sits inside several nested layout boxes. Each one shrinks the actual space `.cGrid` has, but none of them affect what `@media` sees.

```
┌───────────────────────────────────────────────────────────────┐
│  viewport (browser window)           e.g. 1200px              │
│                                                               │
│   ┌─ Mantine <Container size="md">   max ~720px   ─────────┐  │
│   │                                                        │  │
│   │   ┌─ .contentLayout (article + TOC sidebar) ────────┐  │  │
│   │   │                                                 │  │  │
│   │   │   ┌─ .news-article ──────────────────────────┐  │  │  │
│   │   │   │                                          │  │  │  │
│   │   │   │   ┌─ .container ─────────────────────┐   │  │  │  │
│   │   │   │   │                                  │   │  │  │  │
│   │   │   │   │   ┌─ .cGrid (~500px wide) ───┐   │   │  │  │  │
│   │   │   │   │   │  [ item A ] [ item B ]   │   │   │  │  │  │
│   │   │   │   │   └──────────────────────────┘   │   │  │  │  │
│   │   │   │   └──────────────────────────────────┘   │  │  │  │
│   │   │   └──────────────────────────────────────────┘  │  │  │
│   │   └─────────────────────────────────────────────────┘  │  │
│   └────────────────────────────────────────────────────────┘  │
│                                                               │
│   ← @media queries measure THIS (viewport) →                  │
└───────────────────────────────────────────────────────────────┘
```

What `@media (width < 700px)` evaluates:
- Browser viewport = 1200px
- `1200 < 700` → **false**
- Rule never applies
- `.cGrid` stays in two columns even though it only has ~500px to work with → items get squashed

---

## 3. Why `min-width: 700px` only *appeared* to work

If you swap the query to:

```css
@media (min-width: 700px) {
  .cGrid { grid-template-columns: 1fr; }
}
```

On a normal desktop, the viewport is almost always ≥ 700px, so this rule fires **all the time**. You saw one column and thought "fixed!" — but it was firing for the wrong reason.

What you'd see at different viewport widths with the `min-width: 700px` version:

```
viewport:  1200px   →  rule applies   →  1 column   ✓ (looks right, by accident)
viewport:   800px   →  rule applies   →  1 column   ✓ (looks right, by accident)
viewport:   600px   →  rule OFF       →  2 columns  ✗ (suddenly cramped on a small screen!)
```

The logic is inverted: "when the window is **wide**, collapse to one column." That's the opposite of what a responsive grid usually wants. It's coincidence that it looks fine on your current screen.

---

## 4. The real solution — container queries

A container query measures the width of a specific ancestor element instead of the viewport.

```css
.container {
  container-type: inline-size;   /* mark this as a query container */
}

.cGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
}

@container (width < 700px) {
  .cGrid {
    grid-template-columns: 1fr;
  }
}
```

Two things to know:

1. **`container-type: inline-size`** turns an element into a "query container." Its inline (horizontal) size becomes something `@container` rules can measure.
2. **You can't self-query.** A container query always measures an **ancestor**, never the element it styles. That's why `container-type` goes on `.container` (the parent), not on `.cGrid` itself.

Now the behavior is based on the actual box `.cGrid` lives in:

```
.container = 500px  →  @container (width < 700px) matches  →  .cGrid is 1 column  ✓
.container = 900px  →  @container (width < 700px) fails    →  .cGrid is 2 columns ✓
```

It works the same regardless of whether the browser viewport is 400px or 3000px.

---

## 5. Visual comparison

### With `@media (width < 700px)` — broken

```
Browser: 1200px wide                 Browser: 600px wide
┌──────────────────────────┐         ┌──────────────┐
│ Mantine Container ~720px │         │ Container    │
│  ┌────────────────────┐  │         │  ┌────────┐  │
│  │ .cGrid ~500px      │  │         │  │ .cGrid │  │
│  │  [A]  [B]  ← bad!  │  │         │  │  [A]   │  │
│  │                    │  │         │  │  [B]   │  │
│  └────────────────────┘  │         │  └────────┘  │
└──────────────────────────┘         └──────────────┘
 viewport 1200 >= 700                 viewport 600 < 700
 → 2 columns (squashed)               → 1 column (fine)
```

### With `@container (width < 700px)` — correct

```
Browser: 1200px wide                 Browser: 600px wide
┌──────────────────────────┐         ┌──────────────┐
│ Mantine Container ~720px │         │ Container    │
│  ┌────────────────────┐  │         │  ┌────────┐  │
│  │ .container ~500px  │  │         │  │ ~500px │  │
│  │  ┌──────────────┐  │  │         │  │  ┌──┐  │  │
│  │  │ .cGrid       │  │  │         │  │  │[A│  │  │
│  │  │  [A]         │  │  │         │  │  │[B│  │  │
│  │  │  [B]         │  │  │         │  │  └──┘  │  │
│  │  └──────────────┘  │  │         │  └────────┘  │
│  └────────────────────┘  │         └──────────────┘
└──────────────────────────┘          container 500 < 700
 container 500 < 700                  → 1 column (fine)
 → 1 column (fine, not based on
    viewport at all)
```

The container-query version is indifferent to browser width. It only cares how much room `.container` actually has.

---

## 6. Side note: `zoom` doesn't help either

`NewsEmbed.tsx:58` sets `article.style.zoom = scale` when the user drags the font-size slider:

```ts
if (article) article.style.zoom = String(scale);
```

`zoom` visually scales the rendered content but does **not** change the viewport width that `@media` sees. So even if the user zooms way in, a media-query-based breakpoint still reads the real viewport. Container queries, on the other hand, measure the post-layout size of the container, so they interact more naturally with zoom.

---

## 7. Syntax note — `(width < 700px)` vs `(max-width: 699px)`

The range syntax `(width < 700px)` is valid modern CSS (Media Queries Level 4). It's supported in all current browsers. Nothing was wrong with the syntax in your original code — the problem was always **what** it was querying, not **how** it was written.

Equivalent older syntax:

```css
@media (max-width: 699.98px) { ... }
@container (max-width: 699.98px) { ... }
```

Use whichever reads more clearly to you. The range form is generally nicer.

---

## 8. The applied fix

In `shared/news-content/article.css`:

```diff
 .container {
+  container-type: inline-size;
   font-family: Arial, Helvetica, sans-serif;
   color: darkblue;
 }

 .cGrid {
   display: grid;
   grid-template-columns: 1fr 1fr;
   grid-template-rows: auto;
   gap: 1em;
 }

-@media (width < 700px) {
+@container (width < 700px) {
   .cGrid {
     grid-template-columns: 1fr;
     grid-template-rows: 1fr 1fr;
   }
 }
```

Two characters of intent change (`media` → `container`), one new property (`container-type`), and the grid now reacts to the space it actually has.

---

## 9. Combining viewport AND element-width checks

Sometimes you want the grid to react to *both* the viewport and its own container. `@media` and `@container` are **separate at-rules** — you can't join them with `and` in a single query. You combine them by nesting or stacking.

### Pattern A — BOTH must be true (AND)

Nest one inside the other. Rule fires only when both conditions match:

```css
@media (width < 700px) {
  @container (width < 700px) {
    .cGrid {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
    }
  }
}
```

Nesting order doesn't matter — `@container` inside `@media` behaves the same as `@media` inside `@container`.

### Pattern B — EITHER can trigger (OR)

Write both rules separately with the same body. If either matches, the rule applies:

```css
@media (width < 700px) {
  .cGrid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}

@container (width < 700px) {
  .cGrid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
```

This is the most common choice for responsive components: collapse whenever *anything* is narrow.

### Pattern C — different thresholds

Nothing forces both numbers to match:

```css
/* collapse on true mobile */
@media (width < 500px) {
  .cGrid { grid-template-columns: 1fr; }
}

/* also collapse when the component box itself is tight, even on desktop */
@container (width < 700px) {
  .cGrid { grid-template-columns: 1fr; }
}
```

Viewport rule = "phone mode." Container rule = "component squeezed." Either triggers single-column.

### Truth table (Pattern A vs Pattern B, both at 700px)

| viewport | container | Pattern A (AND) | Pattern B (OR) |
|----------|-----------|-----------------|----------------|
| 1200     | 500       | 2 cols          | 1 col          |
| 1200     | 900       | 2 cols          | 2 cols         |
| 600      | 500       | 1 col           | 1 col          |
| 600      | 900       | 2 cols          | 1 col          |

### Recommendation for `.cGrid`

Pattern B (OR). Embed should collapse whenever cramped — whether from a small phone viewport *or* a narrow parent column on desktop.

Requirement: `container-type: inline-size` must still be on `.container` for any `@container` rule to work (already set by the earlier fix).

### Why no single-query AND

CSS spec: `@media` and `@container` are distinct at-rules. There's no syntax like `@media (...) and @container (...)`. Nesting is the standard and well-supported way to combine them.

---

## 10. Rules of thumb

- Use `@media` when the thing you care about is the **viewport**: "mobile phone vs desktop," "print vs screen," "dark mode," "reduced motion."
- Use `@container` when the thing you care about is the **component's own available space**: "this card is narrow right now, stack its children."
- Embedded / reusable components (like this news embed) should almost always prefer `@container`. They can't assume anything about the surrounding layout.
- Remember: container queries query an **ancestor**, not the element itself. Put `container-type` one level up.
