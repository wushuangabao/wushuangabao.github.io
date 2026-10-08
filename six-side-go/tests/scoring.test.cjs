const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BOARD, Game, score, analyzeDead, BLUE, RED } = require('../src/game.js');

function deadFixture() {
  const board = Array(486).fill(0);
  BOARD.points.forEach((p, i) => { board[p.id] = i < 181 ? BLUE : RED; });
  for (const id of [40, 90, 390, 420, 97]) board[id] = 0;
  board[70] = RED;
  return board;
}
function playFixture(board) {
  const g = new Game(60, 0);
  const sides = [BLUE, RED].map(color => BOARD.points.filter(p => board[p.id] === color).map(p => p.id));
  for (let i = 0; i < Math.max(...sides.map(ids => ids.length)); i++) {
    for (const ids of sides) assert.ok(i < ids.length ? g.play(ids[i], 0).ok : g.pass(0));
  }
  assert.deepEqual(g.board, board);
  return g;
}
function tripleKo() {
  const g = new Game(60, 0);
  const blue = [228, 230, 70, 96, 98, 390, 392], red = [229, 201, 203, 69, 71, 391, 363, 365];
  for (let i = 0; i < red.length; i++) {
    assert.ok(i < blue.length ? g.play(blue[i], 0).ok : g.pass(0));
    assert.ok(g.play(red[i], 0).ok);
  }
  return g;
}

// 用户截图：第 38 手，蓝 15 子、红 19 子，未清死子时 15 / 20 / 325 分。
// 红方有空眼 256，以及含蓝子 284 和空点 311 的另一眼。
function occupiedEyeFixture() {
  const board = Array(486).fill(0);
  for (const id of [368, 367, 340, 342, 341, 343, 316, 314, 315, 284, 288, 287, 260, 232, 233]) board[id] = BLUE;
  for (const id of [338, 337, 339, 310, 312, 309, 313, 282, 286, 281, 285, 283, 258, 254, 255, 257, 259, 230, 229]) board[id] = RED;
  return board;
}

test('截图中的两眼红棋识别为活棋，眼内蓝子被预标，外部蓝子保留', () => {
  const board = occupiedEyeFixture(), before = board.slice();
  assert.deepEqual(score(board), { blue: 15, red: 20, neutral: 325 });
  const analysis = analyzeDead(board);
  assert.deepEqual([...analysis.dead], [284]);
  assert.equal(analysis.alive[RED].size, 19);
  assert.equal(analysis.alive[BLUE].size, 0);
  assert.deepEqual(board, before);

  // 用实际落子规则核对：蓝方唯一延长点为自杀，红方填入即可提走该蓝子，且不是劫。
  const attack = new Game(60, 0); attack.board = board.slice();
  assert.equal(attack.play(311, 0).ok, false);
  attack.turn = RED;
  assert.deepEqual(attack.play(311, 0), { ok: true, captured: 1 });
  assert.equal(attack.ko, null);

  // 合法落子生成同一棋盘，覆盖形势判断、终局复盘和最终确认三个入口。
  const g = playFixture(board);
  assert.equal(g.beginAssessment(0), true);
  assert.deepEqual([...g.deadStones], [284]);
  assert.deepEqual(g.previewScore(), { blue: 14, red: 22, neutral: 324 });
  assert.equal(g.toggleDead(284, 0).ok, true);
  assert.deepEqual(g.previewScore(), score(board));
  assert.equal(g.endAssessment(0), true);
  assert.equal(g.resign(0), true);
  assert.deepEqual([...g.deadStones], [284]);
  const finished = playFixture(board);
  finished.pass(0); finished.pass(0);
  assert.deepEqual([...finished.deadStones], [284]);
  finished.confirmScore(BLUE); finished.confirmScore(RED);
  assert.equal(finished.board[284], 0);
  assert.deepEqual(finished.result.totals, { blue: 14, red: 22, neutral: 324 });
});

test('含敌子的眼区识别与颜色、旋转和镜像无关', () => {
  const board = occupiedEyeFixture();
  const transforms = [p => p.id, p => 485 - p.id, p => p.row * 27 + 26 - p.col,
    p => (17 - p.row) * 27 + p.col];
  for (const transform of transforms) for (const swap of [false, true]) {
    const changed = Array(486).fill(0);
    for (const p of BOARD.points) changed[transform(p)] = swap && board[p.id] ? 3 - board[p.id] : board[p.id];
    const analysis = analyzeDead(changed);
    assert.deepEqual([...analysis.dead], [transform(BOARD.byId.get(284))]);
    assert.equal(analysis.alive[swap ? BLUE : RED].size, 19);
  }
});

