const IMAGE_WIDTH = 1672;
const IMAGE_HEIGHT = 941;
const OPENING_DURATION = 0.18;
const CITY_FRAMES = new Set(['01-city-rain.png', '02-city-clear.png']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// All coordinates follow the original artwork. Pane polygons stop inside the
// glazing: window frames, mullions, roofs and the scenery never move or glow.
const pane = (left, top, right, bottom) => [[left, top], [right, top], [right, bottom], [left, bottom]];
const BUILDINGS = [
  {
    id: 'left-foreground', center: [115, 310], welcome: true,
    polygon: [[0, 0], [285, 0], [285, 639], [0, 699]],
    panes: [
      [[85, 61], [142, 84], [142, 178], [85, 159]],
      [[85, 198], [142, 216], [142, 309], [85, 301]],
      [[85, 321], [142, 328], [142, 473], [85, 477]],
      [[165, 90], [178, 96], [178, 187], [165, 184]],
      [[165, 224], [178, 228], [178, 314], [165, 312]],
      [[165, 333], [178, 335], [178, 472], [165, 473]],
    ],
  },
  {
    id: 'left-white-house', center: [465, 511],
    polygon: [[285, 368], [383, 333], [510, 409], [506, 649], [423, 674], [286, 604]],
    panes: [pane(440, 440, 446, 487), pane(471, 438, 477, 485), pane(441, 539, 447, 580), pane(472, 535, 478, 578)],
  },
  {
    id: 'middle-white-house', center: [792, 607],
    polygon: [[770, 582], [816, 549], [879, 568], [886, 630], [811, 650], [772, 634]],
    panes: [pane(779, 590, 783, 611), pane(789, 594, 793, 616), pane(801, 596, 805, 618), pane(779, 618, 783, 628)],
  },
  {
    id: 'middle-cream-house', center: [945, 592],
    polygon: [[900, 547], [996, 493], [1042, 544], [1040, 633], [969, 653], [908, 630]],
    panes: [
      pane(918, 561, 922, 574), pane(918, 578, 922, 590),
      pane(940, 567, 945, 580), pane(940, 584, 945, 597),
      pane(956, 571, 960, 585), pane(956, 589, 960, 600),
      pane(1011, 574, 1017, 583), pane(1021, 574, 1027, 583),
      pane(1011, 588, 1017, 599), pane(1021, 588, 1027, 599),
    ],
    welcome: true,
  },
  {
    id: 'middle-red-house', center: [1091, 583],
    polygon: [[1037, 533], [1066, 481], [1112, 542], [1203, 543], [1203, 618], [1100, 646], [1043, 620]],
    panes: [
      pane(1059, 549, 1063, 561), pane(1059, 567, 1063, 588),
      pane(1078, 550, 1083, 562), pane(1078, 568, 1083, 591),
      pane(1185, 560, 1190, 570), pane(1195, 560, 1200, 570),
    ],
    welcome: true,
  },
  {
    id: 'middle-yellow-house', center: [1247, 553],
    polygon: [[1195, 497], [1286, 431], [1290, 632], [1206, 617]],
    panes: [pane(1223, 520, 1227, 531), pane(1223, 538, 1227, 555), pane(1264, 519, 1270, 530), pane(1275, 519, 1281, 530), pane(1264, 538, 1270, 559), pane(1275, 538, 1281, 560)],
  },
  {
    id: 'blue-house', center: [1350, 478],
    polygon: [[1274, 372], [1333, 202], [1407, 357], [1498, 355], [1500, 601], [1420, 643], [1282, 622]],
    panes: [
      pane(1318, 339, 1324, 358), pane(1328, 338, 1332, 357),
      pane(1318, 367, 1324, 411), pane(1328, 367, 1332, 412),
      pane(1355, 336, 1361, 356), pane(1365, 335, 1369, 355),
      pane(1355, 365, 1361, 411), pane(1365, 365, 1369, 411),
      pane(1321, 494, 1332, 513), pane(1340, 495, 1349, 514), pane(1357, 497, 1367, 516),
      pane(1321, 524, 1332, 574), pane(1340, 526, 1349, 576), pane(1357, 527, 1367, 579),
    ],
  },
  {
    id: 'right-red-house', center: [1605, 453],
    polygon: [[1493, 305], [1672, 274], [1672, 611], [1507, 583]],
    panes: [pane(1620, 351, 1630, 388), pane(1636, 350, 1650, 387), pane(1620, 403, 1630, 487), pane(1636, 402, 1650, 486)],
  },
];

function sourcePoint(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y)
    ? { x: p.x * IMAGE_WIDTH, y: p.y * IMAGE_HEIGHT } : null;
}
function inside(point, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point.y) !== (b[1] > point.y)
      && point.x < (b[0] - a[0]) * (point.y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function distanceToPolygon(point, polygon) {
  if (inside(point, polygon)) return 0;
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((point.x - a[0]) * dx + (point.y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    distance = Math.min(distance, Math.hypot(point.x - a[0] - dx * t, point.y - a[1] - dy * t));
  }
  return distance;
}

export class CityWindows {
  constructor() {
    this.keyPoints = BUILDINGS.map((building, index) => ({ index, id: building.id, x: building.center[0] / IMAGE_WIDTH, y: building.center[1] / IMAGE_HEIGHT }));
    this.keyPoint = { x: 945 / IMAGE_WIDTH, y: 592 / IMAGE_HEIGHT };
    this.active = false;
    this.file = '';
    this.image = null;
    this.values = BUILDINGS.map(() => 0);
    this.reset();
  }
  configure(file, image) {
    this.reset();
    this.file = String(file || '').split(/[?#]/, 1)[0].split(/[\\/]/).pop();
    this.image = image || null;
    this.active = CITY_FRAMES.has(this.file) && !!image && (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0;
    return this.active;
  }
  reset() {
    this.hovered = -1;
    this.pressed = -1;
    this.pointer = null;
    this.pressOrigin = null;
    this.triggerIndex = -1;
    this.activationReady = false;
    this.openingElapsed = -1;
    this.openingDelivered = false;
    this.values.fill(0);
  }
  hit(p) {
    const point = sourcePoint(p);
    if (!this.active || !point) return -1;
    for (let index = BUILDINGS.length - 1; index >= 0; index--) {
      if (inside(point, BUILDINGS[index].polygon)) return index;
    }
    return -1;
  }
  move(p, _dx = 0, _dy = 0) {
    this.pointer = sourcePoint(p) ? { x: p.x, y: p.y } : null;
    const next = this.hit(this.pointer);
    const point = sourcePoint(this.pointer);
    // Once a drag leaves its original facade or travels beyond tap slop, it
    // cannot turn into an entry even when the pointer returns before release.
    if (this.pressed >= 0 && (next !== this.pressed || !point
      || Math.hypot(point.x - this.pressOrigin.x, point.y - this.pressOrigin.y) > 16)) this.pressed = -1;
    this.hovered = next;
    return next;
  }
  down(p) {
    if (!this.active || this.openingElapsed >= 0 || this.openingDelivered || this.pressed >= 0) return false;
    this.move(p);
    if (this.hovered < 0) return false;
    this.pressed = this.hovered;
    this.pressOrigin = sourcePoint(p);
    this.activationReady = false;
    return true;
  }
  up(cancel = false) {
    const index = this.pressed;
    this.pressed = -1;
    this.pressOrigin = null;
    this.activationReady = false;
    if (cancel || index < 0 || this.hit(this.pointer) !== index || this.openingElapsed >= 0 || this.openingDelivered) return false;
    this.triggerIndex = index;
    this.activationReady = true;
    return true;
  }
  startOpening() {
    if (!this.active || this.openingElapsed >= 0 || this.openingDelivered) return false;
    if (!this.activationReady) this.triggerIndex = this.hovered >= 0 ? this.hovered : this.hit(this.keyPoint);
    if (this.triggerIndex < 0) return false;
    this.activationReady = false;
    this.openingElapsed = 0;
    return true;
  }
  advance(dt, reduced = false) {
    const elapsed = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    const point = sourcePoint(this.pointer);
    const opening = this.openingElapsed >= 0;
    for (let index = 0; index < BUILDINGS.length; index++) {
      const distance = point ? distanceToPolygon(point, BUILDINGS[index].polygon) : Infinity;
      let target = Math.max(index === this.hovered ? 0.78 : 0, Math.max(0, 1 - distance / 80) * 0.32);
      if (index === this.pressed || (opening && index === this.triggerIndex)) target = 1;
      // A retargetable color settle, with no oscillation or perpetual idle pulse.
      const blend = reduced ? 1 : 1 - Math.exp(-elapsed / (target > this.values[index] ? 0.09 : 0.18));
      this.values[index] += (target - this.values[index]) * blend;
    }
    if (opening) {
      this.openingElapsed = reduced ? OPENING_DURATION : this.openingElapsed + elapsed;
      if (this.openingElapsed >= OPENING_DURATION) {
        this.openingElapsed = -1;
        this.openingDelivered = true;
        return true;
      }
    }
    return false;
  }
  leave() {
    this.hovered = -1;
    this.pressed = -1;
    this.pointer = null;
    this.pressOrigin = null;
    this.activationReady = false;
  }
  draw(ctx, camera, width, height) {
    if (!this.active || !ctx || !camera?.sw || !camera?.sh || width <= 0 || height <= 0) return;
    const rainy = this.file === '01-city-rain.png';
    ctx.save();
    ctx.translate(-camera.sx * width / camera.sw, -camera.sy * height / camera.sh);
    ctx.scale(width / camera.sw, height / camera.sh);
    for (let index = 0; index < BUILDINGS.length; index++) {
      const building = BUILDINGS[index];
      const amount = this.values[index];
      for (let j = 0; j < building.panes.length; j++) {
        // Steady welcoming rooms remain visible in the central phone crop.
        const welcome = building.welcome && j < 4;
        const idle = welcome ? (rainy ? 0.16 : 0.12) : 0;
        const alpha = idle + amount * (rainy ? 0.23 : 0.19) * (j % 3 === 0 ? 1 : 0.8);
        if (alpha < 0.002) continue;
        const points = building.panes[j];
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let n = 1; n < points.length; n++) ctx.lineTo(points[n][0], points[n][1]);
        ctx.closePath();
        ctx.fillStyle = rainy || welcome ? `rgba(255, 207, 128, ${alpha})` : `rgba(204, 230, 242, ${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }
  measure() {
    return {
      active: this.active,
      file: this.file,
      hovered: this.hovered < 0 ? null : BUILDINGS[this.hovered].id,
      pressed: this.pressed < 0 ? null : BUILDINGS[this.pressed].id,
      activation: {
        building: this.triggerIndex < 0 ? null : BUILDINGS[this.triggerIndex].id,
        opening: this.openingElapsed >= 0,
        openingProgress: this.openingElapsed < 0 ? 0 : clamp(this.openingElapsed / OPENING_DURATION, 0, 1),
        delivered: this.openingDelivered,
      },
      keys: BUILDINGS.map((building, index) => ({
        id: building.id, center: this.keyPoints[index], hovered: index === this.hovered,
        pressed: index === this.pressed, amount: +this.values[index].toFixed(3),
        panes: building.panes.length, welcoming: !!building.welcome,
      })),
    };
  }
}
