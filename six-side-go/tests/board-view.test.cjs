const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BoardView } = require('../src/board-view.js');

test('首次点按以原点击位置居中放大，边缘点也可居中，重置恢复全盘', () => {
  const view = new BoardView(620, 692);
  for (const [x, y] of [[310, 346], [15, 20], [610, 680]]) {
    view.zoomAt(x, y, 4);
    assert.equal(view.x + view.width / 2, x);
    assert.equal(view.y + view.height / 2, y);
    assert.equal(view.width, 155);
    view.reset();
    assert.equal(view.viewBox, '0 0 620 692');
    assert.equal(view.zoomed, false);
  }
});

test('短点按允许激活，轻微手抖容忍，长按松手不能落子', () => {
  const view = new BoardView(620, 692);
  view.beginPointer(100, 100, 0);
  assert.equal(view.endPointer(103, 102, 150), true);
  view.beginPointer(100, 100, 200);
  assert.equal(view.endPointer(100, 100, 500), false);
});

test('快速滑动取消点按，拖走再回原处也不能落子', () => {
  const view = new BoardView(620, 692);
  view.beginPointer(100, 100, 0);
  view.movePointer(130, 140, 100);
  assert.equal(view.endPointer(100, 100, 200), false);
  assert.equal(view.endPointer(100, 100, 220), false);
});

test('放大后长按拖动返回位移，移动视野后松手不会落子', () => {
  const view = new BoardView(620, 692);
  view.zoomAt(310, 346, 4);
  view.beginPointer(100, 100, 0);
  assert.equal(view.movePointer(102, 102, 200), null);
  const delta = view.movePointer(152, 122, 350);
  assert.deepEqual(delta, { x: 50, y: 20 });
  view.pan(delta.x, delta.y);
  assert.equal(view.x + view.width / 2, 260);
  assert.equal(view.y + view.height / 2, 326);
  assert.equal(view.endPointer(152, 122, 400), false);
});

test('全盘状态下滑动不移动视野，取消事件和状态重置使旧手势失效', () => {
  const view = new BoardView(620, 692);
  view.beginPointer(100, 100, 0);
  assert.equal(view.movePointer(150, 150, 500), null);
  assert.equal(view.endPointer(150, 150, 600), false);
  view.beginPointer(100, 100, 1000);
  view.cancelPointer();
  assert.equal(view.endPointer(100, 100, 1100), false);
  view.beginPointer(100, 100, 1200);
  view.reset();
  assert.equal(view.endPointer(100, 100, 1300), false);
});

test('拖动限制在棋盘附近，不能把整盘永久拖出视野', () => {
  const view = new BoardView(620, 692);
  view.zoomAt(310, 346, 4);
  view.pan(100000, 100000);
  assert.equal(view.x + view.width / 2, 0);
  assert.equal(view.y + view.height / 2, 0);
  view.pan(-100000, -100000);
  assert.equal(view.x + view.width / 2, 620);
  assert.equal(view.y + view.height / 2, 692);
});

test('鼠标拖动无需等待长按，松开也不会触发落子', () => {
  const view = new BoardView(620, 692);
  view.zoomAt(310, 346, 4);
  view.beginPointer(100, 100, 0, true);
  assert.deepEqual(view.movePointer(140, 120, 100), { x: 40, y: 20 });
  assert.equal(view.endPointer(140, 120, 120), false);
});
