// 只读加载原始 Game.js，以它独立生成的棋盘为迁移核对基准。
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { BOARD, score } = require('../src/game.js');
const file = process.argv[2];
if (!file) {
  console.error('用法：npm run verify:source -- <原始 assets/scripts/Game.js 路径>');
  process.exit(1);
}
let source;
vm.runInNewContext(fs.readFileSync(file, 'utf8'), { cc: {
  Component: class {}, Label: class {}, Node: class {}, Prefab: class {}, SpriteFrame: class {}, AudioSource: class {},
  Class: definition => { source = definition; }
} }, { timeout: 1000 });
source.maxX = 27; source.maxY = 18; source.chessList = [];
for (let y = 0; y < 18; y++) for (let x = 0; x < 27; x++) {
  if (source.isInBoard(x, y, true)) source.chessList.push({
    tagNum: y * 27 + x, tagColor: 'null', tagType: (x + y) % 2 === 0 ? 'B' : 'A',
    tagBorder: x === 0 ? 2 : x === 26 ? 5 : source.tagBorder
  });
}
const originalPoints = source.chessList.filter(p => p && p.tagColor);
assert.deepEqual(originalPoints.map(p => p.tagNum), BOARD.points.map(p => p.id));
for (const point of originalPoints) {
  const original = Array.from(source.getNeighbors(point), p => p?.tagNum).sort((a,b) => a-b);
  assert.deepEqual(original, [...BOARD.byId.get(point.tagNum).neighbors].sort((a,b) => a-b), `点 ${point.tagNum} 的邻点`);
  assert.equal(BOARD.byId.get(point.tagNum).border, point.tagBorder, `点 ${point.tagNum} 的边界标记`);
}
let seed = 193;
for (let sample = 0; sample < 100; sample++) {
  const board = Array(486).fill(0);
  for (const p of originalPoints) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = seed % 5 < 3 ? 0 : seed % 2 + 1;
    board[p.tagNum] = value; p.tagColor = ['null', 'blue', 'red'][value];
  }
  source.judgeWinner();
  const totals = score(board);
  assert.equal(source.strOver, `红${totals.red}蓝${totals.blue}，`);
}
console.log(`原始工程核对通过：${originalPoints.length} 个落点、${BOARD.edges.length} 条无向连接全部相同；100 个局面的计分一致。`);
