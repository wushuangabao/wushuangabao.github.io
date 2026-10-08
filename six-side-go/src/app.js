(() => {
  'use strict';
  const { BOARD, Game, BLUE, RED } = SixSideGo;
  const $ = id => document.getElementById(id);
  const name = color => color === BLUE ? '蓝方' : '红方';
  const svg = $('board'), nodes = new Map();
  const camera = new SixSideGoView.BoardView(BOARD.width, BOARD.height);
  const mobileLayout = matchMedia('(max-width: 720px)');
  const contacts = new Set();
  let pointerId = null, multiTouch = false, suppressClickUntil = 0;
  const timerFill = $('timer-fill');
  const turnPanel = document.querySelector('.turn-panel');
  let game = null, soundEnabled = true, selected = 229, confirmation = null, ended = false;
  const sounds = Object.fromEntries(['button', 'chessDown', 'chessDead', 'gameOver'].map(key => [key, new Audio(`assets/audio/${key}.mp3`)]));
  function sound(key) {
    if (!soundEnabled) return;
    const audio = sounds[key];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
  svg.setAttribute('viewBox', `0 0 ${BOARD.width} ${BOARD.height}`);
  svg.innerHTML = `<defs>
    <radialGradient id="blue-stone" cx="35%" cy="25%" r="75%"><stop stop-color="#759bc1"/><stop offset="1" stop-color="#365d87"/></radialGradient>
    <radialGradient id="red-stone" cx="35%" cy="25%" r="75%"><stop stop-color="#d98d72"/><stop offset="1" stop-color="#a6493b"/></radialGradient>
    <filter id="stone-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.3" stdDeviation="1" flood-color="#283226" flood-opacity=".2"/></filter>
    </defs>`;
  function element(tag, attrs, parent = svg) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent.append(node); return node;
  }
  // 六处角连接改画为与两侧相切的浅弧，端点和规则拓扑保持原样。
  const cornerEdges = new Set(['12:14', '109:135', '133:161', '324:352', '350:376', '471:473']);
  function connection(p, q) {
    if (!cornerEdges.has(`${Math.min(p.id, q.id)}:${Math.max(p.id, q.id)}`)) return `L ${q.x} ${q.y}`;
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const dx = mx - BOARD.width / 2, dy = my - BOARD.height / 2;
    const scale = 12 / Math.hypot(dx, dy);
    return `Q ${mx + dx * scale} ${my + dy * scale} ${q.x} ${q.y}`;
  }
  const first = BOARD.boundary[0];
  const outline = `M ${first.x} ${first.y} ` + BOARD.boundary.map((p, i) =>
    connection(p, BOARD.boundary[(i + 1) % BOARD.boundary.length])).join(' ') + ' Z';
  element('path', { d: outline, class: 'board-surface' });
  const lines = element('g', { 'aria-hidden': 'true' });
  for (const [a, b] of BOARD.edges) {
    const p = BOARD.byId.get(a), q = BOARD.byId.get(b);
    element('path', { d: `M ${p.x} ${p.y} ${connection(p, q)}`, class: 'board-edge' }, lines);
  }
  element('path', { d: outline, class: 'board-outline', 'aria-hidden': 'true' });
  for (const p of BOARD.points) {
    const node = element('g', { class: 'point empty', transform: `translate(${p.x} ${p.y})`, role: 'button',
      tabindex: p.id === selected ? 0 : -1, 'data-id': p.id });
    element('circle', { r: 11.8, class: 'hit' }, node);
    element('circle', { r: 1.7, class: 'piece' }, node);
    element('circle', { r: 2.4, class: 'last-mark' }, node);
    element('rect', { x: -4, y: -4, width: 8, height: 8, class: 'ko-mark' }, node);
    element('path', { d: 'M -4 -4 L 4 4 M 4 -4 L -4 4', class: 'dead-mark', 'aria-hidden': 'true' }, node);
    node.addEventListener('click', () => { select(p.id, false); play(p.id); });
    node.addEventListener('keydown', event => keydown(event, p));
    nodes.set(p.id, node);
  }
  function applyCamera() {
    svg.setAttribute('viewBox', camera.viewBox);
    $('board-viewport').classList.toggle('zoomed', camera.zoomed);
  }
  function resetCamera() {
    if (pointerId !== null && svg.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
    contacts.clear(); pointerId = null; multiTouch = false;
    camera.reset();
    svg.classList.remove('dragging');
    applyCamera();
  }
  function boardCoordinates(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  function boardTap(event) {
    if (!game) { $('setup-dialog').showModal(); return; }
    if (game.tick() || game.paused) { render(); return; }
    const point = boardCoordinates(event);
    if (!camera.zoomed) {
      const pixelsPerUnit = svg.getScreenCTM().a;
      camera.zoomAt(point.x, point.y, Math.max(2.8, 44 / (24 * pixelsPerUnit)));
      applyCamera();
      return;
    }
    const nearest = BOARD.points.reduce((best, p) => Math.hypot(p.x - point.x, p.y - point.y) <
      Math.hypot(best.x - point.x, best.y - point.y) ? p : best);
    if (Math.hypot(nearest.x - point.x, nearest.y - point.y) > 12) {
      resetCamera();
      message('此处不是落子交点，已恢复完整棋盘。');
      return;
    }
    select(nearest.id, false); play(nearest.id);
  }
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !(event.pointerType === 'touch' || mobileLayout.matches || camera.zoomed)) return;
    contacts.add(event.pointerId);
    if (contacts.size > 1) { multiTouch = true; camera.cancelPointer(); return; }
    pointerId = event.pointerId;
    camera.beginPointer(event.clientX, event.clientY, event.timeStamp, event.pointerType === 'mouse');
    if (camera.zoomed) svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId || multiTouch) return;
    const delta = camera.movePointer(event.clientX, event.clientY, event.timeStamp);
    if (delta) {
      const scale = svg.getScreenCTM().a;
      camera.pan(delta.x / scale, delta.y / scale);
      svg.classList.add('dragging');
      applyCamera();
    }
  });
  function finishPointer(event, cancelled) {
    if (!contacts.has(event.pointerId)) return;
    contacts.delete(event.pointerId);
    suppressClickUntil = performance.now() + 750;
    if (event.pointerId === pointerId) {
      const tap = !cancelled && !multiTouch && camera.endPointer(event.clientX, event.clientY, event.timeStamp);
      camera.cancelPointer(); pointerId = null;
      svg.classList.remove('dragging');
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (tap) boardTap(event);
    }
    if (!contacts.size) multiTouch = false;
  }
  window.addEventListener('pointerup', event => finishPointer(event, false));
  window.addEventListener('pointercancel', event => finishPointer(event, true));
  svg.addEventListener('contextmenu', event => { if (camera.zoomed) event.preventDefault(); });
  // 手势已在 pointerup 中处理，屏蔽随后浏览器合成的 click，避免第一次点按直接落子。
  svg.addEventListener('click', event => {
    if (event.detail > 0 && (mobileLayout.matches || event.pointerType === 'touch' || performance.now() < suppressClickUntil)) {
      event.preventDefault(); event.stopPropagation();
    }
  }, true);
  window.addEventListener('resize', resetCamera);
  document.addEventListener('visibilitychange', () => { camera.cancelPointer(); contacts.clear(); pointerId = null; multiTouch = false; });
  function select(id, focus = true) {
    nodes.get(selected)?.setAttribute('tabindex', '-1');
    selected = id;
    nodes.get(id).setAttribute('tabindex', '0');
    if (focus) nodes.get(id).focus();
  }
  function keydown(event, p) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); play(p.id); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const [dx, dy] = direction;
    const candidates = BOARD.points.filter(q => (q.x - p.x) * dx + (q.y - p.y) * dy > 1);
    candidates.sort((a, b) => {
      const cost = q => Math.hypot(q.x - p.x, q.y - p.y) + Math.abs((q.x - p.x) * dy - (q.y - p.y) * dx) * 3;
      return cost(a) - cost(b);
    });
    if (candidates.length) select(candidates[0].id);
  }
  function message(text) { $('message').textContent = text; }
  function play(id) {
    if (!game) { $('setup-dialog').showModal(); return; }
    if (game.scoring) {
      const result = game.toggleDead(id);
      resetCamera(); render();
      if (result.ok) sound('button');
      message(result.ok ? `${result.marked ? '已标记' : '已取消'} ${result.count} 枚死子。请双方重新核对并确认。` : result.reason);
      return;
    }
    const result = game.play(id);
    resetCamera();
    if (result.ok) { sound(result.captured ? 'chessDead' : 'chessDown'); message(result.captured ? `提走 ${result.captured} 子，轮到${name(game.turn)}。` : `轮到${name(game.turn)}，请落子。`); }
    else message(result.reason);
    render();
  }
  function render() {
    const scoring = Boolean(game?.scoring);
    const active = game && !game.result && !game.paused && !scoring;
    if (!active && !scoring) resetCamera();
    document.body.classList.toggle('scoring', scoring);
    turnPanel.classList.toggle('finished', Boolean(game?.result));
    turnPanel.setAttribute('aria-label', game?.result ? '对局结果' : '当前回合');
    document.body.dataset.turn = game?.turn === RED ? 'red' : 'blue';
    svg.dataset.active = String(Boolean(active));
    svg.dataset.scoring = String(scoring);
    svg.setAttribute('aria-label', scoring ? '确认死子棋盘，方向键选择棋子，回车标记或取消整块死子' : '六元围棋棋盘，方向键选择交点，回车落子');
    svg.style.setProperty('--preview', game?.turn === RED ? 'var(--red)' : 'var(--blue)');
    let blue = 0, red = 0;
    for (const p of BOARD.points) {
      const color = game?.board[p.id] || 0, node = nodes.get(p.id);
      if (color === BLUE) blue++; else if (color === RED) red++;
      const dead = scoring && game.deadStones.has(p.id);
      node.setAttribute('class', `point ${color === BLUE ? 'blue' : color === RED ? 'red' : 'empty'}${game?.lastMove === p.id ? ' last' : ''}${game?.ko === p.id ? ' ko' : ''}${dead ? ' dead' : ''}`);
      node.querySelector('.piece').setAttribute('r', color ? 8.8 : 1.7);
      node.setAttribute('aria-label', `第${18 - p.row}行第${p.col + 1}列，${color ? name(color) + '棋子' : '空点'}${game?.ko === p.id ? '，劫点' : ''}${dead ? '，已标记死子' : ''}`);
      node.setAttribute('aria-disabled', String(scoring ? !color : !active || Boolean(color)));
      if (scoring && color) node.setAttribute('aria-pressed', String(dead));
      else node.removeAttribute('aria-pressed');
    }
    $('blue-count').innerHTML = `${blue} <small>子</small>`;
    $('red-count').innerHTML = `${red} <small>子</small>`;
    $('blue-captures').textContent = `提子 ${game?.captured[BLUE] || 0}`;
    $('red-captures').textContent = `提子 ${game?.captured[RED] || 0}`;
    $('pass').disabled = !active; $('resign').disabled = !active;
    $('undo').disabled = !active || !game.history.length;
    $('pause').disabled = !game || Boolean(game.result) || scoring;
    $('pause').hidden = Boolean(game?.result);
    $('pause').textContent = game?.paused ? '继续计时' : '暂停计时';
    $('pause').setAttribute('aria-pressed', String(Boolean(game?.paused)));
    $('move-number').textContent = `第 ${game?.moveNumber || 0} 手`;
    $('board-status').textContent = game?.result ? '本局已结束' : scoring ? '确认死子' : game?.paused ? '已暂停' : active ? '对弈中' : '准备对局';
    const duration = game?.seconds || 60;
    $('mode-label').textContent = scoring ? '计时已停止' : duration > 60 ? `每手 ${duration / 60} 分钟` : `每手 ${duration} 秒`;
    $('new-game').textContent = game ? '再开一局' : '开始新棋局';
    $('turn-label').innerHTML = game?.result ? (game.result.winner ? `${name(game.result.winner)}获胜` : '双方和棋') : scoring ? '等待双方确认' : game ? `<i class="stone-dot ${game.turn === BLUE ? 'blue' : 'red'}"></i>${name(game.turn)}${game.paused ? ' · 已暂停' : '执子'}` : '<i class="stone-dot blue"></i>等待开局';
    $('scoring-panel').hidden = !scoring;
    document.querySelector('.game-actions').hidden = scoring;
    if (scoring) {
      const totals = game.previewScore();
      const deadBlue = [...game.deadStones].filter(id => game.board[id] === BLUE).length;
      $('auto-dead-note').textContent = game.autoDeadCount ? `程序已预标 ${game.autoDeadCount} 枚死子，请核对。` : '程序未预标死子，请双方核对。';
      $('dead-count').textContent = `当前标记：蓝 ${deadBlue} 子 · 红 ${game.deadStones.size - deadBlue} 子`;
      $('preview-blue').textContent = `${totals.blue} 分`;
      $('preview-red').textContent = `${totals.red} 分`;
      $('preview-neutral').textContent = `中立 ${totals.neutral} 点 · 无贴目`;
      for (const [color, id] of [[BLUE, 'confirm-blue'], [RED, 'confirm-red']]) {
        $(id).disabled = game.scoreConfirmed[color];
        $(id).setAttribute('aria-pressed', String(game.scoreConfirmed[color]));
        $(id).textContent = `${name(color)}${game.scoreConfirmed[color] ? '已确认' : '确认'}`;
      }
    }
    if (game?.result) {
      const { winner, reason, totals } = game.result;
      message(reason === 'repetition' ? '棋盘与行棋方重复出现，循环劫判和棋。' : reason === 'score' ? `蓝方 ${totals.blue} 分 · 红方 ${totals.red} 分 · 中立 ${totals.neutral} 点。${winner ? name(winner) + '获胜。' : '双方和棋。'}` : `${name(game.turn)}${reason === 'timeout' ? '超时' : '认输'}，${name(winner)}获胜。`);
      if (!ended) {
        ended = true; sound('gameOver');
        $('confirm-dialog').close(); confirmation = null;
        $('help-dialog').close();
        $('resume-dialog').close();
      }
    } else if (scoring) {
      message(game.scoreConfirmed[BLUE] ? '蓝方已确认，请红方核对。' : game.scoreConfirmed[RED] ? '红方已确认，请蓝方核对。' : '计时已停止，请核对死子与预计得分。');
    } else if (game?.paused) {
      message('计时已暂停，点击“继续计时”恢复对弈。');
    }
    renderClock();
  }
  function renderClock() {
    const seconds = !game ? 60 : game.result ? 0 : game.remaining();
    const useMinutes = game?.seconds > 60;
    turnPanel.classList.toggle('minute-mode', Boolean(useMinutes));
    $('timer').textContent = game?.result || game?.scoring ? '—' : useMinutes ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : String(seconds).padStart(2, '0');
    document.querySelector('.clock-unit').textContent = game?.scoring ? '确认期间不计时' : useMinutes ? '分:秒 / 本手' : '秒 / 本手';
    renderProgress();
    $('timer').parentElement.classList.toggle('urgent', Boolean(game && !game.result && !game.scoring && !game.paused && seconds <= 5));
  }
  function renderProgress() {
    timerFill.style.transform = `scaleX(${game ? game.remainingRatio() : 1})`;
  }
  function animateProgress() {
    if (game && !game.result && !game.scoring && !game.paused) renderProgress();
    requestAnimationFrame(animateProgress);
  }
  function confirmAction(title, description, action) {
    confirmation = action; $('confirm-title').textContent = title;
    $('confirm-description').textContent = description; $('confirm-dialog').showModal();
  }
  $('confirm-no').onclick = () => { confirmation = null; $('confirm-dialog').close(); };
  $('confirm-yes').onclick = () => { const action = confirmation; confirmation = null; $('confirm-dialog').close(); action?.(); };
  $('confirm-dialog').addEventListener('cancel', () => { confirmation = null; });
  $('new-game').onclick = () => {
    if (game && !game.tick()) confirmAction('结束当前棋局？', `开始新局会清空当前棋盘。${game.scoring ? '当前正在确认死子。' : game.paused ? '当前计时已暂停。' : '确认期间仍在计时。'}`, () => {
      game = null; ended = false; render(); message('选择节奏，开始一盘新棋。'); $('setup-dialog').showModal();
    });
    else { render(); $('setup-dialog').showModal(); }
  };
  function validateMinutes() {
    const input = $('custom-minutes');
    input.setCustomValidity('');
    if (!input.disabled && (!Number.isFinite(input.valueAsNumber) || !input.validity.valid)) {
      input.setCustomValidity('请输入 0.1 至 180 之间的分钟数，最多一位小数。');
    }
  }
  $('setup-form').addEventListener('change', event => {
    if (event.target.name !== 'seconds') return;
    $('custom-minutes').disabled = !$('custom-mode').checked;
    validateMinutes();
    if ($('custom-mode').checked) $('custom-minutes').focus();
  });
  $('custom-minutes').addEventListener('input', validateMinutes);
  function startGame() {
    validateMinutes();
    if (!$('setup-form').reportValidity()) return;
    const mode = new FormData($('setup-form')).get('seconds');
    const seconds = mode === 'custom' ? Math.round($('custom-minutes').valueAsNumber * 60) : Number(mode);
    game = new Game(seconds);
    resetCamera();
    ended = false; $('setup-dialog').close();
    sound('button'); message('蓝方先行，请在空交点落子。'); render();
  }
  // Static game hosts may sandbox form submission; start through a plain button.
  $('setup-start').onclick = startGame;
  $('setup-form').addEventListener('submit', event => {
    event.preventDefault(); startGame();
  });
  $('setup-form').addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      event.preventDefault(); startGame();
    }
  });
  $('setup-cancel').onclick = () => $('setup-dialog').close();
  $('help-close').onclick = () => $('help-dialog').close();
  $('resume-cancel').onclick = () => $('resume-dialog').close();
  $('pause').onclick = () => {
    if (!game || game.result) return;
    const changed = game.paused ? game.resume() : game.pause();
    if (changed) { sound('button'); message(`轮到${name(game.turn)}，请落子。`); }
    render();
  };
  $('pass').onclick = () => {
    const color = game.turn;
    if (game.pass()) { resetCamera(); sound('button'); message(`${name(color)}停一手，轮到${name(game.turn)}。`); }
    render();
  };
  $('undo').onclick = () => { if (game.undo()) { resetCamera(); sound('button'); message(`已撤销上一手，轮到${name(game.turn)}。`); } render(); };
  $('resign').onclick = () => confirmAction(`${name(game.turn)}确认认输？`, '认输后本局结束。确认期间仍在计时。', () => { game.resign(); render(); });
  for (const [color, id] of [[BLUE, 'confirm-blue'], [RED, 'confirm-red']]) $(id).onclick = () => {
    if (game?.confirmScore(color)) { resetCamera(); sound('button'); render(); }
  };
  $('resume-play').onclick = () => { if (game?.scoring) $('resume-dialog').showModal(); };
  for (const [color, id] of [[BLUE, 'resume-blue'], [RED, 'resume-red']]) $(id).onclick = () => {
    if (game?.resumePlay(color)) {
      $('resume-dialog').close(); resetCamera(); sound('button');
      message(`已恢复对弈，${name(color)}先行。`); render();
    }
  };
  $('help').onclick = () => $('help-dialog').showModal();
  $('sound').onclick = () => { soundEnabled = !soundEnabled; $('sound').textContent = soundEnabled ? '音效开' : '音效关'; $('sound').setAttribute('aria-pressed', String(soundEnabled)); };
  function tick() { if (game && !game.result && !game.scoring && !game.paused) { if (game.tick()) render(); else renderClock(); } }
  setInterval(tick, 100);
  requestAnimationFrame(animateProgress);
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('focus', tick);
  render();
  $('setup-dialog').showModal();
})();
