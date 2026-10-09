const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BOARD, Game, BLUE, RED, simulateMove, analyzeDead, estimatePosition } = require('../src/game.js');
const { chooseMove, canUndo, undoRound, Opponent } = require('../src/ai.js');
const choose = g => chooseMove(g, () => 0.5);

test('默认调度兼容浏览器计时器的接收者要求', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const scope = { SixSideGo: require('../src/game.js') };
  vm.createContext(scope);
  vm.runInContext(`
    function setTimeout(fn) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return 1;
    }
    function clearTimeout(id) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
    }
  `, scope);
  vm.runInContext(fs.readFileSync(require.resolve('../src/ai.js'), 'utf8'), scope);
  vm.runInContext(`const ai = new SixSideGoAI.Opponent(); ai.sync(new SixSideGo.Game(), SixSideGo.BLUE); ai.cancel();`, scope);
});

test('AI 选择合法空点，试算不改变棋盘、历史、计时和标记', () => {
  const g = new Game(60, 0);
  g.play(229, 0);
  const before = JSON.stringify(g);
  const id = choose(g);
  assert.equal(JSON.stringify(g), before);
  assert.equal(simulateMove(g.board, g.turn, id, g.ko).ok, true);
});

test('AI 会提取被叫吃的棋子，并救出己方被叫吃棋子', () => {
  const attack = new Game(60, 0);
  attack.board[229] = RED; attack.board[228] = BLUE; attack.board[230] = BLUE;
  assert.equal(choose(attack), 202);
  const defend = new Game(60, 0);
  defend.board[229] = BLUE; defend.board[228] = RED; defend.board[230] = RED;
  assert.equal(choose(defend), 202);
});

test('AI 不立即回提劫、不下自杀点，也不主动填己方单点眼', () => {
  const g = new Game(60, 0);
  g.board[229] = RED; g.board[228] = BLUE; g.board[230] = BLUE;
  g.board[201] = RED; g.board[203] = RED;
  g.play(202, 0);
  assert.notEqual(choose(g), 229);
  const eye = new Game(60, 0);
  for (const id of BOARD.byId.get(229).neighbors) eye.board[id] = BLUE;
  assert.notEqual(choose(eye), 229);
  eye.turn = RED;
  assert.notEqual(choose(eye), 229);
});

const eyeWall = [338, 337, 339, 310, 312, 309, 313, 282, 286, 281, 285, 283, 258, 254, 255, 257, 259, 230, 229];

test('补上分眼要点做成两眼，旋转、镜像和换色后仍能做活', () => {
  // 256—283—284—311 是一个连通眼区，填中间的 283 或 284 才分成两眼。
  for (const transform of [id => id, id => 485 - id, id => Math.floor(id / 27) * 27 + 26 - id % 27]) {
    for (const color of [BLUE, RED]) {
      const g = new Game(60, 0); g.turn = color;
      for (const id of eyeWall) if (id !== 283) g.board[transform(id)] = color;
      assert.equal(analyzeDead(g.board).alive[color].size, 0);
      const move = choose(g);
      assert.ok([transform(283), transform(284)].includes(move));
      assert.equal(analyzeDead(simulateMove(g.board, color, move).board).alive[color].size, 19);
    }
  }
});

test('连接断开的围墙才能共享两眼；已有两眼后保留眼位', () => {
  const g = new Game(60, 0);
  for (const id of eyeWall) if (id !== 257) g.board[id] = BLUE;
  assert.equal(analyzeDead(g.board).alive[BLUE].size, 0);
  assert.equal(choose(g), 257);
  g.board[257] = BLUE; g.board[40] = RED;
  assert.equal(analyzeDead(g.board).alive[BLUE].size, 19);
  const move = choose(g);
  assert.ok(![256, 284, 311].includes(move), '不填自己的两个眼区');
  if (move !== null) assert.ok(analyzeDead(simulateMove(g.board, BLUE, move).board).alive[BLUE].size >= 19);
});

