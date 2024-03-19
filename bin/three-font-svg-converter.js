#!/usr/bin/env node

// Invoke by passing in stdin the content of the file you want to convert, such as:
// `$ cat media/fonts/icons_regular.json | node scripts/threeFontSVGConverter.js`

const fs = require('fs');
const JSDOM = require('jsdom');

const DOM = new JSDOM.JSDOM();

/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable semi-spacing */

const svg = (data, pathData) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.boundingBox.xMin} ${data.boundingBox.yMin} ${data.boundingBox.xMax - data.boundingBox.xMin} ${data.boundingBox.yMax - data.boundingBox.yMin}"><path d="${pathData}" fill="white"/></svg>`;

function threeToSVG(data) {
  Object.entries(data.glyphs).forEach(([glyph, info]) => {
    const glyphCodePointHex = glyph.codePointAt(0).toString(16);
    const encodedGlyph = `\\u${'0000'.substring(0, 4 - glyphCodePointHex.length)}${glyphCodePointHex}`;

    console.log(`Glyph codepoint: ${encodedGlyph}`);
    if (info?.name) console.log(`Name: ${info.name}`);
    console.log(`X offset: ${info.ha}`);

    // see node_modules/three/examples/jsm/loaders/FontLoader.js
    const input = info.o.split(' ');

    let path = '';
    for (
      let i = 0;
      i < input.length - 1 /** the last element is an empty string */;
    ) {
      const action = input[i++];
      if (action === '') break;
      switch (action) {
        case 'm': { // moveTo
          const x = input[i++];
          const y = input[i++];

          // path.moveTo(x, y);
          path += `M ${x} ${y} `;
          break;
        }
        case 'l': { // lineTo
          const x = input[i++];
          const y = input[i++];

          // path.lineTo(x, y);
          path += `L ${x} ${y} `;
          break;
        }
        case 'q': { // quadraticCurveTo
          const x = input[i++];
          const y = input[i++];
          const controlPointX1 = input[i++];
          const controlPointY1 = input[i++];

          // path.quadraticCurveTo(controlPointX1, controlPointY1, x, y);
          path += `Q ${controlPointX1} ${controlPointY1}, ${x} ${y} `;
          break;
        }
        case 'b': { // bezierCurveTo
          const x = input[i++];
          const y = input[i++];
          const controlPointX1 = input[i++];
          const controlPointY1 = input[i++];
          const controlPointX2 = input[i++];
          const controlPointY2 = input[i++];

          // path.bezierCurveTo(controlPointX1, controlPointY1, controlPointX2, controlPointY2, x, y);
          path += `C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${x} ${y} `;
          break;
        }
        case 'z': {
          path += 'Z';
          break;
        }
        default: {
          console.error(`Unknown action: ${action}`);
          process.exit(1);
        }
      }
    }

    console.log(svg(data, path));
  });
}

function svgToThree(data) {
  const parser = new DOM.window.DOMParser();
  const svgDocument = parser.parseFromString(data, 'image/svg+xml');
  const svgElement = svgDocument.documentElement;
  const viewBox = svgElement.attributes.getNamedItem('viewBox').value;
  const [minX, minY, width, height] = viewBox.split(' ').map((x) => +x);
  const maxX = width + minX;
  const maxY = height + minY;

  const pathData = svgDocument.documentElement.querySelector('svg path').attributes.getNamedItem('d').value;

  const input = pathData.split(' ');
  let path = '';

  for (
    let i = 0;
    i < input.length;
  ) {
    const action = input[i++];
    if (action === '') break;
    switch (action) {
      case 'M': { // move
        const x = input[i++];
        const y = input[i++];

        path += `m ${x} ${y} `;
        break;
      }
      case 'L': { // lineTo
        const x = input[i++];
        const y = input[i++];

        path += `l ${x} ${y} `;
        break;
      }
      case 'Q': { // quadraticCurveTo
        const controlPointX1 = input[i++];
        const controlPointY1 = input[i++].slice(0, input[i - 1].length - 1);
        const x = input[i++];
        const y = input[i++];

        // path.quadraticCurveTo(controlPointX1, controlPointY1, x, y);
        path += `q ${x} ${y} ${controlPointX1} ${controlPointY1} `;
        break;
      }
      case 'C': { // bezierCurveTo
        const controlPointX1 = input[i++];
        const controlPointY1 = input[i++].slice(0, input[i - 1].length - 1);
        const controlPointX2 = input[i++];
        const controlPointY2 = input[i++].slice(0, input[i - 1].length - 1);
        const x = input[i++];
        const y = input[i++];

        // path.bezierCurveTo(controlPointX1, controlPointY1, controlPointX2, controlPointY2, x, y);
        path += `b ${x} ${y} ${controlPointX1} ${controlPointY1} ${controlPointX2} ${controlPointY2} `;
        break;
      }
      case 'Z': {
        path += 'z';
        break;
      }
      default: {
        console.error(`Unknown action: ${action}`);
        process.exit(1);
      }
    }
  }

  const glyph = {
    ha: 0, // horizontal advance? doesn't seem to be used
    x_min: minX,
    x_max: maxX,
    o: path,
  };
  console.log(`\n\n${JSON.stringify(glyph)}`);
}

if (process.argv[2] === '--svg') {
  const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
  threeToSVG(data);
} else if (process.argv[2] === '--three') {
  const data = fs.readFileSync(0, 'utf-8');
  svgToThree(data);
} else {
  console.error('Unknown option');
}
