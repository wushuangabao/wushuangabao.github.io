const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BOARD, Game, BLUE, RED, score, analyzeDead, estimatePosition, reviewPosition } = require('../src/game.js');

function screenshotBoard() {
  const board = Array(486).fill(0);
  for (const id of [368, 367, 340, 342, 341, 343, 316, 314, 315, 284, 288, 287, 260, 232, 233]) board[id] = BLUE;
  for (const id of [338, 337, 339, 310, 312, 309, 313, 282, 286, 281, 285, 283, 258, 254, 255, 257, 259, 230, 229]) board[id] = RED;
  return board;
}

test('空盘无归属；开局一子只有附近潜力，不能把整盘算成围空', () => {
  const board = Array(486).fill(0), empty = estimatePosition(board);
  assert.equal(empty.open, 360);
  assert.equal(empty.sides[BLUE].total + empty.sides[RED].total, 0);
  board[229] = BLUE;
  const estimate = estimatePosition(board);
  assert.equal(estimate.sides[BLUE].territory, 0);
  assert.equal(estimate.sides[BLUE].stones, 1);
  assert.ok(estimate.sides[BLUE].potential > 0 && estimate.sides[BLUE].potential < 40);
  assert.equal(estimate.ownership.get(228).owner, BLUE, '邻近空点有蓝方倾向');
  assert.equal(estimate.ownership.get(12).kind, 'open', '远端不强行分配');
  assert.equal(estimate.sides[RED].total, 0);
});

test('截图局面区分死子、已判活、围空与开放区域，并覆盖全部 360 个交点', () => {
  const board = screenshotBoard(), before = board.slice(), dead = analyzeDead(board).dead;
  const estimate = estimatePosition(board, dead), blue = estimate.sides[BLUE], red = estimate.sides[RED];
  assert.deepEqual(board, before);
  assert.deepEqual([...dead], [284]);
  assert.equal(blue.dead, 1); assert.equal(blue.stones, 14); assert.equal(blue.alive, 0);
  assert.equal(red.dead, 0); assert.equal(red.stones, 19); assert.equal(red.alive, 19);
  assert.equal(red.territory, 3);
  for (const id of [256, 284, 311]) {
    assert.equal(estimate.ownership.get(id).kind, 'territory');
    assert.equal(estimate.ownership.get(id).owner, RED);
  }
  assert.ok(blue.potential > 0 && red.potential > 0 && estimate.contested > 0 && estimate.open > 0);
  assert.equal(estimate.ownership.size, 360);
  assert.equal(blue.total + red.total + estimate.neutral, 360);
  for (const [id, area] of estimate.ownership) {
    assert.ok(BOARD.byId.has(id));
    assert.ok(Number.isFinite(area.confidence) && area.confidence >= 0 && area.confidence <= 1);
  }
});

test('换色、旋转和镜像保持归属和总分对称，不受遍历顺序影响', () => {
  const board = screenshotBoard(), dead = new Set([284]), baseline = estimatePosition(board, dead);
  const transforms = [p => p.id, p => 485 - p.id, p => p.row * 27 + 26 - p.col, p => (17 - p.row) * 27 + p.col];
  for (const transform of transforms) for (const swap of [false, true]) {
    const changed = Array(486).fill(0), color = c => c && swap ? 3 - c : c;
    for (const p of BOARD.points) changed[transform(p)] = color(board[p.id]);
    const estimate = estimatePosition(changed, new Set([...dead].map(id => transform(BOARD.byId.get(id)))));
    for (const c of [BLUE, RED]) assert.deepEqual(estimate.sides[color(c)], baseline.sides[c]);
    assert.equal(estimate.contested, baseline.contested); assert.equal(estimate.open, baseline.open);
    for (const p of BOARD.points) {
      const original = baseline.ownership.get(p.id), transformed = estimate.ownership.get(transform(p));
      assert.equal(transformed.kind, original.kind); assert.equal(transformed.owner, color(original.owner));
      assert.ok(Math.abs(transformed.confidence - original.confidence) < 0.000001);
    }
  }
});

