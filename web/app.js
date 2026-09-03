// app.js
//
// The canvas itself: what is on it, what is selected, where the view is
// looking, how the mouse interacts with it, and the undo history.
//
// Nothing here knows about voice, intents or slots. That is commands.js.


var stage = document.getElementById('stage');
var scene = document.getElementById('scene');
var statusBox = document.getElementById('status');
var logBox = document.getElementById('log');

var SVG_NS = 'http://www.w3.org/2000/svg';
var HOME_VIEW = { x: 0, y: 0, w: 800, h: 600 };

var state = {
  view: { x: 0, y: 0, w: 800, h: 600 },
  selection: []
};

var COLOR_HEX = {
  red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e',
  blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899', brown: '#92400e',
  black: '#18181b', white: '#ffffff', gray: '#9ca3af', teal: '#14b8a6',
  cyan: '#06b6d4', magenta: '#d946ef'
};


// ------------------------------------------------------------------ viewport
//
// Pan and zoom are one SVG attribute: viewBox = "x y width height".
// It says which rectangle of the drawing to show. No shape is touched, which
// is right -- the design does not change when you look at it differently.

function applyView() {
  var v = state.view;
  stage.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
}

function panBy(fractionX, fractionY) {
  state.view.x = state.view.x + state.view.w * fractionX;
  state.view.y = state.view.y + state.view.h * fractionY;
  applyView();
}

// factor < 1 zooms in, factor > 1 zooms out. The centre stays put.
function zoomBy(factor) {
  var v = state.view;
  var centreX = v.x + v.w / 2;
  var centreY = v.y + v.h / 2;
  v.w = v.w * factor;
  v.h = v.h * factor;
  v.x = centreX - v.w / 2;
  v.y = centreY - v.h / 2;
  applyView();
}

function resetView() {
  state.view = { x: HOME_VIEW.x, y: HOME_VIEW.y, w: HOME_VIEW.w, h: HOME_VIEW.h };
  applyView();
}

function fitView() {
  var box = scene.getBBox();
  if (box.width === 0 || box.height === 0) {
    resetView();
    return;
  }
  var padding = 40;
  state.view = {
    x: box.x - padding,
    y: box.y - padding,
    w: box.width + padding * 2,
    h: box.height + padding * 2
  };
  applyView();
}

// Mix a colour toward white or black.
//   amount  +1 = white, 0 = unchanged, -1 = black
// One function covers both the light/dark words the classifier produces and
// the continuous slider in the toolbar, so they can never disagree.
function mixHex(hex, amount) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);

  var towards = (amount >= 0) ? 255 : 0;
  var strength = Math.abs(amount);

  r = Math.round(r + (towards - r) * strength);
  g = Math.round(g + (towards - g) * strength);
  b = Math.round(b + (towards - b) * strength);

  function pair(value) {
    var text = value.toString(16);
    return text.length === 1 ? '0' + text : text;
  }
  return '#' + pair(r) + pair(g) + pair(b);
}

// "light blue" and "dark blue" are fixed points on that same scale.
function colourFor(name, shade) {
  var hex = COLOR_HEX[name];
  if (!hex || !shade) return hex;
  return mixHex(hex, shade === 'light' ? 0.5 : -0.4);
}

function viewCentre() {
  return { x: state.view.x + state.view.w / 2, y: state.view.y + state.view.h / 2 };
}


// ----------------------------------------------------------------- transforms
//
// Every shape stores its position, rotation and scale as four data attributes,
// and one function turns those into the SVG transform string. Keeping the
// numbers separate from the string means a command can change rotation without
// having to parse and rebuild everything else.

function readTransform(shape) {
  return {
    tx:  parseFloat(shape.getAttribute('data-tx')  || '0'),
    ty:  parseFloat(shape.getAttribute('data-ty')  || '0'),
    rot: parseFloat(shape.getAttribute('data-rot') || '0'),
    sx:  parseFloat(shape.getAttribute('data-sx')  || '1'),
    sy:  parseFloat(shape.getAttribute('data-sy')  || '1')
  };
}