test('无紧急战斗时疏展争空，新增潜力高于贴着己方长条加一子', () => {
  const g = new Game(60, 0), stones = [229, 202, 201, 200];
  for (const id of stones) g.board[id] = BLUE;
  g.board[40] = RED;
  const move = choose(g);
  const distance = new Map(stones.map(id => [id, 0])), queue = [...stones];
  for (let i = 0; i < queue.length; i++) for (const n of BOARD.byId.get(queue[i]).neighbors) if (!distance.has(n)) {
    distance.set(n, distance.get(queue[i]) + 1); queue.push(n);
  }
  assert.ok(distance.get(move) >= 2 && distance.get(move) <= 3, '疏展仍保持近距离呼应，不到远处散落孤子');
  const adjacent = [...new Set(stones.flatMap(id => BOARD.byId.get(id).neighbors))].filter(id => !g.board[id]);
  const potential = id => estimatePosition(simulateMove(g.board, BLUE, id).board).sides[BLUE].potential;
  assert.ok(potential(move) > Math.max(...adjacent.map(potential)), '用独立形势模型核对实际新增覆盖');
});

test('没有合法落点时停手；对方停手且无紧急攻防时接受收官', () => {
  const g = new Game(60, 0);
  for (const p of BOARD.points) g.board[p.id] = BLUE;
  assert.equal(choose(g), null);
  const ending = new Game(60, 0);
  ending.pass(0);
  assert.equal(choose(ending), null);
  ending.board[229] = BLUE; ending.board[228] = RED; ending.board[230] = RED;
  ending.board[40] = BLUE; // 结算为平局，仍有提子要点，继续下。
  assert.equal(choose(ending), 202);
});

test('玩家停手后若结算领先，AI 优先停手而非继续提子，两种执子颜色一致', () => {
  for (const ai of [BLUE, RED]) {
    const human = 3 - ai, g = new Game(60, 0);
    g.board[229] = human; g.board[228] = ai; g.board[230] = ai;
    g.turn = ai;
    assert.equal(choose(g), 202, '玩家没有停手时仍正常提子');
    g.turn = human; g.pass(0);
    const before = structuredClone({ ...g });
    assert.equal(choose(g), null, '领先时即使有提子机会也直接收官');
    assert.deepEqual({ ...g }, before, '试算不改变棋盘、历史、标记、计时和结果');
    const { opponent, tasks } = harness();
    opponent.sync(g, ai); tasks[0]();
    assert.equal(g.scoring, true); assert.equal(g.result, null);
    assert.deepEqual(g.board, before.board, '进入确认时不提前提走盘上棋子');
    g.confirmScore(human); g.confirmScore(ai);
    assert.equal(g.result.winner, ai); assert.equal(g.result.reason, 'score');
  }
});

test('领先判断采用预标死子后的实际面积分，不直接数盘面棋子或潜力', () => {
  const g = new Game(60, 0);
  BOARD.points.forEach((p, i) => { g.board[p.id] = i < 181 ? BLUE : RED; });
  for (const id of [40, 90, 390, 420, 97]) g.board[id] = 0;
  g.board[70] = RED;
  g.turn = RED; g.pass(0);
  assert.deepEqual(g.previewScore(), { blue: 179, red: 180, neutral: 1 });
  assert.deepEqual([...analyzeDead(g.board).dead], [70]);
  assert.equal(choose(g), null, '清除预标死子后蓝方领先，应该停手');
  assert.equal(g.board[70], RED); assert.equal(g.deadStones.size, 0);
  g.pass(0);
  assert.deepEqual(g.previewScore(), { blue: 181, red: 179, neutral: 0 });
  g.confirmScore(BLUE); g.confirmScore(RED);
  assert.equal(g.result.winner, BLUE);
});

test('玩家停手后结算持平或落后且仍有提子机会时，AI 继续落子', () => {
  for (const ai of [BLUE, RED]) for (const losing of [false, true]) {
    const g = new Game(60, 0), human = 3 - ai;
    g.board[229] = human; g.board[228] = ai; g.board[230] = ai; g.board[40] = human;
    if (losing) g.board[42] = human;
    g.turn = human; g.pass(0);
    assert.equal(choose(g), 202);
    assert.equal(g.scoring, false);
  }
});