test('势力不能穿过连接棋盘两边的敌方棋墙', () => {
  const board = Array(486).fill(0);
  for (const p of BOARD.points) {
    if (p.col >= 12 && p.col <= 14) board[p.id] = RED;
    else if (p.col === 11) board[p.id] = BLUE;
  }
  const estimate = estimatePosition(board);
  const east = BOARD.points.filter(p => p.col > 14);
  assert.ok(east.some(p => estimate.ownership.get(p.id).owner === RED));
  assert.ok(east.every(p => estimate.ownership.get(p.id).owner !== BLUE));
});

test('双活共享的公气保留为争夺点，两边的眼分别计算围空', () => {
  const board = Array(486).fill(0);
  BOARD.points.forEach((p, i) => { board[p.id] = i < 181 ? BLUE : RED; });
  for (const id of [40, 390, 243]) board[id] = 0;
  const estimate = estimatePosition(board, analyzeDead(board).dead);
  assert.equal(estimate.ownership.get(243).kind, 'contested');
  assert.equal(estimate.ownership.get(243).owner, 0);
  assert.equal(estimate.sides[BLUE].territory, 1); assert.equal(estimate.sides[RED].territory, 1);
  assert.equal(estimate.sides[BLUE].dead + estimate.sides[RED].dead, 0);
});

test('边角紧凑围空被识别，大范围尚可侵入的空地只作潜力估算', () => {
  const corner = Array(486).fill(0);
  for (const id of BOARD.byId.get(12).neighbors) corner[id] = BLUE;
  assert.equal(estimatePosition(corner).ownership.get(12).kind, 'territory');
  const large = Array(486).fill(0);
  for (const p of BOARD.boundary) large[p.id] = BLUE;
  const estimate = estimatePosition(large);
  assert.equal(estimate.sides[BLUE].territory, 0);
  assert.ok(estimate.sides[BLUE].potential > 0);
  assert.ok(estimate.open > 0, '大空区的中心仍留待后续争夺');
});

test('手动死子标记立即改变估算，取消后恢复；退出保持棋盘和原计时', () => {
  const g = new Game(60, 0); g.board = screenshotBoard();
  const before = g.board.slice();
  assert.equal(g.beginAssessment(1000), true);
  const initial = g.estimatePosition();
  assert.equal(g.toggleDead(284, 2000).ok, true);
  const unmarked = g.estimatePosition();
  assert.equal(unmarked.sides[BLUE].dead, 0);
  assert.equal(unmarked.sides[BLUE].stones, 15);
  assert.equal(unmarked.sides[RED].territory, 1);
  g.toggleDead(284, 3000);
  assert.deepEqual(g.estimatePosition(), initial);
  assert.equal(g.endAssessment(4000), true);
  assert.equal(g.remainingMilliseconds(4000), 56000);
  assert.equal(g.deadStones.size, 0); assert.deepEqual(g.board, before);
  assert.equal(g.history.length, 0); assert.equal(g.turn, BLUE);
});

test('潜力归属不会写入终局计分，原面积计分和确认流程保持一致', () => {
  const g = new Game(60, 0); g.board = screenshotBoard();
  g.beginAssessment(0);
  assert.notEqual(g.estimatePosition().sides[BLUE].total, g.previewScore().blue);
  const confirmedScore = g.previewScore();
  g.endAssessment(0); g.pass(0); g.pass(0);
  assert.equal(g.confirmScore(BLUE), true); assert.equal(g.confirmScore(RED), true);
  assert.deepEqual(g.result.totals, confirmedScore);
  assert.deepEqual(g.result.totals, score(g.board));
  assert.deepEqual(g.result.totals, { blue: 14, red: 22, neutral: 324 });
});

