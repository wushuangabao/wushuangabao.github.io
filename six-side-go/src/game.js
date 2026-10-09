/* 六元围棋规则。独立于 DOM，可直接在浏览器和 Node 中运行。 */
(function (root) {
  'use strict';
  const EMPTY = 0, BLUE = 1, RED = 2;
  const other = color => color === BLUE ? RED : BLUE;

  function createBoard() {
    const points = [], byId = new Map();
    for (let row = 0; row < 18; row++) {
      const left = row <= 4 ? 12 - 3 * row : row >= 13 ? 3 * row - 39 : 0;
      const right = 26 - left;
      for (let col = left; col <= right; col++) {
        if (((row === 0 || row === 17) && col === 13) ||
            ((row === 4 || row === 13) && (col === 0 || col === 26))) continue;
        let border = 0;
        if (row <= 4) border = col <= left + 1 ? 3 : col >= right - 1 ? 4 : 0;
        if (row >= 13) border = col <= left + 1 ? 1 : col >= right - 1 ? 6 : 0;
        if (col === 0) border = 2;
        if (col === 26) border = 5;
        const type = (col + row) % 2 === 0 ? 'B' : 'A';
        const point = { id: row * 27 + col, row, col, border, type,
          x: 40 + Math.sqrt(3) * 12 * col,
          y: 40 + (17 - row) * 36 + (type === 'A' ? 6 : -6) };
        points.push(point);
        byId.set(point.id, point);
      }
    }
    // 原棋盘的六条边及六个被省略的角，保留原工程的拓扑。
    const specialLeft = { 352: 324, 109: 135 };
    const specialRight = { 376: 350, 133: 161 };
    const specialVertical = { 324: 352, 135: 109, 350: 376, 161: 133 };
    for (const p of points) {
      const { id, border: b, type } = p;
      const a = type === 'A';
      let left = specialLeft[id] ?? (a && b === 1 ? id - 29 : a && b === 2 ? id + 27 :
        !a && b === 2 ? id - 27 : !a && b === 3 ? id + 25 : id - 1);
      let right = specialRight[id] ?? (a && b === 5 ? id + 27 : a && b === 6 ? id - 25 :
        !a && b === 4 ? id + 29 : !a && b === 5 ? id - 27 : id + 1);
      if (left === 13 || left === 472) left = id - 2;
      if (right === 13 || right === 472) right = id + 2;
      const vertical = specialVertical[id] ?? (a ? (b === 3 ? id - 25 : b === 4 ? id - 29 : id - 27) :
        (b === 1 ? id + 29 : b === 6 ? id + 25 : id + 27));
      p.neighbors = [vertical, left, right].filter(n => byId.has(n));
    }
    const edges = points.flatMap(p => p.neighbors.filter(n => n > p.id).map(n => [p.id, n]));
    const width = 80 + Math.sqrt(3) * 12 * 26, height = 692;
    const boundary = points.filter(p => p.border).sort((a, b) =>
      Math.atan2(a.y - height / 2, a.x - width / 2) - Math.atan2(b.y - height / 2, b.x - width / 2));
    return { points, byId, edges, boundary, width, height };
  }
  const BOARD = createBoard();

  function groupAt(board, id) {
    const color = board[id], stones = new Set(), liberties = new Set(), stack = [id];
    while (stack.length) {
      const current = stack.pop();
      if (stones.has(current)) continue;
      stones.add(current);
      for (const next of BOARD.byId.get(current).neighbors) {
        if (board[next] === EMPTY) liberties.add(next);
        else if (board[next] === color && !stones.has(next)) stack.push(next);
      }
    }
    return { stones, liberties };
  }

  function score(board) {
    const totals = { blue: 0, red: 0, neutral: 0 }, visited = new Set();
    for (const p of BOARD.points) {
      const color = board[p.id];
      if (color) { totals[color === BLUE ? 'blue' : 'red']++; continue; }
      if (visited.has(p.id)) continue;
      const region = [], borders = new Set(), stack = [p.id];
      while (stack.length) {
        const id = stack.pop();
        if (visited.has(id)) continue;
        visited.add(id); region.push(id);
        for (const next of BOARD.byId.get(id).neighbors) {
          if (board[next]) borders.add(board[next]);
          else if (!visited.has(next)) stack.push(next);
        }
      }
      const owner = borders.size === 1 ? [...borders][0] : EMPTY;
      totals[owner === BLUE ? 'blue' : owner === RED ? 'red' : 'neutral'] += region.length;
    }
    return totals;
  }

  // 保守的活棋证明：反复剔除不足两个独立眼区的棋块及依赖它们的眼区。
  // 眼区是由己方棋块围住的“空点 + 对方棋子”连通区域，不能遇到眼内敌子就丢弃。
  // 禁止自杀时，区域的每个空点都必须是该棋块的气；已有敌子不能把一个眼拆成多个。
  // Benson 活棋筛选亦采用此定义：https://github.com/lightvector/KataGo/blob/master/cpp/game/board.cpp
  function unconditionalLife(board, color) {
    const blocks = [], blockAt = new Map(), seen = new Set(), regions = [];
    for (const p of BOARD.points) if (board[p.id] === color && !blockAt.has(p.id)) {
      const block = groupAt(board, p.id);
      for (const id of block.stones) blockAt.set(id, blocks.length);
      blocks.push(block);
    }
    for (const p of BOARD.points) if (board[p.id] !== color && !seen.has(p.id)) {
      const emptyPoints = [], boundary = new Set(), stack = [p.id];
      while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        if (!board[id]) emptyPoints.push(id);
        for (const n of BOARD.byId.get(id).neighbors) {
          if (board[n] !== color) { if (!seen.has(n)) stack.push(n); }
          else boundary.add(blockAt.get(n));
        }
      }
      if (emptyPoints.length && boundary.size) regions.push({ boundary,
        vital: new Set([...boundary].filter(b => emptyPoints.every(id => blocks[b].liberties.has(id)))) });
    }
    const alive = new Set(blocks.map((_, i) => i));
    let changed = true;
    while (changed) {
      changed = false;
      const eyes = regions.filter(r => [...r.boundary].every(b => alive.has(b)));
      for (const b of alive) if (eyes.filter(r => r.vital.has(b)).length < 2) {
        alive.delete(b); changed = true;
      }
    }
    return new Set([...alive].flatMap(b => [...blocks[b].stones]));
  }

  function analyzeDead(board, { maxRegionSize = 12, maxNodes = 12000 } = {}) {
    const alive = { [BLUE]: unconditionalLife(board, BLUE), [RED]: unconditionalLife(board, RED) };
    const dead = new Set();
    let examinedNodes = 0;
    for (const defender of [BLUE, RED]) {
      const attacker = other(defender), walls = alive[attacker], visited = new Set();
      if (!walls.size) continue;
      for (const point of BOARD.points) {
        if (walls.has(point.id) || visited.has(point.id)) continue;
        const area = [], stack = [point.id];
        while (stack.length) {
          const id = stack.pop();
          if (walls.has(id) || visited.has(id)) continue;
          visited.add(id); area.push(id);
          stack.push(...BOARD.byId.get(id).neighbors);
        }
        // 只研究被已证明活棋封住的小区域。双活、开放棋形、大范围攻杀保留人工判断。
        if (area.length > maxRegionSize || !area.some(id => board[id] === defender) ||
            area.some(id => board[id] === attacker || alive[defender].has(id))) continue;
        const index = new Map(area.map((id, i) => [id, i]));
        const neighbors = area.map(id => BOARD.byId.get(id).neighbors.map(n => index.get(n) ?? -1));
        function localGroup(position, start) {
          const stones = new Set(), liberties = new Set(), pending = [start], color = position[start];
          let safe = false;
          while (pending.length) {
            const i = pending.pop();
            if (stones.has(i)) continue;
            stones.add(i);
            for (const n of neighbors[i]) {
              if (n === -1) { if (color === attacker) safe = true; }
              else if (!position[n]) liberties.add(n);
              else if (position[n] === color && !stones.has(n)) pending.push(n);
            }
          }
          return { stones, liberties, safe };
        }
        function localMove(position, turn, i) {
          const next = position.slice(), captured = [];
          next[i] = turn;
          for (const n of neighbors[i]) if (n !== -1 && next[n] === other(turn)) {
            const group = localGroup(next, n);
            if (!group.safe && !group.liberties.size) for (const stone of group.stones) {
              next[stone] = EMPTY; captured.push(stone);
            }
          }
          const own = localGroup(next, i);
          if (!own.safe && !own.liberties.size) return null;
          const ko = captured.length === 1 && !own.safe && own.stones.size === 1 && own.liberties.size === 1;
          return { next, ko, captured: captured.length };
        }
        const memo = new Map();
        function forcedCapture(position, turn, depth) {
          if (!position.includes(defender)) return true;
          if (!depth || examinedNodes >= maxNodes) return false;
          const key = `${turn}:${depth}:${position.join('')}`;
          if (memo.has(key)) return memo.get(key);
          examinedNodes++;
          const moves = position.flatMap((color, i) => color ? [] : [localMove(position, turn, i)]).filter(Boolean);
          moves.sort((a, b) => b.captured - a.captured);
          // 不依赖局部劫争作死亡证明：攻方不采用劫招，守方出现劫招即保留待确认。
          // 停手也必须纳入防守选择。有限深度及节点上限的未知结果一律不标死。
          moves.push({ next: position, ko: false });
          const winning = turn === attacker
            ? moves.some(move => !move.ko && forcedCapture(move.next, defender, depth - 1))
            : moves.every(move => !move.ko && forcedCapture(move.next, attacker, depth - 1));
          memo.set(key, winning);
          return winning;
        }
        // 即使被围方先行、选择最佳应对仍会全部被提，才预标这一片棋子。
        if (forcedCapture(area.map(id => board[id]), defender, area.length * 2 + 4)) {
          for (const id of area) if (board[id] === defender) dead.add(id);
        }
      }
    }
    return { dead, alive, examinedNodes };
  }

  // 中盘势力估算，与终局 score() 分离。使用棋盘的真实三邻点连接，不能套方格距离。
  // 参考 GNU Go 的衰减势力思路，独立实现带固定棋子边界的扩散；数值不是胜率或概率。
  // https://www.gnu.org/software/gnugo/gnugo_13.html
  function estimatePosition(board, deadStones = new Set()) {
    const position = board.slice(), ownership = new Map();
    const sides = { [BLUE]: { stones: 0, dead: 0, alive: 0, territory: 0, potential: 0 },
      [RED]: { stones: 0, dead: 0, alive: 0, territory: 0, potential: 0 } };
    for (const p of BOARD.points) if (board[p.id] && deadStones.has(p.id)) {
      sides[board[p.id]].dead++; position[p.id] = EMPTY;
    }
    const alive = { [BLUE]: unconditionalLife(position, BLUE), [RED]: unconditionalLife(position, RED) };
    const strength = new Float64Array(486), seen = new Set();
    for (const p of BOARD.points) if (position[p.id] && !seen.has(p.id)) {
      const group = groupAt(position, p.id), color = position[p.id];
      // 未证明死的棋块仍保留，气紧的棋块降低势力；两眼活棋保持完整势力。
      const value = alive[color].has(p.id) ? 1 : group.liberties.size <= 1 ? 0.35 : group.liberties.size === 2 ? 0.6 : 0.85;
      for (const id of group.stones) { seen.add(id); strength[id] = value; }
      sides[color].stones += group.stones.size;
    }
    for (const color of [BLUE, RED]) sides[color].alive = alive[color].size;

    // 己方棋子提供势力，对方棋子是不可穿过的边界；每走一条实际连接都会衰减。
    const influence = {};
    for (const color of [BLUE, RED]) {
      let current = new Float64Array(486), next = new Float64Array(486);
      for (const p of BOARD.points) if (position[p.id] === color) current[p.id] = next[p.id] = strength[p.id];
      for (let step = 0; step < 96; step++) {
        let delta = 0;
        for (const p of BOARD.points) if (!position[p.id]) {
          next[p.id] = 0.92 * p.neighbors.reduce((sum, id) => sum + current[id], 0) / p.neighbors.length;
          delta = Math.max(delta, Math.abs(next[p.id] - current[p.id]));
        }
        [current, next] = [next, current];
        if (delta < 0.000001) break;
      }
      influence[color] = current;
    }

    // 单色边界的紧凑空区才作为当前围空。大空区仍可被侵入，归入势力估算；
    // 尤其不能像终局数子那样，让开局的一颗棋子直接拥有其余 359 个点。
    const visited = new Set();
    for (const p of BOARD.points) if (!position[p.id] && !visited.has(p.id)) {
      const region = [], colors = new Set(), boundary = new Set(), queue = [p.id];
      visited.add(p.id);
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i]; region.push(id);
        for (const n of BOARD.byId.get(id).neighbors) {
          if (position[n]) { colors.add(position[n]); boundary.add(n); }
          else if (!visited.has(n)) { visited.add(n); queue.push(n); }
        }
      }
      if (colors.size !== 1 || region.length > boundary.size * 2) continue;
      const distance = new Map([...boundary].map(id => [id, 0])), flood = [...boundary];
      for (let i = 0; i < flood.length; i++) {
        const id = flood[i];
        for (const n of BOARD.byId.get(id).neighbors) if (!position[n] && !distance.has(n)) {
          distance.set(n, distance.get(id) + 1); flood.push(n);
        }
      }
      if (region.some(id => distance.get(id) > 3)) continue;
      const owner = [...colors][0];
      for (const id of region) ownership.set(id, { owner, kind: 'territory', confidence: 1 });
      sides[owner].territory += region.length;
    }

    let contested = 0, open = 0;
    for (const p of BOARD.points) {
      if (position[p.id]) { ownership.set(p.id, { owner: position[p.id], kind: 'stone', confidence: 1 }); continue; }
      if (ownership.has(p.id)) continue;
      const blue = influence[BLUE][p.id], red = influence[RED][p.id], sum = blue + red;
      const bias = sum ? (blue - red) / sum : 0;
      const confidence = Math.abs(bias) * Math.min(1, sum / 0.45);
      const adjacent = new Set(p.neighbors.map(id => position[id]).filter(Boolean));
      if (Math.max(blue, red) < 0.08) {
        ownership.set(p.id, { owner: EMPTY, kind: 'open', confidence: 0 }); open++;
      } else if (Math.abs(bias) < 0.28 || adjacent.size === 2) {
        // 共享气、双方势力接近的空点保持争夺状态，避免把双活的公气判给一方。
        ownership.set(p.id, { owner: EMPTY, kind: 'contested', confidence: 0 }); contested++;
      } else {
        const owner = bias > 0 ? BLUE : RED;
        ownership.set(p.id, { owner, kind: 'potential', confidence }); sides[owner].potential++;
      }
    }
    for (const color of [BLUE, RED]) sides[color].total = sides[color].stones + sides[color].territory + sides[color].potential;
    return { sides, ownership, contested, open, neutral: contested + open };
  }

  // 对局与 AI 共用同一份落子规则；试算只返回副本，不触碰历史或计时。
  function simulateMove(board, turn, id, ko = null) {
    if (!BOARD.byId.has(id)) return { ok: false, reason: '请在棋盘交点落子' };
    if (board[id]) return { ok: false, reason: '这里已有棋子' };
    if (id === ko) return { ok: false, reason: '此处为劫点，请先在别处行棋' };
    const next = board.slice(), removed = [];
    next[id] = turn;
    for (const n of BOARD.byId.get(id).neighbors) if (next[n] === other(turn)) {
      const group = groupAt(next, n);
      if (!group.liberties.size) for (const stone of group.stones) {
        next[stone] = EMPTY; removed.push(stone);
      }
    }
    const own = groupAt(next, id);
    if (!own.liberties.size) return { ok: false, reason: '禁入点：落子后无气，且不能提子' };
    return { ok: true, board: next, own, captured: removed.length,
      ko: removed.length === 1 && own.stones.size === 1 && own.liberties.size === 1 ? removed[0] : null };
  }

  class Game {
    constructor(seconds = 60, now = Date.now()) {
      if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 180 * 60) {
        throw new RangeError('每手时间须为 1 至 10800 的整数秒');
      }
      this.seconds = seconds;
      this.board = Array(486).fill(EMPTY);
      this.turn = BLUE;
      this.history = [];
      this.captured = { [BLUE]: 0, [RED]: 0 };
      this.ko = null;
      this.passes = 0;
      this.moveNumber = 0;
      this.lastMove = null;
      this.result = null;
      this.scoring = false;
      this.assessing = false;
      this.deadStones = new Set();
      this.autoDeadCount = 0;
      this.scoreConfirmed = { [BLUE]: false, [RED]: false };
      this.pausedRemainingMs = null;
      this.deadline = now + seconds * 1000;
    }
    get paused() { return this.pausedRemainingMs !== null; }
    get postgameReview() { return Boolean(this.result && ['resign', 'timeout'].includes(this.result.reason)); }
    get reviewing() { return this.scoring || this.assessing || this.postgameReview; }
    prepareDeadReview() {
      this.deadStones = analyzeDead(this.board).dead;
      this.autoDeadCount = this.deadStones.size;
      this.scoreConfirmed = { [BLUE]: false, [RED]: false };
    }
    beginAssessment(now = Date.now()) {
      if (this.tick(now) || this.reviewing) return false;
      this.assessing = true;
      this.prepareDeadReview();
      return true;
    }
    endAssessment(now = Date.now()) {
      if (this.tick(now) || !this.assessing) return false;
      this.assessing = false;
      this.deadStones.clear();
      this.autoDeadCount = 0;
      this.scoreConfirmed = { [BLUE]: false, [RED]: false };
      return true;
    }
    remainingMilliseconds(now = Date.now()) { return this.scoring ? 0 : Math.max(0, this.pausedRemainingMs ?? (this.deadline - now)); }
    remaining(now = Date.now()) { return Math.ceil(this.remainingMilliseconds(now) / 1000); }
    remainingRatio(now = Date.now()) {
      return this.result ? 0 : Math.min(1, this.remainingMilliseconds(now) / (this.seconds * 1000));
    }
    tick(now = Date.now()) {
      if (!this.result && !this.scoring && !this.paused && now >= this.deadline) this.finish(other(this.turn), 'timeout');
      return this.result;
    }
    pause(now = Date.now()) {
      if (this.tick(now) || this.reviewing || this.paused) return false;
      this.pausedRemainingMs = this.remainingMilliseconds(now);
      return true;
    }
    resume(now = Date.now()) {
      if (this.result || this.assessing || !this.paused) return false;
      this.deadline = now + this.pausedRemainingMs;
      this.pausedRemainingMs = null;
      return true;
    }
    snapshot(now) {
      return { board: this.board.slice(), turn: this.turn, captured: { ...this.captured },
        ko: this.ko, passes: this.passes, moveNumber: this.moveNumber, lastMove: this.lastMove,
        remainingMs: Math.max(0, this.deadline - now) };
    }
    nextTurn(now) { this.turn = other(this.turn); this.deadline = now + this.seconds * 1000; }
    play(id, now = Date.now()) {
      if (this.tick(now)) return { ok: false, reason: '棋局已结束' };
      if (this.assessing) return { ok: false, reason: '请先关闭形势判断' };
      if (this.scoring) return { ok: false, reason: '请先确认死子，或选择继续对弈' };
      if (this.paused) return { ok: false, reason: '计时已暂停，请先继续计时' };
      const move = simulateMove(this.board, this.turn, id, this.ko);
      if (!move.ok) return move;
      const before = this.snapshot(now);
      this.board = move.board;
      this.history.push(before);
      this.captured[this.turn] += move.captured;
      // 只有下一手能立即还原棋盘时才构成单劫，不能把普通单子提取误判为劫。
      this.ko = move.ko;
      this.passes = 0;
      this.moveNumber++;
      this.lastMove = id;
      this.nextTurn(now);
      // 普通单劫在落子前拦截；合法落子后，棋盘和行棋方同时重复则判循环和棋。
      // 直接核对当前分支的快照，避免哈希碰撞，也不会把悔掉的未来局面算入历史。
      if (this.history.some(state => state.turn === this.turn &&
          BOARD.points.every(p => state.board[p.id] === this.board[p.id]))) {
        this.finish(EMPTY, 'repetition');
      }
      return { ok: true, captured: move.captured };
    }
    pass(now = Date.now()) {
      if (this.tick(now) || this.reviewing || this.paused) return false;
      this.history.push(this.snapshot(now));
      this.passes++; this.moveNumber++; this.ko = null;
      this.nextTurn(now);
      if (this.passes === 2) {
        this.scoring = true;
        this.prepareDeadReview();
      }
      return true;
    }
    toggleDead(id, now = Date.now()) {
      if (this.assessing && this.tick(now)) return { ok: false, reason: '棋局已结束' };
      if (!this.reviewing) return { ok: false, reason: '当前不在死子确认或形势判断阶段' };
      if (!BOARD.byId.has(id) || !this.board[id]) return { ok: false, reason: '请点选棋子标记死子，再点一次可取消' };
      const stones = groupAt(this.board, id).stones, marked = !this.deadStones.has(id);
      for (const stone of stones) {
        if (marked) this.deadStones.add(stone);
        else this.deadStones.delete(stone);
      }
      // 标记改变后，之前对另一份计分结果的同意不再有效。
      this.scoreConfirmed = { [BLUE]: false, [RED]: false };
      return { ok: true, marked, count: stones.size };
    }
    scoringBoard() {
      const board = this.board.slice();
      for (const id of this.deadStones) board[id] = EMPTY;
      return board;
    }
    previewScore() { return score(this.scoringBoard()); }
    estimatePosition() { return estimatePosition(this.board, this.deadStones); }
    confirmScore(color) {
      if (!this.scoring || this.result || ![BLUE, RED].includes(color) || this.scoreConfirmed[color]) return false;
      this.scoreConfirmed[color] = true;
      if (this.scoreConfirmed[BLUE] && this.scoreConfirmed[RED]) {
        for (const id of this.deadStones) this.captured[other(this.board[id])]++;
        if (this.deadStones.has(this.lastMove)) this.lastMove = null;
        this.board = this.scoringBoard();
        const totals = score(this.board);
        this.finish(totals.blue === totals.red ? EMPTY : totals.blue > totals.red ? BLUE : RED, 'score', totals);
      }
      return true;
    }
    resumePlay(color, now = Date.now()) {
      if (!this.scoring || this.result || ![BLUE, RED].includes(color)) return false;
      this.scoring = false;
      this.deadStones.clear();
      this.autoDeadCount = 0;
      this.scoreConfirmed = { [BLUE]: false, [RED]: false };
      this.passes = 0;
      this.turn = color;
      this.deadline = now + this.seconds * 1000;
      return true;
    }
    undo(now = Date.now()) {
      if (this.tick(now) || this.reviewing || this.paused || !this.history.length) return false;
      const state = this.history.pop();
      const { remainingMs, ...rest } = state;
      Object.assign(this, rest);
      this.deadline = now + remainingMs;
      return true;
    }
    resign(now = Date.now()) {
      if (this.tick(now) || this.reviewing || this.paused) return false;
      this.finish(other(this.turn), 'resign');
      return true;
    }
    finish(winner, reason, totals = null) {
      this.scoring = false;
      this.assessing = false;
      this.deadStones.clear();
      this.result = { winner, reason, totals };
      if (this.postgameReview) this.prepareDeadReview();
    }
  }
  const api = { BOARD, Game, groupAt, simulateMove, score, analyzeDead, estimatePosition, EMPTY, BLUE, RED, other };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SixSideGo = api;
})(globalThis);
