const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error('Refusing to clean an unexpected build directory');
}
fs.mkdirSync(output, { recursive: true });
for (const name of fs.readdirSync(output)) {
  fs.rmSync(path.join(output, name), { recursive: true, force: true });
}
for (const name of ['style.css', 'favicon.ico', 'assets']) {
  fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
}
const scripts = ['game.js', 'board-view.js', 'app.js'];
const bundle = scripts.map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n;\n');
fs.writeFileSync(path.join(output, 'assets', 'game.js'), bundle);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/  <script defer src="src\/(?:game|board-view|app)\.js"><\/script>\r?\n/g, '')
  .replace('</head>', '  <script defer src="assets/game.js"></script>\n</head>');
fs.writeFileSync(path.join(output, 'index.html'), html);
if (!fs.existsSync(path.join(output, 'index.html'))) {
  throw new Error('Build output is missing index.html');
}
console.log(`Static game ready: ${output}`);