test('同一眼内多枚敌子仍能预标，但敌子不能把一个眼分割成两眼', () => {
  const multi = occupiedEyeFixture(); multi[310] = BLUE;
  // 改成蓝子的 310 原本连接两段红棋，须补上外侧连接，保持围墙是一块活棋。
  for (const id of [308, 335, 336]) multi[id] = RED;
  assert.deepEqual([...analyzeDead(multi).dead].sort((a, b) => a - b), [284, 310]);
  for (const [id, color] of [[256, RED], [283, 0], [283, BLUE], [310, BLUE]]) {
    const board = occupiedEyeFixture(); board[id] = color;
    const analysis = analyzeDead(board);
    assert.equal(analysis.alive[RED].size, 0, `改变 ${id} 后眼区合并或围墙不再是一块两眼活棋`);
    assert.equal(analysis.dead.size, 0, '没有活棋证明时不能仅凭包围关系标死');
  }
});

test('自动预标被活棋围住且无法逃生的死子，不修改原棋盘', () => {
  const board = deadFixture(), before = board.slice();
  const analysis = analyzeDead(board);
  assert.deepEqual([...analysis.dead], [70]);
  assert.equal(analysis.alive[BLUE].size, 177);
  assert.equal(analysis.alive[RED].size, 177);
  assert.deepEqual(board, before);
  assert.ok(analysis.examinedNodes > 0 && analysis.examinedNodes <= 12000);
});

test('开放的被叫吃棋子不判死，局部两眼活棋不误标', () => {
  const board = Array(486).fill(0);
  board[229] = RED; board[228] = BLUE; board[230] = BLUE;
  assert.equal(analyzeDead(board).dead.size, 0);
  const alive = deadFixture(); alive[70] = 0;
  const analysis = analyzeDead(alive);
  assert.equal(analysis.dead.size, 0);
  assert.ok(analysis.alive[BLUE].size && analysis.alive[RED].size);
});

test('双方各一眼共享一气的双活不预标；单劫棋形不预标', () => {
  const seki = Array(486).fill(0);
  BOARD.points.forEach((p, i) => { seki[p.id] = i < 181 ? BLUE : RED; });
  for (const id of [40, 390, 243]) seki[id] = 0;
  for (const color of [BLUE, RED]) {
    const g = new Game(60, 0); g.board = seki.slice(); g.turn = color;
    assert.equal(g.play(243, 0).ok, true);
    assert.ok(g.play(color === BLUE ? 40 : 390, 0).captured > 100);
  }
  assert.equal(analyzeDead(seki).dead.size, 0);
  assert.equal(analyzeDead(tripleKo().board).dead.size, 0);
});

test('自动预判达到区域或搜索上限时保留人工判断', () => {
  assert.equal(analyzeDead(deadFixture(), { maxRegionSize: 1 }).dead.size, 0);
  const limited = analyzeDead(deadFixture(), { maxNodes: 0 });
  assert.equal(limited.dead.size, 0); assert.equal(limited.examinedNodes, 0);
});

test('局部攻防搜索覆盖延长和另起一子的防守，边界与双方颜色对称', () => {
  const board = deadFixture(); board[98] = 0;
  // 红方可以延长到 97，也可以先占 98，但两种防守最终都会被提。
  for (const move of [97, 98]) {
    const g = new Game(60, 0); g.board = board.slice(); g.turn = RED;
    assert.equal(g.play(move, 0).ok, true);
    assert.equal(g.play(move === 97 ? 98 : 97, 0).captured, 2);
  }
  assert.deepEqual([...analyzeDead(board).dead], [70]);
  const rotated = Array(486).fill(0);
  for (const p of BOARD.points) rotated[485 - p.id] = board[p.id] ? 3 - board[p.id] : 0;
  assert.deepEqual([...analyzeDead(rotated).dead], [415]);
  const edge = Array(486).fill(0);
  for (const p of BOARD.points) edge[p.id] = BLUE;
  for (const id of [40, 90, 14]) edge[id] = 0;
  edge[12] = RED;
  assert.deepEqual([...analyzeDead(edge).dead], [12]);
});