function writeTransform(shape, t) {
  shape.setAttribute('data-tx', t.tx);
  shape.setAttribute('data-ty', t.ty);
  shape.setAttribute('data-rot', t.rot);
  shape.setAttribute('data-sx', t.sx);
  shape.setAttribute('data-sy', t.sy);

  // Rotation and scale happen around the shape's own centre, otherwise a
  // rotated shape also swings across the canvas. getBBox() ignores the
  // element's own transform, so this centre stays stable.
  var box = shape.getBBox();
  var cx = box.x + box.width / 2;
  var cy = box.y + box.height / 2;

  shape.setAttribute('transform',
    'translate(' + t.tx + ',' + t.ty + ') ' +
    'rotate(' + t.rot + ',' + cx + ',' + cy + ') ' +
    'translate(' + cx + ',' + cy + ') ' +
    'scale(' + t.sx + ',' + t.sy + ') ' +
    'translate(' + (-cx) + ',' + (-cy) + ')');
}

function moveShapeBy(shape, dx, dy) {
  var t = readTransform(shape);
  t.tx = t.tx + dx;
  t.ty = t.ty + dy;
  writeTransform(shape, t);
}

function rotateShapeBy(shape, degrees) {
  var t = readTransform(shape);
  t.rot = t.rot + degrees;
  writeTransform(shape, t);
}

function scaleShapeBy(shape, factor) {
  var t = readTransform(shape);
  t.sx = t.sx * factor;
  t.sy = t.sy * factor;
  writeTransform(shape, t);
}

// Flipping is scaling by -1 on one axis. Nothing else needed.
function flipShape(shape, axis) {
  var t = readTransform(shape);
  if (axis === 'vertical') {
    t.sy = t.sy * -1;
  } else {
    t.sx = t.sx * -1;
  }
  writeTransform(shape, t);
}

// Set a shape's size directly, in canvas units. Any accumulated scale is
// folded away first, so the number you type is the number you get -- otherwise
// "width 200" on a shape already scaled to 133% would land at 266.
function setShapeSize(shape, width, height) {
  var kind = shape.getAttribute('data-kind');
  var t = readTransform(shape);
  t.sx = 1;
  t.sy = 1;

  if (kind === 'rectangle') {
    shape.setAttribute('width', Math.max(1, width));
    shape.setAttribute('height', Math.max(1, height));
  } else if (kind === 'circle') {
    shape.setAttribute('r', Math.max(1, Math.min(width, height) / 2));
  } else if (kind === 'text') {
    shape.setAttribute('font-size', Math.max(4, height));
  }

  writeTransform(shape, t);
}

// Move a shape so its top-left corner lands exactly here.
function setShapePosition(shape, x, y) {
  var box = sceneBox(shape);
  moveShapeBy(shape, x - box.x, y - box.y);
}

// When a shape leaves a group, it loses the group's transform and snaps back
// to where it was before grouping. This folds the group's transform into the
// child so it stays exactly where it appears.
//
// The matrix is taken apart into the translate/rotate/scale numbers the rest
// of the code works with: rotation from the angle of the first column, scale
// from its length, and translation from whatever is left over once rotation
// and scale are accounted for.
function bakeParentTransform(child, parentMatrix) {
  var own = child.transform.baseVal.consolidate();
  var childMatrix = own ? own.matrix : null;

  var combined = new DOMMatrix([parentMatrix.a, parentMatrix.b, parentMatrix.c,
                                parentMatrix.d, parentMatrix.e, parentMatrix.f]);
  if (childMatrix) {
    combined = combined.multiply(new DOMMatrix([childMatrix.a, childMatrix.b,
                                                childMatrix.c, childMatrix.d,
                                                childMatrix.e, childMatrix.f]));
  }

  var scaleX = Math.sqrt(combined.a * combined.a + combined.b * combined.b);
  var rotation = Math.atan2(combined.b, combined.a) * 180 / Math.PI;
  var determinant = combined.a * combined.d - combined.b * combined.c;
  var scaleY = (scaleX === 0) ? 1 : determinant / scaleX;

  var box = child.getBBox();
  var cx = box.x + box.width / 2;
  var cy = box.y + box.height / 2;

  // What rotation and scale alone would contribute, so the remainder is the
  // translation we need.
  var spun = new DOMMatrix()
    .translate(cx, cy)
    .rotate(rotation)
    .scale(scaleX, scaleY)
    .translate(-cx, -cy);

  writeTransform(child, {
    tx: combined.e - spun.e,
    ty: combined.f - spun.f,
    rot: rotation,
    sx: scaleX,
    sy: scaleY
  });
}

