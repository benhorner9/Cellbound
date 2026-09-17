const fs = require('fs');
const path = require('path');

const files = [
  'index.html', 'styles.css', 'script.js',
  'character.html', 'character.css', 'character.js',
  'curo.html', 'curo.css', 'curo.js',
  'curo-core.js', 'curo-render.js', 'curo-combat.js', 'curo-init.js'
];

const out = path.join(__dirname, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const touchFix = `\n<style id="cellbound-ios-touch-fix">\nhtml,body{touch-action:manipulation;-webkit-text-size-adjust:100%;}\nbutton,a,input,label,[role="button"]{touch-action:manipulation;}\n@media (hover:none) and (pointer:coarse){input,select,textarea{font-size:16px!important;}}\n</style>\n`;

for (const file of files) {
  const src = path.join(__dirname, file);
  const dest = path.join(out, file);
  let contents = fs.readFileSync(src, 'utf8');

  if (file.endsWith('.html')) {
    contents = contents.replace('</head>', `${touchFix}</head>`);
  }

  fs.writeFileSync(dest, contents);
}

console.log('Cellbound build complete with iPad touch safeguards.');
