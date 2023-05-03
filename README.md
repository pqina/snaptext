# SnapText

**📸 Snap a picture of HTML text**

For a demo see the "snap picture" buttons at the top of code examples on [PQINA.nl](https://pqina.nl/blog/upload-image-with-nodejs/)

```html
<script type="module">
// Import the module
import snapText from './snapText.js';

// Snap a picture of some text
const canvas = await snapText('pre.language-html');

// Add picture to body for viewing
document.body.append(canvas);
</script>
```

I've only tested this on desktop Chrome, Firefox, and Safari with text inside a `<pre>` element. At this time I'm not sure if it'll work with non preformatted text.

## Usage

Pass either an `Element` or querySelector `string` as the first argument, the second argument is an optional options object:

```js
// Use default options
const svg = await snapText('.my-element');

// Customize options (shows defaults)
const svg = await snapText('.my-element', {
   // The output format, set to 'svg', 'canvas', 'img', or 'blob'
   format: 'svg',
   
   // The output width in pixels (can set `width`, or `height`, or both)
   width: undefined,
   
   // The output height in pixels (can set `width`, or `height`, or both)
   height: undefined,
   
   // Padding in pixels around the output, added to the inside when `width` or `height` is set
   padding: 0,
   
   // Size multiplier in pixels
   scalar: 1
})
```

Example:

```js
const img = await snapText('.my-element', {
    // We want an <img> element
    format: 'img',

    // Image will be 1024 wide
    width: 1024,

    // Add 20 pixels padding on the inside
    padding: 20,
});

// Add to body for viewing
document.body.append(img);
```
