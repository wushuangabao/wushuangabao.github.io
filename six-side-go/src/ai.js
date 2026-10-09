/* 本地陪练：真实三邻点拓扑上的眼形、边际势力与有限应答搜索。 */
(function (root) {
  'use strict';
  const { BOARD, BLUE, groupAt, simulateMove, analyzeDead, score, other } = typeof module !== 'undefined' && module.exports
    ? require('./game.js') : root.SixSideGo;

  const neighbors = Array.from({ length: 486 }, (_, id) => BOARD.byId.get(id)?.neighbors || []);

  // 沿真实三邻点连接续算连续打吃，避免把“延长后有两气”直接当成脱险。
  // 仅供选招评估，不用于终局判死；深度、节点耗尽或遇劫都保留未知。
  function caughtInChase(board, target, turn, ko) {
    const defender = board[target], attacker = other(defender), path = new Set();
    let examined = 0;
    function read(position, turn, ko, depth) {
      if (position[target] !== defender) return true;
      const group = groupAt(position, target);
      if (group.liberties.size > 2 || !depth || examined++ >= 96) return false;
      const key = `${turn}:${ko}:${position.join('')}`;
      if (path.has(key)) return false;
      path.add(key);
      const points = new Set(group.liberties);
      if (turn === defender) {
        const checked = new Set();
        for (const id of group.stones) for (const n of neighbors[id]) if (position[n] === attacker && !checked.has(n)) {
          const enemy = groupAt(position, n);
          for (const stone of enemy.stones) checked.add(stone);
          // 反提周围的棋也能增气，不能只检查顺着最后一口气逃跑。
          if (enemy.liberties.size === 1) points.add([...enemy.liberties][0]);
        }
      }
      const moves = [...points].map(id => simulateMove(position, turn, id, ko)).filter(move => move.ok);
      moves.sort((a, b) => b.captured - a.captured);
      const caught = turn === attacker
        ? moves.some(move => move.ko === null && read(move.board, defender, move.ko, depth - 1))
        : moves.every(move => move.ko === null && read(move.board, attacker, move.ko, depth - 1)) &&
          read(position, attacker, null, depth - 1); // 不应子也须能被提，不能把不能填自己的眼误判为被吃。
      path.delete(key);
      return caught;
    }
    return read(board, turn, ko, 10);
  }

  function analyze(board) {
    const blocks = Array(486), groups = [], eyes = Array(486).fill(null);
    for (const p of BOARD.points) if (board[p.id] && !blocks[p.id]) {
      const group = { ...groupAt(board, p.id), color: board[p.id], eyes: 0, potential: 0 };
      groups.push(group);
      for (const id of group.stones) blocks[id] = group;
    }
    const seen = new Set();
    for (const p of BOARD.points) if (!board[p.id] && !seen.has(p.id)) {
      const region = [p.id], boundary = new Set();
      seen.add(p.id);
      for (let i = 0; i < region.length; i++) for (const n of neighbors[region[i]]) {
        if (board[n]) boundary.add(blocks[n]);
        else if (!seen.has(n)) { seen.add(n); region.push(n); }
      }
      // 整个连通空区只算一眼；分离的围墙不能相互借眼。
      // 每个眼内空点都直接接触同一块棋，保守排除可侵入的大空区。
      const group = boundary.size === 1 ? [...boundary][0] : null;
      if (group && region.every(id => neighbors[id].some(n => blocks[n] === group))) {
        group.eyes++;
        for (const id of region) eyes[id] = group;
      }
    }
    // 缺一口封闭的眼形只给小幅准备分，不能当作已经做活。
    for (const p of BOARD.points) if (!board[p.id] && !eyes[p.id]) {
      const adjacent = neighbors[p.id].map(n => blocks[n]).filter(Boolean);
      if (adjacent.length === 2 && adjacent[0] === adjacent[1] && adjacent[0].liberties.size > 2) adjacent[0].potential++;
    }
    const influence = {}, distance = {};
    for (const color of [1, 2]) {
      const field = new Float64Array(486), dist = new Uint16Array(486).fill(99), queue = [];
      for (const group of groups) if (group.color === color) for (const id of group.stones) {
        field[id] = group.eyes >= 2 ? 1 : group.liberties.size === 1 ? 0.25 : group.liberties.size === 2 ? 0.65 : 1;
        dist[id] = 0; queue.push(id);
      }
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i], strength = field[id] * 0.7;
        if (strength < 0.08) continue;
        for (const n of neighbors[id]) if (!board[n] && (strength > field[n] + 0.00001 || dist[id] + 1 < dist[n])) {
          field[n] = Math.max(field[n], strength); dist[n] = Math.min(dist[n], dist[id] + 1); queue.push(n);
        }
      }
      influence[color] = field; distance[color] = dist;
    }
    const values = [0, 0, 0];
    for (const group of groups) {
      const size = group.stones.size, libs = group.liberties.size;
      let value = size * 90 - 5;
      if (group.eyes >= 2) value += 180 + Math.min(size, 25) * 2;
      else {
        if (group.eyes === 1) value += 42;
        value += Math.min(group.potential, 2 - group.eyes) * 9;
        value -= libs === 1 ? 38 + size * 32 : libs === 2 ? 8 + size * 5 : 0;
      }
      group.value = value;
      values[group.color] += value;
    }
    for (const p of BOARD.points) if (!board[p.id]) {
      const blue = influence[1][p.id], red = influence[2][p.id];
      // 势力重叠不重复计分：一手只能获得新覆盖或从对方手里争来的部分。
      const control = (blue - red) / (blue + red + 0.35);
      values[control > 0 ? 1 : 2] += Math.abs(control) * 4;
    }
    return { blocks, groups, eyes, influence, distance, values };
  }

  function candidates(board, turn, ko, before) {
    const moves = [];
    for (const p of BOARD.points) {
      const move = simulateMove(board, turn, p.id, ko);
      if (!move.ok) continue;
      const friends = new Set(neighbors[p.id].filter(n => board[n] === turn).map(n => before.blocks[n]));
      const enemies = new Set(neighbors[p.id].filter(n => board[n] === other(turn)).map(n => before.blocks[n]));
      let tactical = move.captured * 90;
      for (const group of friends) if (group.liberties.size === 1 && move.own.liberties.size > 1) tactical += group.stones.size * 100;
      const urgent = tactical > 0;
      for (const group of enemies) if (group.liberties.size === 2) tactical += Math.min(group.stones.size, 8) * 12;
      let shape = 0;
      const ownDistance = before.distance[turn][p.id];
      if (before.groups.some(g => g.color === turn)) shape -= Math.max(0, Math.min(ownDistance, 8) - 3) * 22;
      if (!move.captured && friends.size === 1 && neighbors[p.id].every(n => board[n] === turn)) shape -= 24;
      // 应答候选也覆盖补眼/破眼要点，不能只搜索提子。
      let eyeOrder = 0;
      for (const n of neighbors[p.id]) if (!board[n]) {
        const walls = neighbors[n].filter(id => board[id] === turn);
        if (walls.length === 2 && before.blocks[walls[0]] === before.blocks[walls[1]]) eyeOrder += 45;
        const enemyWalls = neighbors[n].filter(id => board[id] === other(turn));
        if (enemyWalls.length === 2) eyeOrder += 20;
      }
      const field = before.influence[turn][p.id], opposing = before.influence[other(turn)][p.id];
      const order = tactical + shape + eyeOrder + (1 - field) * 12 + opposing * 6 + Math.min(move.own.liberties.size, 6) * 2;
      moves.push({ id: p.id, ...move, shape, order, urgent });
    }
    return moves;
  }

  function chooseMove(game, random = Math.random) {
    if (game.result || game.reviewing || game.paused) return null;
    if (game.passes === 1) {
      // 与连续停手后的默认结算一致：先预标死子，再用面积计分。
      // 只试算副本，不提前提子或确认；能赢时优先收官，不再贪提/救子。
      const scoringBoard = game.board.slice();
      for (const id of analyzeDead(game.board).dead) scoringBoard[id] = 0;
      const totals = score(scoringBoard), own = game.turn === BLUE ? totals.blue : totals.red;
      const opponent = game.turn === BLUE ? totals.red : totals.blue;
      if (own > opponent) return null;
    }
    const { board, turn, ko } = game, enemy = other(turn), before = analyze(board);
    const moves = candidates(board, turn, ko, before);
    if (!moves.length || (game.passes && !moves.some(m => m.urgent))) return null;
    const baseline = before.values[turn] - before.values[enemy];
    for (const move of moves) {
      move.position = analyze(move.board);
      // 扣除本手新增棋子的固定价值，避免把在自家空里填子当成收益。
      move.value = move.position.values[turn] - move.position.values[enemy] + move.shape - 90;
      if (move.own.liberties.size <= 2 && caughtInChase(move.board, move.id, enemy, move.ko)) {
        // 仍能被连续打吃提走的整块棋，不应因多添一子、暂时多一气获得救活奖励。
        // 提子收益仍保留，因此允许有实际收益的弃子交换。
        move.value -= Math.max(0, move.position.blocks[move.id].value);
      }
      move.tie = random() * 0.05;
    }
    moves.sort((a, b) => b.value + b.tie - a.value - a.tie);
    let best = null, bestValue = -Infinity;
    // 保留前六个选择及最多两个紧急提/救子点，防止粗估将救命手挤出搜索。
    // 每个选择只查八个主要应答，限制浏览器内的计算量。
    const shortlist = new Set([...moves.slice(0, 6), ...moves.filter(m => m.urgent).slice(0, 2)]);
    for (const move of shortlist) {
      let worst = move.value;
      const replies = candidates(move.board, enemy, move.ko, move.position).sort((a, b) => b.order - a.order).slice(0, 8);
      for (const reply of replies) {
        const position = analyze(reply.board);
        // 双方各添一子，固定棋子价值相抵；提子和安全性变化仍保留。
        let response = position.values[turn] - position.values[enemy];
        if (position.groups.some(g => g.color === turn && g.liberties.size === 1)) {
          // 被打吃不等于已经死：再查一次延长或反提，避免因搜索恰好停在
          // 对方打吃这一步，就放弃本来可以救出的棋。
          const saves = new Set(position.groups.filter(g => g.liberties.size === 1).flatMap(g => [...g.liberties]));
          for (const id of [...saves].slice(0, 4)) {
            const escape = simulateMove(reply.board, turn, id, reply.ko);
            if (!escape.ok) continue;
            const safe = analyze(escape.board);
            let continuation = safe.values[turn] - safe.values[enemy] - 90;
            if (escape.own.liberties.size <= 2 && caughtInChase(escape.board, id, enemy, escape.ko)) {
              continuation -= Math.max(0, safe.blocks[id].value);
            }
            response = Math.max(response, continuation);
          }
        }
        worst = Math.min(worst, response + move.shape);
      }
      const value = move.value * 0.3 + worst * 0.7 + move.tie;
      if (value > bestValue) { bestValue = value; best = move; }
    }
    return best && best.value > baseline + 1 ? best.id : null;
  }

  function canUndo(game, human) {
    return Boolean(game && !game.result && !game.reviewing && !game.paused &&
      game.history.some(state => state.turn === human));
  }
  function undoRound(game, human, now = Date.now()) {
    if (!canUndo(game, human)) return false;
    do { if (!game.undo(now)) return false; } while (game.turn !== human && game.history.length);
    return true;
  }

  // 可取消的回合调度；暂停、看形势、换局后旧任务不能再落子。
  class Opponent {
    constructor({ onMove, schedule = (fn, delay) => setTimeout(fn, delay), unschedule = id => clearTimeout(id), choose = chooseMove, now = Date.now } = {}) {
      Object.assign(this, { onMove, schedule, unschedule, choose, now });
      this.pending = null;
      this.generation = 0;
    }
    cancel() {
      this.generation++;
      if (this.pending !== null) this.unschedule(this.pending);
      this.pending = null;
    }
    sync(game, color) {
      this.cancel();
      if (!game || !color || game.turn !== color || game.result || game.reviewing || game.paused) return;
      const generation = this.generation;
      this.pending = this.schedule(() => {
        if (generation !== this.generation) return;
        this.pending = null;
        if (game.tick(this.now()) || game.reviewing || game.paused || game.turn !== color) { this.onMove?.(); return; }
        const id = this.choose(game);
        // 计算也占用本手时间；落子仍由规则模型作最后校验。
        const result = id === null ? { ok: game.pass(this.now()), passed: true } : game.play(id, this.now());
        this.onMove?.(result);
      }, 450);
    }
  }
  const api = { chooseMove, canUndo, undoRound, Opponent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SixSideGoAI = api;
})(globalThis);
