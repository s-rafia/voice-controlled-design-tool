// app.js
//
// The canvas itself: what is on it, what is selected, where the view is
// looking, and how the mouse interacts with it.
//
// Nothing here knows about voice, intents or slots. That is commands.js.


var stage = document.getElementById('stage');
var scene = document.getElementById('scene');
var statusBox = document.getElementById('status');
var logBox = document.getElementById('log');

var HOME_VIEW = { x: 0, y: 0, w: 800, h: 600 };

var state = {
  view: { x: 0, y: 0, w: 800, h: 600 },
  selection: []
};


// ------------------------------------------------------------------ viewport
//
// Pan and zoom are one SVG attribute: viewBox = "x y width height".
// It says which rectangle of the drawing to show. Move x and y and the
// picture appears to pan. Shrink width and height and it appears to zoom in.
// No shape is touched, which is exactly right -- the design does not change
// when you look at it differently.

function applyView() {
  var v = state.view;
  stage.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
}

function panBy(fractionX, fractionY) {
  state.view.x = state.view.x + state.view.w * fractionX;
  state.view.y = state.view.y + state.view.h * fractionY;
  applyView();
}

// factor < 1 zooms in, factor > 1 zooms out.
// Zooming keeps the centre of the view fixed, which is what people expect.
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
  var box = scene.getBBox();          // smallest rectangle containing everything
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


// ----------------------------------------------------------------- the shapes

function allShapes() {
  // querySelectorAll returns a NodeList, which is not quite an array,
  // so copy it into a real one.
  var found = scene.querySelectorAll('[data-kind]');
  var list = [];
  for (var i = 0; i < found.length; i++) {
    list.push(found[i]);
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


// -------------------------------------------------------------- the selection

function setSelection(shapes) {
  state.selection = shapes.slice();   // slice() copies the array
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

// Redraw the highlight. Rather than drawing outlines ourselves, we add a CSS
// class and let the browser do it -- one class on, one class off.
function refreshSelection() {
  var shapes = allShapes();
  for (var i = 0; i < shapes.length; i++) {
    shapes[i].classList.remove('selected');
  }
  for (var j = 0; j < state.selection.length; j++) {
    state.selection[j].classList.add('selected');
  }
  updateStatus();
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


// ------------------------------------------------------------------- movement
//
// Every shape carries transform="translate(dx,dy)". Moving one means changing
// those two numbers. Doing it this way means one function moves rectangles,
// circles and text alike -- otherwise rectangles need x/y, circles need cx/cy,
// and every command would need three versions.

function getOffset(shape) {
  var transform = shape.getAttribute('transform') || 'translate(0,0)';
  var inside = transform.replace('translate(', '').replace(')', '');
  var parts = inside.split(',');
  return { x: parseFloat(parts[0]), y: parseFloat(parts[1]) };
}

function moveShapeBy(shape, dx, dy) {
  var offset = getOffset(shape);
  var newX = offset.x + dx;
  var newY = offset.y + dy;
  shape.setAttribute('transform', 'translate(' + newX + ',' + newY + ')');
}

function moveSelectionBy(dx, dy) {
  for (var i = 0; i < state.selection.length; i++) {
    moveShapeBy(state.selection[i], dx, dy);
  }
}


// ---------------------------------------------------------------------- mouse
//
// Screen pixels and drawing coordinates are not the same thing, and they drift
// further apart as you pan and zoom. getScreenCTM() gives the matrix the
// browser is using; inverting it converts a mouse position back into drawing
// coordinates.

function toDrawingPoint(event) {
  var point = stage.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(stage.getScreenCTM().inverse());
}

var drag = { active: false, lastX: 0, lastY: 0 };

stage.addEventListener('mousedown', function (event) {
  var shape = event.target.closest('[data-kind]');

  if (!shape) {
    clearSelection();          // clicked empty canvas
    return;
  }

  if (event.shiftKey) {
    addToSelection([shape]);
  } else if (state.selection.indexOf(shape) === -1) {
    setSelection([shape]);     // clicking an unselected shape replaces the selection
  }

  var point = toDrawingPoint(event);
  drag.active = true;
  drag.lastX = point.x;
  drag.lastY = point.y;
  event.preventDefault();
});

window.addEventListener('mousemove', function (event) {
  if (!drag.active) return;

  var point = toDrawingPoint(event);
  moveSelectionBy(point.x - drag.lastX, point.y - drag.lastY);
  drag.lastX = point.x;
  drag.lastY = point.y;
});

window.addEventListener('mouseup', function () {
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
    '<div class="phrase">' + phrase + '</div>' +
    '<div class="detail">' + intent + ' &middot; ' + slotText + '</div>' +
    '<div class="' + (isWarning ? 'warn' : 'ok') + '">' + outcome + '</div>';

  logBox.insertBefore(entry, logBox.firstChild);
}


applyView();
refreshSelection();