test('从合法对局进入确认阶段，自动预标修正原先反转的胜负', () => {
  const g = playFixture(deadFixture());
  assert.deepEqual(score(g.board), { blue: 179, red: 180, neutral: 1 });
  g.pass(1000); g.pass(2000);
  assert.equal(g.scoring, true); assert.equal(g.result, null);
  assert.deepEqual([...g.deadStones], [70]); assert.equal(g.autoDeadCount, 1);
  assert.deepEqual(g.previewScore(), { blue: 181, red: 179, neutral: 0 });
  assert.equal(g.board[70], RED);
  assert.equal(g.confirmScore(RED), true); assert.equal(g.result, null);
  assert.equal(g.confirmScore(RED), false); assert.equal(g.result, null);
  assert.equal(g.confirmScore(BLUE), true);
  assert.deepEqual(g.result, { winner: BLUE, reason: 'score', totals: { blue: 181, red: 179, neutral: 0 } });
  assert.equal(g.board[70], 0); assert.equal(g.captured[BLUE], 1);
  assert.equal(g.scoring, false); assert.equal(g.deadStones.size, 0);
  assert.equal(g.toggleDead(228).ok, false); assert.equal(g.confirmScore(BLUE), false);
  assert.equal(g.resumePlay(RED, 999999), false); assert.equal(g.undo(999999), false);
});

test('死子按整块切换，修改后废除已有确认，预览不改变实际棋子', () => {
  const g = new Game(60, 0);
  [229, 40, 230].forEach(id => assert.ok(g.play(id, 0).ok));
  g.pass(0); g.pass(0);
  const before = g.board.slice(), captures = { ...g.captured };
  g.confirmScore(BLUE);
  assert.deepEqual(g.toggleDead(229), { ok: true, marked: true, count: 2 });
  assert.deepEqual([...g.deadStones].sort(), [229, 230]);
  assert.equal(g.scoreConfirmed[BLUE], false);
  g.confirmScore(RED);
  assert.deepEqual(g.toggleDead(230), { ok: true, marked: false, count: 2 });
  assert.equal(g.scoreConfirmed[RED], false);
  assert.equal(g.deadStones.size, 0);
  assert.deepEqual(g.board, before); assert.deepEqual(g.captured, captures);
  g.confirmScore(BLUE);
  assert.equal(g.toggleDead(13).ok, false); assert.equal(g.toggleDead(41).ok, false);
  assert.equal(g.scoreConfirmed[BLUE], true);
  assert.equal(g.confirmScore(0), false); assert.equal(g.confirmScore('2'), false);
});

test('确认阶段不超时且拒绝对局操作，选择续弈方后恢复棋盘和每手计时', () => {
  for (const color of [BLUE, RED]) {
    const g = playFixture(deadFixture());
    g.pass(1000); g.pass(2000); g.confirmScore(BLUE);
    const board = g.board.slice(), captures = { ...g.captured };
    assert.equal(g.tick(999999), null); assert.equal(g.remainingRatio(999999), 0);
    assert.equal(g.play(40, 999999).ok, false); assert.equal(g.pass(999999), false);
    assert.equal(g.undo(999999), false); assert.equal(g.resign(999999), false);
    assert.equal(g.pause(999999), false); assert.equal(g.resume(999999), false);
    assert.equal(g.resumePlay(0, 999999), false);
    assert.equal(g.resumePlay(color, 1000000), true);
    assert.equal(g.turn, color); assert.equal(g.scoring, false); assert.equal(g.passes, 0);
    assert.equal(g.deadStones.size, 0); assert.equal(g.autoDeadCount, 0);
    assert.deepEqual(g.scoreConfirmed, { [BLUE]: false, [RED]: false });
    assert.deepEqual(g.board, board); assert.deepEqual(g.captured, captures);
    assert.equal(g.remaining(1000000), 60);
    assert.equal(g.tick(1059999), null); assert.equal(g.tick(1060000).reason, 'timeout');
  }
});

test('取消程序预标后可人工确认，续弈再次停手会重新预判', () => {
  const g = playFixture(deadFixture()); g.pass(0); g.pass(0);
  assert.equal(g.toggleDead(70).marked, false);
  assert.deepEqual(g.previewScore(), { blue: 179, red: 180, neutral: 1 });
  g.confirmScore(BLUE); g.resumePlay(RED, 1000); g.pass(1000); g.pass(1000);
  assert.deepEqual([...g.deadStones], [70]);
  assert.deepEqual(g.scoreConfirmed, { [BLUE]: false, [RED]: false });
});

