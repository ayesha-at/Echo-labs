// ============================================================
// LEVELS — level data. Movers derive position purely from
// time-within-cycle so loops stay perfectly synced with echoes.
// Append new entries here to grow the campaign; no engine
// changes needed.
// ============================================================
window.EL = window.EL || {};

(function () {
  const GROUND = { x: 0, y: 400, w: 800, h: 50 };

  EL.Levels = [
    {
      name: '1 · First Steps',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND],
      movers: [], buttons: [], doors: [], lasers: [], boxes: [],
      hint: 'A / D to move, Space to jump. Reach the glowing exit.',
      par: { time: 6, echoes: 0 },
    },
    {
      name: '2 · Echo Basics',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND],
      movers: [],
      buttons: [{ id: 'p1', x: 160, y: 380, w: 60, h: 20 }],
      doors: [{ id: 'd1', x: 500, y: 300, w: 20, h: 100, requires: ['p1'] }],
      lasers: [],
      boxes: [],
      hint: 'Stand on the plate, then wait — your NEXT self will stay there.',
      par: { time: 14, echoes: 1 },
    },
    {
      name: '3 · Moving Platforms',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 200, w: 40, h: 48 },
      platforms: [GROUND, { x: 700, y: 250, w: 100, h: 20 }],
      movers: [{ id: 'm1', x: 200, y: 340, w: 90, h: 18, axis: 'x', distance: 380, period: 5 }],
      buttons: [], doors: [], lasers: [], boxes: [],
      hint: 'Ride the moving platform up and across to the exit.',
      par: { time: 12, echoes: 0 },
    },
    {
      name: '4 · Laser Gate',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND],
      movers: [],
      buttons: [{ id: 'p1', x: 120, y: 380, w: 55, h: 20 }],
      doors: [],
      lasers: [{ id: 'l1', x1: 420, y1: 340, x2: 420, y2: 400, requires: 'p1' }],
      boxes: [],
      hint: 'Hold the plate to power down the laser so your next self can pass.',
      par: { time: 14, echoes: 1 },
    },
    {
      name: '5 · Push',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND],
      movers: [],
      buttons: [{ id: 'p1', x: 430, y: 380, w: 55, h: 20 }],
      doors: [{ id: 'd1', x: 560, y: 300, w: 20, h: 100, requires: ['p1'] }],
      lasers: [],
      boxes: [{ id: 'b1', x: 260, y: 362, w: 34, h: 34 }],
      hint: 'Push the box onto the plate to unlock the door.',
      par: { time: 12, echoes: 0 },
    },
    {
      name: '6 · Two Echoes',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND],
      movers: [],
      buttons: [
        { id: 'p1', x: 130, y: 380, w: 55, h: 20 },
        { id: 'p2', x: 330, y: 380, w: 55, h: 20 },
      ],
      doors: [
        { id: 'd1', x: 250, y: 300, w: 20, h: 100, requires: ['p1'] },
        { id: 'd2', x: 560, y: 300, w: 20, h: 100, requires: ['p2'] },
      ],
      lasers: [],
      boxes: [],
      hint: 'Two plates, two doors. You will need two echoes working together.',
      par: { time: 22, echoes: 2 },
    },
    {
      name: '7 · Elevator Timing',
      cycleSeconds: 12,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 150, w: 40, h: 48 },
      platforms: [
        GROUND,
        { x: 700, y: 200, w: 100, h: 20 },
      ],
      movers: [{ id: 'm1', x: 560, y: 340, w: 70, h: 18, axis: 'y', distance: 80, period: 12 }],
      buttons: [{ id: 'p1', x: 90, y: 380, w: 50, h: 20 }],
      doors: [{ id: 'd1', x: 220, y: 260, w: 20, h: 140, requires: ['p1'] }],
      lasers: [],
      boxes: [],
      hint: 'Hold the gate open, then hop on the elevator — it stays low most of the loop.',
      par: { time: 24, echoes: 1 },
    },
    {
      name: '8 · Three Echoes',
      cycleSeconds: 10,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 352, w: 40, h: 48 },
      platforms: [GROUND, { x: 600, y: 250, w: 100, h: 20 }],
      movers: [{ id: 'm1', x: 480, y: 350, w: 70, h: 18, axis: 'y', distance: 80, period: 12 }],
      buttons: [
        { id: 'p1', x: 80, y: 380, w: 50, h: 20 },
        { id: 'p2', x: 300, y: 380, w: 50, h: 20 },
        { id: 'p3', x: 660, y: 228, w: 30, h: 20 },
      ],
      doors: [
        { id: 'd1', x: 190, y: 100, w: 20, h: 300, requires: ['p1'] },
        { id: 'd2', x: 400, y: 100, w: 20, h: 300, requires: ['p1', 'p2'] },
      ],
      lasers: [
	{ id: 'l1', x1: 250, y1: 0, x2: 250, y2: 400, requires: ['p1'] },
        { id: 'l2', x1: 720, y1: 0, x2: 720, y2: 400, requires: ['p3'] },
],
      boxes: [{ id: 'b1', x: 610, y: 220, w: 25, h: 25 }],
      hint: 'Doors need multiple plates held at once. Plan three runs ahead.',
      par: { time: 30, echoes: 3 },
    },
    {
      name: '9 · Escape',
      cycleSeconds: 16,
      spawn: { x: 40, y: 350 },
      exit: { x: 742, y: 150, w: 40, h: 48 },
      platforms: [
        GROUND,
        { x: 700, y: 200, w: 100, h: 20 },
      ],
      movers: [{ id: 'm1', x: 600, y: 340, w: 70, h: 18, axis: 'y', distance: 80, period: 16 }],
      buttons: [
        { id: 'p1', x: 70, y: 380, w: 40, h: 20 },
        { id: 'p2', x: 230, y: 380, w: 40, h: 20 },
        { id: 'p3', x: 330, y: 380, w: 40, h: 20 },
        { id: 'p4', x: 420, y: 380, w: 40, h: 20 },
        { id: 'p5', x: 510, y: 380, w: 40, h: 20 },
      ],
      doors: [
        { id: 'd1', x: 125, y: 0, w: 20, h: 400, requires: ['p1'] },
        { id: 'd2', x: 560, y: 0, w: 20, h: 400, requires: ['p3', 'p4', 'p5'] },
      ],
      lasers: [{ id: 'l1', x1: 300, y1: 0, x2: 300, y2: 400, requires: 'p2' }],
      boxes: [{ id: 'b1', x: 150, y: 366, w: 34, h: 34 }],
      hint: 'Bank an echo on each plate, push the box onto the middle plate, then make your final run.',
      par: { time: 90, echoes: 4 },
    },
  ];
})();