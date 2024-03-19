#!/usr/bin/env node

// Invoke by passing in stdin the content of the file you want to convert, such as:
// `$ cat media/fonts/icons_regular.json | node scripts/threeFontSVGConverter.js`

const fs = require('fs');

/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable max-len */
/* eslint-disable semi-spacing */

const utf8Encode = new TextEncoder();

const hexEncode = (string) => Array.from(utf8Encode.encode(string)).map((b) => b.toString(16)).join('');
const svg = (data, pathData) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.boundingBox.xMin} ${data.boundingBox.yMin} ${data.boundingBox.xMax - data.boundingBox.xMin} ${data.boundingBox.yMax - data.boundingBox.yMin}"><path d="${pathData}" fill="white"/></svg>`;

function threeToSVG(data) {
  Object.entries(data.glyphs).forEach(([glyph, info]) => {
    const encodedGlyph = hexEncode(glyph);

    console.log(`Glyph codepoint (?): ${encodedGlyph}`);
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
          path += `C ${controlPointX1} ${controlPointY1},  ${controlPointX2} ${controlPointY2}, ${x} ${y} `;
          break;
        }
        case 'z': {
          path += 'z';
          break;
        }
        default: {
          console.error(`Unknown action: ${action} ${hexEncode(action)} ${action === ""}`);
          process.exit(1);
        }
      }
    }

    console.log(svg(data, path));
  });
}

const data = JSON.parse(fs.readFileSync(0, 'utf-8'));

if (process.argv[2] === '--svg') {
  threeToSVG(data);
} else if (process.argv === '--three') {
  //svgToThree();
} else {
  console.error('Unknown option');
}