function moveSelectionBy(dx, dy) {
  for (var i = 0; i < state.selection.length; i++) {
    moveShapeBy(state.selection[i], dx, dy);
  }
}

// Where a shape actually sits on the canvas, after its transform is applied.
// getBBox() alone gives the untransformed geometry, so the four corners have
// to be pushed through the transform matrix and re-bounded.
function sceneBox(shape) {
  var b = shape.getBBox();
  var list = shape.transform.baseVal;
  var matrix = null;

  if (list.numberOfItems > 0) {
    var consolidated = list.consolidate();
    if (consolidated) {
      matrix = consolidated.matrix;
    }
  }

  if (!matrix) {
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  var corners = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height]
  ];

  var xs = [];
  var ys = [];
  for (var i = 0; i < corners.length; i++) {
    xs.push(matrix.a * corners[i][0] + matrix.c * corners[i][1] + matrix.e);
    ys.push(matrix.b * corners[i][0] + matrix.d * corners[i][1] + matrix.f);
  }

  var minX = Math.min.apply(null, xs);
  var maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  var maxY = Math.max.apply(null, ys);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}


// ----------------------------------------------------------------- the shapes
//
// Only direct children of the scene count as shapes. Anything inside a group
// belongs to that group, and the group is what you select and move.

function allShapes() {
  var list = [];
  var children = scene.children;
  for (var i = 0; i < children.length; i++) {
    if (children[i].hasAttribute('data-kind')) {
      list.push(children[i]);
    }
  }
  return list;
}

function shapesWithColor(color) {
  var list = [];
  var shapes = allShapes();
  for (var i = 0; i < shapes.length; i++) {
    if (shapes[i].getAttribute('data-color') === color) {
      list.push(shapes[i]);
    }
  }
  return list;
}

function shapesOfKind(kind) {
  var list = [];
  var shapes = allShapes();
  for (var i = 0; i < shapes.length; i++) {
    if (shapes[i].getAttribute('data-kind') === kind) {
      list.push(shapes[i]);
    }
  }
  return list;
}

function isLocked(shape) {
  return shape.getAttribute('data-locked') === 'true';
}


// -------------------------------------------------------------- the selection

function setSelection(shapes) {
  state.selection = shapes.slice();
  refreshSelection();
}

function addToSelection(shapes) {
  for (var i = 0; i < shapes.length; i++) {
    if (state.selection.indexOf(shapes[i]) === -1) {
      state.selection.push(shapes[i]);
    }
  }
  refreshSelection();
}

function clearSelection() {
  state.selection = [];
  refreshSelection();
}

// Drop anything that is no longer on the canvas -- deleted, or absorbed
// into a group.
function pruneSelection() {
  var kept = [];
  for (var i = 0; i < state.selection.length; i++) {
    if (state.selection[i].parentNode === scene) {
      kept.push(state.selection[i]);
    }
  }
  state.selection = kept;
  refreshSelection();
}

function refreshSelection() {
  var everything = scene.querySelectorAll('[data-kind]');
  for (var i = 0; i < everything.length; i++) {
    everything[i].classList.remove('selected');
  }
  for (var j = 0; j < state.selection.length; j++) {
    state.selection[j].classList.add('selected');
  }
  updateStatus();
  if (window.refreshUI) window.refreshUI();
}

function updateStatus() {
  var count = state.selection.length;
  if (count === 0) {
    statusBox.textContent = 'nothing selected';
    return;
  }
  var kinds = [];
  for (var i = 0; i < state.selection.length; i++) {
    var kind = state.selection[i].getAttribute('data-kind');
    if (kinds.indexOf(kind) === -1) {
      kinds.push(kind);
    }
  }
  statusBox.textContent = count + ' selected (' + kinds.join(', ') + ')';
}


// ------------------------------------------------------------- undo and redo
//
// The simplest history that works: before anything changes, save the scene's
// markup as a string. Undo puts an old string back.
//
// Wasteful in principle -- a full copy for a one-pixel nudge -- but the scene
// is a few kilobytes, and it cannot get out of step with the canvas the way a
// list of reversible operations can.

var editHistory = { past: [], future: [] };

function snapshot() {
  editHistory.past.push(scene.innerHTML);
  if (editHistory.past.length > 50) {
    editHistory.past.shift();
  }
  editHistory.future = [];      // a new action invalidates anything redone
}