test('一轮悔棋包含 AI 应手，待 AI 应手时只撤玩家一步，保留 AI 开局', () => {
  const g = new Game(60, 0);
  g.play(229, 1000); g.play(40, 2000);
  assert.equal(undoRound(g, BLUE, 3000), true);
  assert.equal(g.moveNumber, 0); assert.equal(g.remaining(3000), 59);
  g.play(229, 3000);
  assert.equal(undoRound(g, BLUE, 4000), true);
  assert.equal(g.moveNumber, 0);
  g.play(229, 4000);
  assert.equal(canUndo(g, RED), false);
  g.pass(5000); g.play(40, 6000);
  assert.equal(undoRound(g, RED, 7000), true);
  assert.equal(g.moveNumber, 1); assert.equal(g.turn, RED); assert.equal(g.passes, 0);
});

function harness() {
  const tasks = [], results = [];
  const opponent = new Opponent({ schedule: fn => (tasks.push(fn), tasks.length), unschedule: () => {},
    choose, now: () => 0, onMove: result => results.push(result) });
  return { opponent, tasks, results };
}

test('同一回合重复调度只执行最新任务，旧局任务不能落子', () => {
  const { opponent, tasks, results } = harness(), old = new Game(60, 0), fresh = new Game(60, 0);
  opponent.sync(old, BLUE); opponent.sync(old, BLUE);
  tasks[0](); assert.equal(old.moveNumber, 0);
  opponent.sync(fresh, BLUE); tasks[1](); tasks[2]();
  assert.equal(old.moveNumber, 0); assert.equal(fresh.moveNumber, 1); assert.equal(results.length, 1);
});

test('AI 暂停后旧任务失效，恢复只落一手；悔棋取消待执行任务', () => {
  const { opponent, tasks } = harness(), g = new Game(60, 0);
  opponent.sync(g, BLUE); g.pause(0); opponent.sync(g, BLUE); tasks[0]();
  assert.equal(g.moveNumber, 0);
  g.resume(0); opponent.sync(g, BLUE); tasks[1]();
  assert.equal(g.moveNumber, 1);
  g.play(40, 0); opponent.sync(g, BLUE);
  opponent.cancel(); undoRound(g, RED, 0); tasks[2]();
  assert.equal(g.moveNumber, 1); assert.equal(g.turn, RED);
});

test('形势判断、确认死子、终局与非 AI 回合都不安排落子', () => {
  for (const setup of [g => g.beginAssessment(0), g => { g.pass(0); g.pass(0); },
    g => g.resign(0), g => g.pause(0), g => g.play(229, 0)]) {
    const { opponent, tasks } = harness(), g = new Game(60, 0);
    setup(g); opponent.sync(g, BLUE); assert.equal(tasks.length, 0);
  }
});

test('AI 思考期间超时，不落子并保留超时结果', () => {
  const g = new Game(1, 0), tasks = [];
  const opponent = new Opponent({ schedule: fn => (tasks.push(fn), 1), now: () => 1000 });
  opponent.sync(g, BLUE); tasks[0]();
  assert.equal(g.moveNumber, 0); assert.equal(g.result.reason, 'timeout'); assert.equal(g.result.winner, RED);
});

test('AI 停手进入确认后可人工结算或指定 AI 续弈', () => {
  const { opponent, tasks } = harness(), g = new Game(60, 0);
  g.pass(0); opponent.sync(g, RED); tasks[0]();
  assert.equal(g.scoring, true);
  g.resumePlay(RED, 0); opponent.sync(g, RED); tasks[1]();
  assert.equal(g.turn, BLUE); assert.equal(g.scoring, false);
  g.pass(0); opponent.sync(g, RED); tasks[2]();
  assert.equal(g.scoring, true);
  g.confirmScore(BLUE); g.confirmScore(RED);
  assert.equal(g.result.reason, 'score');
});

test('固定随机序列自弈 160 手，所有选择都通过正式规则校验', () => {
  const g = new Game(60, 0);
  let seed = 1234;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 160 && !g.result && !g.scoring; i++) {
    const id = chooseMove(g, random);
    if (id === null) assert.equal(g.pass(0), true);
    else assert.equal(g.play(id, 0).ok, true);
  }
  assert.ok(g.moveNumber > 40);
});
