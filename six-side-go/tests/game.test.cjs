const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BOARD, Game, score, BLUE, RED, groupAt } = require('../src/game.js');
const game = () => new Game(30, 0);

test('棋盘有 360 点、540 边，每点三个互相连接的邻点，整盘连通', () => {
  assert.equal(BOARD.points.length, 360); assert.equal(BOARD.edges.length, 540);
  for (const p of BOARD.points) {
    assert.equal(new Set(p.neighbors).size, 3);
    for (const id of p.neighbors) assert.ok(BOARD.byId.get(id).neighbors.includes(p.id));
  }
  const visited = new Set(), pending = [BOARD.points[0].id];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id); pending.push(...BOARD.byId.get(id).neighbors);
  }
  assert.equal(visited.size, 360);
});

test('蓝方先行、交替落子、禁止覆盖和盘外落子', () => {
  const g = game();
  assert.equal(g.turn, BLUE);
  assert.equal(g.play(229, 0).ok, true); assert.equal(g.turn, RED);
  assert.equal(g.play(229, 0).ok, false);
  assert.equal(g.play(13, 0).ok, false);
  assert.equal(g.play(230, 0).ok, true); assert.equal(g.turn, BLUE);
  assert.equal(g.moveNumber, 2);
});

test('外边框沿真实边界连接闭合，六个削角不增加落点', () => {
  for (let i = 0; i < BOARD.boundary.length; i++) {
    assert.ok(BOARD.boundary[i].neighbors.includes(BOARD.boundary[(i + 1) % BOARD.boundary.length].id));
  }
  for (const [a, b] of [[12,14],[109,135],[133,161],[324,352],[350,376],[471,473]]) {
    assert.ok(BOARD.byId.get(a).neighbors.includes(b));
    assert.ok(BOARD.boundary.some(p => p.id === a));
    assert.ok(BOARD.boundary.some(p => p.id === b));
  }
  for (const id of [13,108,134,351,377,472]) assert.equal(BOARD.byId.has(id), false);
});

test('三口气围死一子，悔棋恢复被提棋子、回合和计时', () => {
  const g = game();
  for (const id of [228, 229, 230, 40, 202]) assert.equal(g.play(id, 1000).ok, true);
  assert.equal(g.board[229], 0); assert.equal(g.captured[BLUE], 1);
  assert.equal(g.undo(2000), true);
  assert.equal(g.board[229], RED); assert.equal(g.board[202], 0);
  assert.equal(g.captured[BLUE], 0); assert.equal(g.turn, BLUE);
  assert.equal(g.remaining(2000), 30);
});

test('整块提子，多个邻点属于同一块时不会重复计数', () => {
  const g = game();
  g.board[229] = RED; g.board[230] = RED;
  const boundary = new Set([229, 230].flatMap(id => BOARD.byId.get(id).neighbors).filter(id => id !== 229 && id !== 230));
  const target = [...boundary].pop();
  for (const id of boundary) if (id !== target) g.board[id] = BLUE;
  const result = g.play(target, 0);
  assert.equal(result.ok, true); assert.equal(result.captured, 2);
  assert.equal(g.board[229], 0); assert.equal(g.board[230], 0);
});

test('禁入点拒绝且不改变状态；有提子时允许落入被包围点', () => {
  const g = game();
  for (const id of BOARD.byId.get(229).neighbors) g.board[id] = RED;
  const before = JSON.stringify(g);
  assert.equal(g.play(229, 0).ok, false); assert.equal(JSON.stringify(g), before);
  for (const id of BOARD.byId.get(229).neighbors) for (const n of BOARD.byId.get(id).neighbors) if (n !== 229) g.board[n] = BLUE;
  const result = g.play(229, 0);
  assert.equal(result.ok, true); assert.equal(result.captured, 3);
});

test('单劫禁止立即回提，隔手解除，悔棋恢复劫限制', () => {
  const g = game();
  g.board[229] = RED; g.board[228] = BLUE; g.board[230] = BLUE;
  g.board[201] = RED; g.board[203] = RED;
  assert.equal(g.play(202, 0).ok, true); assert.equal(g.ko, 229);
  assert.equal(g.play(229, 0).ok, false);
  assert.equal(g.play(40, 0).ok, true); assert.equal(g.ko, null);
  g.undo(0); assert.equal(g.ko, 229); assert.equal(g.play(229, 0).ok, false);
  g.pass(0); g.play(42, 0);
  assert.equal(g.play(229, 0).ok, true); assert.equal(g.board[202], 0);
});

test('连接己方棋块的单子提取不误判为劫', () => {
  const g = game(); g.board[229] = RED;
  g.board[228] = BLUE; g.board[230] = BLUE; g.board[201] = BLUE;
  assert.equal(g.play(202, 0).captured, 1); assert.equal(g.ko, null);
});

test('停一手可悔棋；落子清除停手；连续停手待确认，双方确认后锁定', () => {
  const g = game(); g.play(229, 1000); g.pass(2000);
  assert.equal(g.turn, BLUE); assert.equal(g.passes, 1);
  g.undo(3000); assert.equal(g.turn, RED); assert.equal(g.passes, 0); assert.equal(g.remaining(3000), 29);
  g.pass(3000); g.play(230, 3000); assert.equal(g.passes, 0);
  g.pass(3000); g.pass(3000); assert.equal(g.scoring, true); assert.equal(g.result, null);
  g.confirmScore(BLUE); g.confirmScore(RED); assert.equal(g.result.reason, 'score');
  const before = JSON.stringify(g);
  assert.equal(g.play(40, 3000).ok, false); assert.equal(g.pass(3000), false);
  assert.equal(g.undo(3000), false); assert.equal(g.resign(3000), false);
  assert.equal(JSON.stringify(g), before);
});

