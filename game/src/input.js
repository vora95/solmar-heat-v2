// input.js — keyboard + mouse, with edge-triggered presses (E, F, G, P, M).
export const input = {
  up: false, down: false, left: false, right: false, handbrake: false,
  mouseX: 0, mouseY: 0, mouseDown: false,
  pressed: new Set(),
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake',
};

export function bindInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const k = KEYMAP[e.code];
    if (k) input[k] = true;
    if (!e.repeat) input.pressed.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) input[k] = false;
  });
  canvas.addEventListener('mousemove', (e) => { input.mouseX = e.clientX; input.mouseY = e.clientY; });
  canvas.addEventListener('mousedown', () => { input.mouseDown = true; input.pressed.add('Mouse0'); });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  window.addEventListener('blur', () => { input.up = input.down = input.left = input.right = input.handbrake = false; });
}

export function wasPressed(code) {
  return input.pressed.has(code);
}
export function endFrame() {
  input.pressed.clear();
}
