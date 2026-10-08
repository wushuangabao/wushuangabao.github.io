/* 棋盘视野与手势状态；独立于 DOM，拖动/长按绝不转换为落子。 */
(function (root) {
  'use strict';
  class BoardView {
    constructor(width, height) {
      this.boardWidth = width;
      this.boardHeight = height;
      this.reset();
    }
    reset() {
      this.zoomed = false;
      this.x = 0; this.y = 0;
      this.width = this.boardWidth; this.height = this.boardHeight;
      this.cancelPointer();
    }
    zoomAt(x, y, factor) {
      this.zoomed = true;
      this.width = this.boardWidth / factor;
      this.height = this.boardHeight / factor;
      this.x = x - this.width / 2;
      this.y = y - this.height / 2;
      this.clamp();
    }
    pan(dx, dy) {
      this.x -= dx; this.y -= dy;
      this.clamp();
    }
    clamp() {
      // 允许半幅留白，边缘落点也能位于视野中央。
      this.x = Math.max(-this.width / 2, Math.min(this.boardWidth - this.width / 2, this.x));
      this.y = Math.max(-this.height / 2, Math.min(this.boardHeight - this.height / 2, this.y));
    }
    get viewBox() { return `${this.x} ${this.y} ${this.width} ${this.height}`; }
    beginPointer(x, y, now, mouseDrag = false) {
      this.pointer = { x, y, lastX: x, lastY: y, time: now, mouseDrag, moved: false, dragging: false };
    }
    movePointer(x, y, now) {
      const p = this.pointer;
      if (!p) return null;
      if (Math.hypot(x - p.x, y - p.y) > 8) p.moved = true;
      if (this.zoomed && (p.mouseDrag || now - p.time >= 300) && p.moved) p.dragging = true;
      const delta = p.dragging ? { x: x - p.lastX, y: y - p.lastY } : null;
      p.lastX = x; p.lastY = y;
      return delta;
    }
    endPointer(x, y, now) {
      const p = this.pointer;
      if (!p) return false;
      this.movePointer(x, y, now);
      const tap = !p.moved && !p.dragging && now - p.time < 300;
      this.cancelPointer();
      return tap;
    }
    cancelPointer() { this.pointer = null; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { BoardView };
  else root.SixSideGoView = { BoardView };
})(globalThis);