test('终局明细和围空标记与正式计分一致，潜力保留但不加分', () => {
  const board = screenshotBoard(), dead = analyzeDead(board).dead, before = board.slice();
  const review = reviewPosition(board, dead), cleaned = board.slice();
  for (const id of dead) cleaned[id] = 0;
  assert.deepEqual(review.totals, { blue: 14, red: 22, neutral: 324 });
  assert.deepEqual(review.totals, score(cleaned));
  assert.ok(review.sides[BLUE].potential > 0 && review.sides[RED].potential > 0);
  for (const [color, key] of [[BLUE, 'blue'], [RED, 'red']]) {
    const side = review.sides[color];
    assert.equal(side.total, side.stones + side.territory);
    assert.equal(side.total, review.totals[key]);
    assert.equal(side.territory, [...review.ownership.values()].filter(a => a.kind === 'territory' && a.owner === color).length);
    assert.equal(side.potential, [...review.ownership.values()].filter(a => a.kind === 'potential' && a.owner === color).length);
  }
  assert.equal(review.neutral, review.open + review.contested + review.sides[BLUE].potential + review.sides[RED].potential);
  assert.equal(review.sides[BLUE].total + review.sides[RED].total + review.neutral, 360);
  assert.equal(review.ownership.get(284).kind, 'territory', '标死棋子的落点也按移除后的归属显示');
  assert.equal(review.ownership.get(284).owner, RED);
  assert.deepEqual(board, before); assert.deepEqual([...dead], [284]);
});

test('终局大围空按完整连通区域计分，不沿用中盘的小区域限制', () => {
  const board = Array(486).fill(0);
  for (const p of BOARD.boundary) board[p.id] = BLUE;
  assert.equal(estimatePosition(board).sides[BLUE].territory, 0);
  const review = reviewPosition(board);
  assert.deepEqual(review.totals, { blue: 360, red: 0, neutral: 0 });
  assert.equal(review.sides[BLUE].territory, 360 - BOARD.boundary.length);
  assert.equal(review.sides[BLUE].potential, 0);
  for (const p of BOARD.points) if (!board[p.id]) assert.deepEqual(review.ownership.get(p.id), { owner: BLUE, kind: 'territory', confidence: 1 });
});

test('空盘、双方开放棋形的终局计分不把势力潜力当作领地', () => {
  const board = Array(486).fill(0);
  assert.deepEqual(reviewPosition(board).totals, { blue: 0, red: 0, neutral: 360 });
  board[229] = BLUE; board[40] = RED;
  const review = reviewPosition(board);
  assert.deepEqual(review.totals, { blue: 1, red: 1, neutral: 358 });
  assert.ok(review.sides[BLUE].potential > 0 && review.sides[RED].potential > 0);
  assert.equal(review.sides[BLUE].territory + review.sides[RED].territory, 0);
});

test('终局复盘修改标记后重算确切分数，取消后恢复且不覆盖结算结果', () => {
  const g = new Game(60, 0); g.board = screenshotBoard();
  g.pass(0); g.pass(0); g.confirmScore(BLUE); g.confirmScore(RED);
  const result = structuredClone(g.result), board = g.board.slice(), captures = { ...g.captured };
  const initial = g.reviewPosition();
  assert.deepEqual(initial.totals, result.totals);
  assert.equal(g.toggleDead(368, 999999).ok, true);
  const changed = g.reviewPosition();
  assert.notDeepEqual(changed.totals, initial.totals);
  assert.deepEqual(changed.totals, g.previewScore());
  assert.equal(changed.sides[BLUE].total, changed.sides[BLUE].stones + changed.sides[BLUE].territory);
  g.toggleDead(368, 999999);
  assert.deepEqual(g.reviewPosition(), initial);
  assert.deepEqual(g.result, result); assert.deepEqual(g.board, board); assert.deepEqual(g.captured, captures);
});
