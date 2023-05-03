# SnapText

Snap a picture of HTML text. For a demo see the "snap picture" buttons at the top of certain code examples on [PQINA.nl](https://pqina.nl/blog/upload-image-with-nodejs/)

```html
<script type="module">
    // import the module
    import snapText from './snapText.js';

    // snap a picture of some text
    const canvas = await snapText('pre.language-html');

    // add picture to body for viewing
    document.body.append(canvas);
</script>
```

I've only tested this on desktop Chrome, Firefox, and Safri with text inside a `<pre>` element. I'm not sure if it'll work with non preformatted text.

## Usage

Pass either an `Element` or querySelector `string` as the first argument, the second argument is an options object.

-   `format` of the output, either `'svg'`, `'canvas'`, `'img'`, or `'blob'`
-   `width` of the output in pixels (optional)
-   `height` of the output in pixels (optional)
-   `padding` in pixels around the output
-   `scalar` of the output as a multiplier

Example:

```js
const img = await snapText('.my-element', {
    // we want an <img> element
    format: 'img',

    // image will be 1024 wide
    width: 1024,

    // with 24 pixels padding on the inside
    padding: 24,
});

// add to body for viewing
document.body.append(img);
```
