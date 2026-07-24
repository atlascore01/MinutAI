const fs = require('fs');
const path = require('path');

const headerPath = path.join(__dirname, 'public', 'logo full white.png');
const signaturePath = path.join(__dirname, 'public', 'atlascore_firma.png');
const outPath = path.join(__dirname, 'src', 'utils', 'logos.js');

const header = fs.readFileSync(headerPath, 'base64');
const signature = fs.readFileSync(signaturePath, 'base64');

fs.mkdirSync(path.join(__dirname, 'src', 'utils'), { recursive: true });

fs.writeFileSync(outPath, 
  `export const HEADER_LOGO_BASE64 = 'data:image/png;base64,${header}';\n` +
  `export const SIGNATURE_LOGO_BASE64 = 'data:image/png;base64,${signature}';\n`
);

console.log('Generated src/utils/logos.js');
