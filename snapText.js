//@ts-check

/**
 * @typedef { [string, string][] } ShapeStyles
 */

/**
 * @typedef { Object } Shape
 * @prop { number } x
 * @prop { number } y
 * @prop { number } width
 * @prop { number } height
 * @prop { string } text
 * @prop { ShapeStyles } styles
 */

/**
 * @param { string | Element } querySelectorOrNode
 * @param { { format?: 'svg' | 'canvas' | 'img' | 'blob', width?: number, height?: number, padding?: number, scalar?: number } } options
 */
export default async (querySelectorOrNode, options = {}) => {
    // validate input
    if (typeof querySelectorOrNode !== 'string' && querySelectorOrNode.nodeType !== 1) {
        throw `Need to supply a querySelector or HTMLElement`;
    }

    // if is queryString
    let element;
    if (typeof querySelectorOrNode === 'string') {
        element = document.querySelector(querySelectorOrNode);
        if (!element) throw `No element found with selector "${querySelectorOrNode}"`;
    } else {
        element = querySelectorOrNode;
    }

    // get options
    const { format = 'canvas', padding = 0, scalar = 1, width, height } = options;

    // invalid format supplied
    if (!/canvas|img|svg|blob/.test(format)) throw `Invalid format "${format}"`;

    // parse all subelements
    const shapes = normalizeShapes(getShapes(element, element.getBoundingClientRect()));

    // create svg
    const svg = shapesToSvg(shapes, { width, height, padding, scalar });
    if (format === 'svg')
        return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;

    // create blob
    const blob = svgToBlob(svg);
    if (format === 'blob') return blob;

    // create image
    const image = await svgToImage(blob);
    if (format === 'img') return image;

    // create canvas
    const canvas = await imageToCanvas(image);
    if (format === 'canvas') return canvas;
};

/**
 * Recursively parses an element tree to find all shapes to render
 * @param { Element|ChildNode } element
 * @param { { x:number, y:number } } offset
 * @returns { Shape[] }
 */
const getShapes = (element, offset) => {
    const shapes = [];

    // add self
    shapes.push(...getShape(element, offset));

    // add children
    const nodes = element.childNodes;
    for (const node of nodes) {
        shapes.push(...getShapes(node, offset));
    }

    return shapes.filter(Boolean);
};

// The styles we register
const RelevantShapeStyles = [
    ['color', 'rgba(0, 0, 0, 0)'],
    ['background-color', 'rgba(0, 0, 0, 0)'],
    ['font-size', '0px'],
    ['font-family', 'sans-serif'],
    ['font-weight', '400'],
    ['font-style', 'normal'],
    ['font-variant', 'normal'],
];

/**
 * Converts element into text shapes
 * @param { Element | ChildNode | Text } element
 * @param { { x:number, y:number } } offset
 * @returns { Shape[] }
 */
const getShape = (element, offset) => {
    // exit if is not text shape
    if (element.nodeType !== 3) return [];

    // get text shapes (if is multine will yield multiple shapes)
    return getTextShapes(/** @type { Text } */ (element))
        .filter(Boolean)
        .map((shape) => {
            shape.x -= offset.x;
            shape.y -= offset.y;
            return shape;
        });
};

/**
 * Creates a Shape object using a rect, style declaration, and text
 * @param { { x:number, y:number, width: number, height:number } } rect
 * @param { CSSStyleDeclaration } style
 * @param { string } text
 * @returns { Shape }
 */
const toShape = (rect, style, text) => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    styles: /** @type {[ string, string][]} */ (
        RelevantShapeStyles.map(([prop, valueToIgnore]) => {
            const value = style.getPropertyValue(prop);
            if (value === valueToIgnore) return;
            return [prop, value];
        }).filter(Boolean)
    ),
    text: text,
});

/**
 * Gets shapes for a text node
 * @param { Text } textNode
 * @returns { Shape[] }
 */
function getTextShapes(textNode) {
    // empty so ignore
    if (!textNode.nodeValue || !textNode.parentNode) return [];

    const text = textNode.nodeValue.trim();
    if (!text.length) return [];

    // calculate shape
    const computedStyle = getComputedStyle(/** @type { Element }*/ (textNode.parentNode));

    // test if is multiline
    const textNodeLines = getTextNodeLines(textNode);

    // lines
    return textNodeLines
        .filter(({ text }) => text.trim().length > 0)
        .map(({ rect, text }) => toShape(rect, computedStyle, text));
}

/**
 * Returns text node into line objects
 * @param { Text } textNode
 * @returns { { text: string, rect: { x:number, y:number, width:number, height:number } }[] }
 */
const getTextNodeLines = (textNode) => {
    const text = textNode.nodeValue;
    if (!text) return [];

    const textLength = text.length;

    const range = document.createRange();
    range.selectNodeContents(textNode);

    const lines = [];

    for (let i = 0; i < textLength; i++) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, i + 1);

        // which line are we at
        const lineIndex = range.getClientRects().length - 1;

        // get current character
        const char = text.charAt(i);

        // new line, or add to current line
        if (!lines[lineIndex]) lines.push(char);
        else lines[lineIndex] += char;
    }

    // merge text and rects
    const clientRects = range.getClientRects();
    return lines.map((line, index) => ({
        rect: clientRects[index],
        text: line,
    }));
};

/**
 * Offesets shapes to 0,0
 * @param { Shape[] } shapes
 * @returns { Shape[] }
 */