test('三劫循环六手后判和棋并锁定，普通单劫仍禁止立即回提', () => {
  const g = tripleKo(), initial = g.board.slice(), turn = g.turn;
  const moves = [202, 97, 364, 229, 70, 391];
  assert.equal(g.play(moves[0], 0).ok, true);
  assert.equal(g.play(229, 0).ok, false); assert.equal(g.result, null);
  for (const id of moves.slice(1, -1)) { assert.ok(g.play(id, 0).ok); assert.equal(g.result, null); }
  assert.ok(g.play(moves.at(-1), 0).ok);
  assert.deepEqual(g.board, initial); assert.equal(g.turn, turn);
  assert.deepEqual(g.result, { winner: 0, reason: 'repetition', totals: null });
  assert.equal(g.play(202, 0).ok, false); assert.equal(g.pass(0), false);
  assert.equal(g.undo(0), false); assert.equal(g.pause(0), false);
});

test('普通停手不判循环和棋；悔棋后重下不会把已撤销的未来当成重复', () => {
  const g = new Game(60, 0);
  g.play(229, 0); g.play(40, 0); g.undo(0); g.play(40, 0);
  assert.equal(g.result, null);
  g.pass(0); assert.equal(g.result, null); g.pass(0);
  assert.equal(g.result, null); assert.equal(g.scoring, true);
  g.confirmScore(BLUE); g.confirmScore(RED);
  assert.equal(g.result.reason, 'score');
});

test('续弈保留之前局面记录，三劫循环仍会判和棋', () => {
  const g = tripleKo();
  g.play(202, 0); g.play(97, 0); g.pass(0); g.pass(0);
  g.resumePlay(BLUE, 0);
  for (const id of [364, 229, 70, 391]) assert.ok(g.play(id, 0).ok);
  assert.equal(g.result.reason, 'repetition');
});

test('形势判断复用预标和人工标记，退出不改变棋盘、历史、提子及行棋状态', () => {
  const g = playFixture(deadFixture());
  const before = g.snapshot(1234), history = structuredClone(g.history);
  assert.equal(g.beginAssessment(1234), true);
  assert.equal(g.assessing, true);
  assert.equal(g.scoring, false);
  assert.equal(g.paused, false);
  assert.deepEqual([...g.deadStones], [70]);
  assert.deepEqual(g.previewScore(), score(g.scoringBoard()));
  const predicted = g.previewScore();
  assert.equal(g.toggleDead(70, 2000).ok, true);
  assert.notDeepEqual(g.previewScore(), predicted);
  assert.equal(g.toggleDead(97, 2000).ok, false);
  assert.equal(g.toggleDead(70, 2000).ok, true);
  assert.equal(g.tick(5000), null);
  assert.equal(g.remainingMilliseconds(5000), before.remainingMs - (5000 - 1234));
  assert.equal(g.beginAssessment(5000), false);
  assert.equal(g.play(97, 5000).ok, false);
  for (const action of ['pass', 'undo', 'resign', 'pause', 'resume']) assert.equal(g[action](5000), false);
  assert.equal(g.confirmScore(BLUE), false);
  assert.equal(g.resumePlay(RED, 5000), false);
  assert.equal(g.endAssessment(5000), true);
  assert.deepEqual(g.snapshot(5000), { ...before, remainingMs: before.remainingMs - (5000 - 1234) });
  assert.deepEqual(g.history, history);
  assert.equal(g.deadStones.size, 0);
  assert.equal(g.autoDeadCount, 0);
  assert.equal(g.result, null);
  assert.equal(g.remainingMilliseconds(5001), before.remainingMs - (5001 - 1234));
  assert.equal(g.beginAssessment(5002), true);
  assert.deepEqual([...g.deadStones], [70]);
});

test('手动暂停中进入形势判断，退出后保持暂停；正常对局可继续落子', () => {
  const g = new Game(60, 0);
  assert.equal(g.pause(1001), true);
  assert.equal(g.beginAssessment(500000), true);
  assert.equal(g.endAssessment(800000), true);
  assert.equal(g.paused, true);
  assert.equal(g.remainingMilliseconds(900000), 58999);
  assert.equal(g.resume(900000), true);
  assert.equal(g.play(229, 900001).ok, true);
  assert.equal(g.turn, RED);
  assert.equal(g.beginAssessment(900002), true);
  assert.equal(g.endAssessment(910000), true);
  assert.equal(g.play(230, 910001).ok, true);
  assert.equal(g.undo(910002), true);
  assert.equal(g.board[230], 0);
});

