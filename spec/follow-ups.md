## 1. Will the video causes the paint to be blocked [Shadow DOM]?

No it does not. Testing by throttling specifically the video request. The rest of the DOM still gets painted while the video just loads by itself.


## 2. How should TOC be handled by host app [Shadow DOM and Iframe]?

I only did it for ShadowDOM since the approach is similar.

Initially I thought I could rely on Mantine's Components like `TableOfContent` or even the `useScrollSpy` hook, but the implementation for both of it only allows query selectors of the Light DOM / Host App.

Hence, have to rely on personal implementation using Observer API and integrating with React using useRef hooks.


## 3. Bubbling of Events from Shadow DOM to Host App [Shadow DOM]

For events to move from a Shadow DOM to the host application, they must pass through the shadow boundary. This process is governed by two main concepts: propagation properties and event retargeting. [1, 2, 3] 

1. Two Key Event Properties

For an event to reach the "Light DOM" (the main app), it needs specific settings:

* bubbles: true: Allows the event to travel up from the target element to its parents within the same DOM tree.
* composed: true: This is the "magic key" that allows an event to cross the shadow boundary into the standard DOM.
* 
Most standard UI events (like click, touch, mousedown) are both bubbles: true and composed: true by default, so they "just work". However, Custom Events default to false for both and must be manually configured:

this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: true,
  detail: { key: 'value' }
}));

2. Event Retargeting (The "Masking" Effect)

To maintain encapsulation, the browser retargets events as they cross the shadow boundary. [9, 10] 

* Inside the Shadow DOM: The event.target is the actual element that was clicked (e.g., a <button> inside your component).
* Outside (in the Host App): The event.target is reset to the shadow host element itself. The main app sees the event as coming from your component as a whole, hiding the internal implementation details. [9, 11, 12, 13] 

3. Seeing the Full Path

If you need to know exactly which internal element was clicked from the outside, you can use event.composedPath(). [6, 14] 

* This returns an array of all nodes the event passed through, including those inside the Shadow DOM.
* Note: If the Shadow DOM is in mode: 'closed', the path will be truncated and will not show internal elements to the outside world. 


| Property       | Default (Custom Events) | Role                                             |
| -------------- | ----------------------- | ------------------------------------------------ |
| bubbles        | false                   | Propagates up the current DOM tree.              |
| composed       | false                   | Breaks through the Shadow DOM boundary.          |
| target         | N/A                     | Changes to the host element once outside.        |
| composedPath() | N/A                     | Reveals the true origin (if the shadow is open). |


## 4. How does HTML Document Strings get handled in Shadow DOM? [Shadow DOM]

When you inject a full HTML string (containing <html>, <head>, and <body>) into a shadowRoot via innerHTML, the browser treats it as a document fragment, not a standalone document. This results in the following behavior:

### Structural Tags (<html>, <head>, <body>)

* Behavior: Ignored or Stripped.
* Reason: A document can only have one root <html> and one <body>. Since the Shadow DOM is a "mini DOM" attached to an existing page, the parser ignores these top-level structural tags.
* Result: Only the contents inside these tags are parsed and added to the Shadow Tree.

## Header Content (<style>, <link>)

* Behavior: Parsed and Applied.
* Reason: Even though the <head> tag itself is stripped, the browser still processes <style> and <link rel="stylesheet"> tags found within the string.
* Encapsulation: These styles are locally scoped. They will style elements inside the Shadow DOM but will not leak out to the main page.

### Metadata and Scripts (<title>, <meta>, <script>)

* <title> & <meta>: Ignored. A Shadow DOM cannot modify the global document's title or metadata (like viewport or charset).
* <script>: Will not execute. When using innerHTML, the HTML5 specification dictates that <script> tags should not run for security reasons. To run scripts, you must manually create and append them.

### Comparison Table: Behavior Summary

| Tag in String | Status in Shadow DOM | Resulting Behavior                               |
| ------------- | -------------------- | ------------------------------------------------ |
| <html>        | Stripped             | The wrapper is removed; content is flattened.    |
| <head>        | Stripped             | Container is removed; children are processed.    |
| <body>        | Stripped             | Container is removed; children are rendered.     |
| <style>       | Kept                 | Styles are applied locally within the component. |
| <header>      | Kept                 | Treated as a normal, semantic block element.     |
| <script>      | Kept                 | Present in the DOM, but does not execute.        |

If you are rendering a full document string inside a Shadow DOM, the browser effectively "unwraps" the content. You end up with a flat list of elements (the styles and the body content) living inside the Shadow Root, isolated from the rest of the page's CSS.


## Can Shadow DOM use Host App's CSS Variables and vice versa?

- CSS Variables will it bleed?

```css
var(--color-black);
```