function normalizeShapes(shapes) {
    let l = Number.MAX_SAFE_INTEGER;
    let t = Number.MAX_SAFE_INTEGER;

    // get most top left offset
    for (const shape of shapes) {
        if (shape.x < l) l = shape.x;
        if (shape.y < t) t = shape.y;
    }

    // substract top left offset from all shapes
    for (const shape of shapes) {
        shape.x -= l;
        shape.y -= t;
    }

    return shapes;
}

/**
 * Get max size required to draw shapes
 * @param { Shape[] } shapes
 * @returns { { width: number, height: number } }
 */
function getSizeFromShapes(shapes) {
    let l = Number.MAX_SAFE_INTEGER;
    let t = Number.MAX_SAFE_INTEGER;
    let r = 0;
    let b = 0;

    for (const shape of shapes) {
        if (shape.x < l) l = shape.x;
        if (shape.y < t) t = shape.y;
        if (shape.x + shape.width > r) r = shape.x + shape.width;
        if (shape.y + shape.height > b) b = shape.y + shape.height;
    }

    return {
        width: r - l,
        height: b - t,
    };
}

/**
 * Map CSS props to SVG style props
 */
const CssSvgMap = {
    color: 'fill',
};

/**
 * Encodes SVG text content
 * @param { string } str
 * @returns { string }
 */
const encodeSvgText = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/%/g, '%25')
        .replace(/#/g, '%23')
        .replace(/ /g, '&#160;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/**
 * Converst SVG string to Blob
 * @param { string } svg
 * @returns { Blob }
 */
const svgToBlob = (svg) => new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });

/**
 * Converst shapes array to SVG string
 * @param { Shape[] } shapes
 * @param { { width?: number, height?: number, padding: number, scalar: number }} options
 * @returns { string }
 */
function shapesToSvg(shapes, { width, height, padding, scalar }) {
    // calculate size
    const contentSize = getSizeFromShapes(shapes);

    padding = width && padding ? Math.min(padding, width * 0.5) : padding;
    padding = height && padding ? Math.min(padding, height * 0.5) : padding;

    // just quick shortcut
    const paddingDouble = padding * 2;

    // if width/height defined -> calculate output size
    let contentScalar = 1;
    if (typeof width === 'number' || typeof height === 'number') {
        const aspectRatio = contentSize.width / contentSize.height;

        // expand height
        if (width && !height) {
            height = (width - paddingDouble) / aspectRatio + paddingDouble;
            contentScalar = Math.min((width - paddingDouble) / contentSize.width);
        }

        // expand width
        else if (height && !width) {
            width = (height - paddingDouble) * aspectRatio + paddingDouble;
            contentScalar = Math.min((height - paddingDouble) / contentSize.height);
        }

        // both -> center
        else if (width && height) {
            contentScalar = Math.min(
                (height - paddingDouble) / contentSize.height,
                (width - paddingDouble) / contentSize.width
            );
        }
    } else {
        // No size requirements -> expand to add padding
        width = contentSize.width + paddingDouble;
        height = contentSize.height + paddingDouble;
    }

    // Content
    let textNodes = '';
    let classCounter = 0;
    const selectors = new Map();

    for (const shape of shapes) {
        // needs text
        if (!shape.text) continue;

        // calculate style
        const style =
            shape.styles
                .reduce((styles, [prop, value]) => {
                    styles.push(`${CssSvgMap[prop] || prop}:${value}`);
                    return styles;
                }, /** @type{ string[]}*/ ([]))
                .join(';') + ';dominant-baseline: hanging';

        // if not exists, generate class and add to styles
        if (!selectors.has(style)) selectors.set(style, 's' + classCounter++);

        // add text node
        textNodes += `<text x="${shape.x}" y="${shape.y}" class="${selectors.get(
            style
        )}">${encodeSvgText(shape.text)}</text>`;
    }

    const styleText = Array.from(selectors.entries())
        .reduce((text, [style, selector]) => {
            text.push(`.${selector} { ${style} }`);
            return text;
        }, /** @type{ string[]}*/ ([]))
        .join('\n');

    const x = (contentSize.width * contentScalar - /** @type{number}*/ (width)) * 0.5 + padding;
    const y = (contentSize.height * contentScalar - /** @type{number}*/ (height)) * 0.5 + padding;

    return `<svg width="${/** @type{number}*/ (width) * scalar}" height="${
        /** @type{number}*/ (height) * scalar
    }" viewBox="${x} ${y} ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><style>${styleText}</style><g transform="translate(${padding} ${padding}) scale(${contentScalar})">${textNodes}</g></svg>`;
}

/**
 * Converst SVG string to image, will resolve with image in complete state
 * @param { Blob } blob
 * @returns { Promise<HTMLImageElement> }
 */
const svgToImage = (blob) =>
    new Promise((resolve, reject) => {
        const svgURL = URL.createObjectURL(blob);
        const image = new Image();
        image.onerror = reject;
        image.onload = () => resolve(image);
        image.src = svgURL;
    });

/**
 * Draws image to canvas of size width/height
 * @param { HTMLImageElement } image
 * @returns { Promise<HTMLCanvasElement> }
 */
const imageToCanvas = (image) =>
    new Promise((resolve, reject) => {
        // create canvas to hold image
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No drawing context');

        // draw image to the canvas at full size
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // clean up memory
        URL.revokeObjectURL(image.src);

        // done!
        resolve(canvas);
    });