test('空盘平局、单色围地、混合边界中立、计分总和覆盖全盘', () => {
  const g = game(); assert.deepEqual(score(g.board), { blue: 0, red: 0, neutral: 360 });
  g.board[229] = BLUE; assert.deepEqual(score(g.board), { blue: 360, red: 0, neutral: 0 });
  g.board[230] = RED; assert.deepEqual(score(g.board), { blue: 1, red: 1, neutral: 358 });
  const empty = game(); empty.pass(0); empty.pass(0);
  empty.confirmScore(BLUE); empty.confirmScore(RED); assert.equal(empty.result.winner, 0);
});

test('围住单独空点时只计给边界一方', () => {
  const g = game();
  for (const id of BOARD.byId.get(229).neighbors) g.board[id] = BLUE;
  g.board[40] = RED;
  assert.deepEqual(score(g.board), { blue: 4, red: 1, neutral: 355 });
});

test('三种计时按截止时间执行，后台延迟和刚到截止的操作也判负', () => {
  for (const seconds of [15, 60, 300]) {
    const g = new Game(seconds, 1000);
    assert.equal(g.remaining(1000), seconds);
    assert.equal(g.tick(seconds * 1000 + 999), null);
    assert.equal(g.play(229, seconds * 1000 + 1000).ok, false);
    assert.deepEqual(g.result, { winner: RED, reason: 'timeout', totals: null });
  }
  const g = game(); g.tick(999999); assert.equal(g.result.reason, 'timeout');
});

test('认输结束、每次换手重设计时、非法落子不重设计时', () => {
  const g = game(); g.play(229, 10000); assert.equal(g.remaining(10000), 30);
  g.play(229, 15000); assert.equal(g.remaining(15000), 25);
  g.resign(15000); assert.equal(g.result.winner, BLUE); assert.equal(g.result.reason, 'resign');
});

test('自定义分钟数对应的计时支持小数分钟、换手重置及悔棋恢复', () => {
  for (const seconds of [6, 90, 180, 10800]) {
    const g = new Game(seconds, 0);
    assert.equal(g.remaining(0), seconds);
    assert.equal(g.play(229, 2000).ok, true);
    assert.equal(g.remaining(2000), seconds);
    assert.equal(g.undo(3000), true);
    assert.equal(g.remaining(3000), seconds - 2);
    assert.equal(g.tick(3000 + (seconds - 2) * 1000).reason, 'timeout');
  }
});

test('计时拒绝空值、非有限数、非整数秒和超出范围的值', () => {
  for (const seconds of [0, -1, NaN, Infinity, '180', null, 0.5, 10801]) {
    assert.throws(() => new Game(seconds, 0), RangeError);
  }
});

test('默认常规为 60 秒，进度按毫秒匀速衰减，换手和悔棋立即同步', () => {
  assert.equal(new Game().seconds, 60);
  for (const seconds of [15, 60, 300]) {
    const g = new Game(seconds, 1000);
    const ratio = time => g.remainingRatio(time);
    assert.equal(ratio(1000), 1);
    assert.equal(g.remaining(1100), g.remaining(1200));
    assert.ok(ratio(1100) > ratio(1200));
    assert.ok(Math.abs((ratio(1100) - ratio(1200)) - (ratio(1200) - ratio(1300))) < 1e-12);
    assert.equal(ratio(1000 + seconds * 500), 0.5);
    g.play(229, 2000);
    assert.equal(ratio(2000), 1);
    g.undo(2500);
    assert.equal(ratio(2500), (seconds - 1) / seconds);
    g.resign(2500);
    assert.equal(ratio(2500), 0);
  }
});

test('暂停冻结毫秒和进度，长时间后台停留后继续不补满时间', () => {
  const g = new Game(60, 1000);
  assert.equal(g.pause(12345), true);
  assert.equal(g.paused, true);
  assert.equal(g.remainingMilliseconds(999999), 48655);
  assert.equal(g.remainingRatio(999999), 48655 / 60000);
  assert.equal(g.tick(999999), null);
  assert.equal(g.pause(999999), false);
  assert.equal(g.resume(1000000), true);
  assert.equal(g.paused, false);
  assert.equal(g.remainingMilliseconds(1000000), 48655);
  assert.equal(g.resume(1000100), false);
  assert.equal(g.remainingMilliseconds(1000100), 48555);
  assert.equal(g.tick(1048654), null);
  assert.equal(g.tick(1048655).reason, 'timeout');
});

test('暂停时所有对局操作无效，继续后落子和悔棋正常', () => {
  const g = game();
  g.play(229, 1000); g.pause(2000);
  const before = JSON.stringify(g);
  assert.equal(g.play(230, 999999).ok, false);
  assert.equal(g.pass(999999), false);
  assert.equal(g.undo(999999), false);
  assert.equal(g.resign(999999), false);
  assert.equal(JSON.stringify(g), before);
  g.resume(1000000);
  assert.equal(g.play(230, 1000500).ok, true);
  assert.equal(g.remaining(1000500), 30);
  assert.equal(g.undo(1000600), true);
  assert.equal(g.remainingMilliseconds(1000600), 28500);
  assert.equal(g.turn, RED);
});

test('截止时不能用暂停绕过超时，终局后不能暂停或继续，新局未暂停', () => {
  const g = game();
  assert.equal(g.pause(30000), false);
  assert.equal(g.result.reason, 'timeout');
  assert.equal(g.paused, false);
  assert.equal(g.resume(31000), false);
  const next = game();
  assert.equal(next.paused, false);
  next.resign(0);
  assert.equal(next.pause(0), false);
  assert.equal(next.resume(0), false);
});