function undo() {
  if (editHistory.past.length === 0) return false;
  editHistory.future.push(scene.innerHTML);
  scene.innerHTML = editHistory.past.pop();
  clearSelection();
  return true;
}

function redo() {
  if (editHistory.future.length === 0) return false;
  editHistory.past.push(scene.innerHTML);
  scene.innerHTML = editHistory.future.pop();
  clearSelection();
  return true;
}


// ---------------------------------------------------------------------- mouse

function toDrawingPoint(event) {
  var point = stage.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(stage.getScreenCTM().inverse());
}

var drag = { active: false, moved: false, lastX: 0, lastY: 0 };

// Dragging empty canvas pans the view. Deliberately a one-handed gesture:
// the usual convention is hold space and drag, which is exactly the kind of
// two-handed shortcut this tool exists to avoid.
var viewDrag = { active: false, moved: false, lastX: 0, lastY: 0 };

stage.addEventListener('mousedown', function (event) {
  var hit = event.target.closest('[data-kind]');

  // Clicking something inside a group selects the group, not the child.
  var shape = hit;
  while (shape && shape.parentNode !== scene) {
    shape = shape.parentNode.closest ? shape.parentNode.closest('[data-kind]') : null;
  }

  if (!shape) {
    viewDrag.active = true;
    viewDrag.moved = false;
    viewDrag.lastX = event.clientX;
    viewDrag.lastY = event.clientY;
    event.preventDefault();
    return;
  }

  if (isLocked(shape)) {
    return;
  }

  if (event.shiftKey) {
    addToSelection([shape]);
  } else if (state.selection.indexOf(shape) === -1) {
    setSelection([shape]);
  }

  var point = toDrawingPoint(event);
  drag.active = true;
  drag.moved = false;
  drag.lastX = point.x;
  drag.lastY = point.y;
  event.preventDefault();
});

window.addEventListener('mousemove', function (event) {
  if (viewDrag.active) {
    // Screen pixels are not canvas units once you have zoomed, so convert.
    var perPixel = state.view.w / stage.clientWidth;
    var dx = (event.clientX - viewDrag.lastX) * perPixel;
    var dy = (event.clientY - viewDrag.lastY) * perPixel;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) viewDrag.moved = true;

    state.view.x = state.view.x - dx;   // content follows the cursor
    state.view.y = state.view.y - dy;
    applyView();

    viewDrag.lastX = event.clientX;
    viewDrag.lastY = event.clientY;
    return;
  }

  if (!drag.active) return;

  if (!drag.moved) {
    snapshot();          // record the state before the first movement
    drag.moved = true;
  }

  var point = toDrawingPoint(event);
  moveSelectionBy(point.x - drag.lastX, point.y - drag.lastY);
  drag.lastX = point.x;
  drag.lastY = point.y;
});

window.addEventListener('mouseup', function () {
  if (viewDrag.active) {
    // A click that never moved was a click on empty space, not a pan.
    if (!viewDrag.moved) clearSelection();
    viewDrag.active = false;
    return;
  }
  if (drag.moved && window.refreshUI) window.refreshUI();
  drag.active = false;
});


// ------------------------------------------------------------------ the log

function log(phrase, intent, slots, outcome, isWarning) {
  var entry = document.createElement('div');
  entry.className = 'entry';

  var slotText = JSON.stringify(slots);
  if (slotText === '{}') {
    slotText = 'no slots';
  }

  entry.innerHTML =
    '<div class="phrase"></div>' +
    '<div class="detail"></div>' +
    '<div class="' + (isWarning ? 'warn' : 'ok') + '"></div>';

  // textContent rather than innerHTML, so a typed phrase can never be
  // interpreted as markup
  entry.children[0].textContent = phrase;
  entry.children[1].textContent = intent + ' · ' + slotText;
  entry.children[2].textContent = outcome;

  logBox.insertBefore(entry, logBox.firstChild);
}


// --------------------------------------------------- give the starting shapes
// their transform attributes, so the first command finds what it expects

(function initialise() {
  var shapes = allShapes();
  for (var i = 0; i < shapes.length; i++) {
    writeTransform(shapes[i], readTransform(shapes[i]));
  }
  applyView();
  refreshSelection();
})();