test('形势判断不绕过超时，不进入终局确认，不遗留人工死子标记', () => {
  const expired = new Game(1, 0);
  assert.equal(expired.beginAssessment(1000), false);
  assert.equal(expired.result.reason, 'timeout');
  assert.equal(expired.endAssessment(1001), false);
  const g = new Game(60, 0);
  g.play(229, 1); g.play(230, 2); g.pass(3);
  assert.equal(g.beginAssessment(4), true);
  assert.equal(g.toggleDead(229, 5).ok, true);
  assert.equal(g.endAssessment(5000), true);
  assert.equal(g.passes, 1);
  assert.equal(g.pass(5001), true);
  assert.equal(g.scoring, true);
  assert.equal(g.deadStones.size, 0);
  assert.equal(g.beginAssessment(5002), false);
  assert.equal(g.endAssessment(5002), false);
  assert.equal(g.confirmScore(BLUE), true);
  assert.equal(g.confirmScore(RED), true);
  assert.ok(g.result);
});

test('形势判断不破坏劫点、循环判重与对局分支', () => {
  const g = tripleKo();
  for (const id of [202, 97, 364, 229, 70]) assert.equal(g.play(id, 0).ok, true);
  const before = g.snapshot(0);
  assert.equal(g.beginAssessment(0), true);
  assert.equal(g.endAssessment(1000), true);
  assert.deepEqual(g.snapshot(1000), { ...before, remainingMs: before.remainingMs - 1000 });
  assert.equal(g.play(391, 1001).ok, true);
  assert.equal(g.result.reason, 'repetition');
});


test('判断期间继续扣时，超时自动退出判断且不能借标记或关闭绕过判负', () => {
  for (const action of ['tick', 'toggleDead', 'endAssessment']) {
    const g = new Game(1, 0);
    g.play(229, 0);
    const board = g.board.slice();
    assert.equal(g.beginAssessment(200), true);
    assert.equal(g.remainingMilliseconds(600), 400);
    assert.equal(g.toggleDead(229, 600).ok, true);
    if (action === 'toggleDead') assert.equal(g.toggleDead(229, 1000).ok, false);
    else g[action](1000);
    assert.equal(g.result.reason, 'timeout');
    assert.equal(g.result.winner, BLUE);
    assert.equal(g.assessing, false);
    assert.equal(g.deadStones.size, 0);
    assert.deepEqual(g.board, board);
  }
});

test('认输和超时自动预标死子，保留棋盘并允许反复复盘且不改变胜负', () => {
  for (const reason of ['resign', 'timeout']) {
    const g = playFixture(deadFixture());
    const board = g.board.slice(), captured = { ...g.captured }, history = structuredClone(g.history);
    if (reason === 'resign') assert.equal(g.resign(100), true);
    else g.tick(60000);
    const result = structuredClone(g.result);
    assert.equal(g.result.reason, reason);
    assert.equal(g.postgameReview, true);
    assert.equal(g.reviewing, true);
    assert.deepEqual([...g.deadStones], [70]);
    const scoreWithDead = g.previewScore();
    assert.equal(g.toggleDead(70, 999999).ok, true);
    assert.notDeepEqual(g.previewScore(), scoreWithDead);
    assert.equal(g.toggleDead(70, 999999).ok, true);
    assert.deepEqual(g.previewScore(), scoreWithDead);
    assert.deepEqual(g.result, result);
    assert.deepEqual(g.board, board);
    assert.deepEqual(g.captured, captured);
    assert.deepEqual(g.history, history);
    assert.equal(g.confirmScore(BLUE), false);
    assert.equal(g.resumePlay(BLUE, 999999), false);
    assert.equal(g.play(97, 999999).ok, false);
    for (const action of ['pass', 'undo', 'resign', 'pause', 'resume', 'endAssessment']) assert.equal(g[action](999999), false);
    const fresh = new Game(60, 1000000);
    assert.equal(fresh.reviewing, false);
    assert.equal(fresh.deadStones.size, 0);
  }
});

test('形势判断期间超时切换终局复盘，重新预标并保留人工复盘能力', () => {
  const g = playFixture(deadFixture());
  assert.equal(g.beginAssessment(100), true);
  assert.equal(g.toggleDead(70, 200).ok, true);
  assert.equal(g.deadStones.size, 0);
  g.tick(60000);
  assert.equal(g.assessing, false);
  assert.equal(g.postgameReview, true);
  assert.deepEqual([...g.deadStones], [70]);
  assert.equal(g.toggleDead(70, 70000).ok, true);
  assert.equal(g.board[70], RED);
});
