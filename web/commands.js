// commands.js
//
// Turns (intent + slots) into something happening on the canvas.
//
//   phrase -> classifier -> intent
//          -> extractor  -> slots
//          -> HANDLERS[intent](slots) -> the canvas changes
//
// All 30 commands.


// Below this confidence, refuse rather than act. Derived from the threshold
// sweep on the held-out set: 0.60 blocked all 4 errors at a cost of 4 of 56
// correct predictions. It is a property of this particular trained model, so
// it has to be re-derived after any retrain.
var CONFIDENCE_THRESHOLD = 0.60;


// The extractor speaks in general terms; the canvas has specific shape kinds.
// This is where the two vocabularies meet.
var KIND_FOR_TYPE = {
  rectangle: 'rectangle',
  circle: 'circle',
  text: 'text',
  group: 'group'
};

// Commands that change the design, and so need an undo point saved first.
// Selecting and zooming do not change anything, so they are absent.
var MUTATING = [
  'MOVE_OBJECT', 'RESIZE', 'ROTATE', 'FLIP',
  'BRING_FORWARD', 'SEND_BACKWARD', 'GROUP', 'UNGROUP',
  'LOCK_LAYER', 'TOGGLE_VISIBILITY',
  'DUPLICATE', 'DELETE',
  'ALIGN', 'DISTRIBUTE',
  'CREATE_SHAPE', 'CREATE_TEXT',
  'SET_FILL_COLOR', 'SET_OPACITY'
];


// ------------------------------------------------------------------- helpers

// Most commands act on the selection, and most of them are meaningless
// without one. Rather than repeat the check eighteen times, ask here.
function requireSelection() {
  if (state.selection.length === 0) {
    return 'nothing is selected';
  }
  return null;
}

function unlockedSelection() {
  var list = [];
  for (var i = 0; i < state.selection.length; i++) {
    if (!isLocked(state.selection[i])) {
      list.push(state.selection[i]);
    }
  }
  return list;
}

function describeCount(n) {
  if (n === 1) return '1 shape';
  return n + ' shapes';
}


// -------------------------------------------------------------- the handlers

var HANDLERS = {

  // ---------------------------------------------------------------- viewport

  PAN: function (slots) {
    var step = 0.25;
    if (slots.amount === 'small') step = 0.1;
    if (slots.amount === 'large')  step = 0.5;

    // The canvas is a sheet of paper being pushed, not a camera being aimed.
    // "move the canvas up" moves the artwork up the screen, which means the
    // viewport has to look further DOWN -- hence the flipped signs.
    if (slots.direction === 'left')  { panBy(step, 0); }
    if (slots.direction === 'right') { panBy(-step, 0); }
    if (slots.direction === 'up')    { panBy(0, step); }
    if (slots.direction === 'down')  { panBy(0, -step); }

    return 'moved the canvas ' + slots.direction;
  },

  ZOOM_IN: function (slots) {
    zoomBy(slots.amount === 'small' ? 0.9 : 0.7);
    return 'zoomed in';
  },

  ZOOM_OUT: function (slots) {
    zoomBy(slots.amount === 'small' ? 1.1 : 1.4);
    return 'zoomed out';
  },

  ZOOM_FIT: function () {
    fitView();
    return 'fitted everything on screen';
  },

  ZOOM_RESET: function () {
    resetView();
    return 'reset the view';
  },

  // --------------------------------------------------------------- selection

  SELECT_ALL: function () {
    var shapes = allShapes();
    setSelection(shapes);
    return 'selected all ' + describeCount(shapes.length);
  },

  DESELECT: function () {
    clearSelection();
    return 'cleared the selection';
  },

  SELECT_BY_COLOR: function (slots) {
    var shapes = shapesWithColor(slots.color);
    if (shapes.length === 0) {
      return 'no ' + slots.color + ' shapes on the canvas';
    }
    setSelection(shapes);
    return 'selected ' + describeCount(shapes.length) + ' in ' + slots.color;
  },

  SELECT_BY_TYPE: function (slots) {
    var kind = KIND_FOR_TYPE[slots.objectType];
    if (!kind) {
      return 'this canvas has no ' + slots.objectType + ' shapes';
    }
    var shapes = shapesOfKind(kind);
    if (shapes.length === 0) {
      return 'no ' + kind + ' shapes on the canvas';
    }
    setSelection(shapes);
    return 'selected ' + describeCount(shapes.length) + ' of kind ' + kind;
  },

  ADD_TO_SELECTION: function (slots) {
    var shapes = [];
    if (slots.color) {
      shapes = shapesWithColor(slots.color);
    } else if (slots.objectType && KIND_FOR_TYPE[slots.objectType]) {
      shapes = shapesOfKind(KIND_FOR_TYPE[slots.objectType]);
    }
    if (shapes.length === 0) {
      return 'nothing matched, so nothing was added';
    }
    addToSelection(shapes);
    return 'added ' + describeCount(shapes.length) + ' to the selection';
  },

  // --------------------------------------------------------------- transform

  MOVE_OBJECT: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var distance = 40;
    if (slots.amount === 'small') distance = 10;
    if (slots.amount === 'large')  distance = 120;
    if (slots.number && !slots.isPercent) distance = slots.number;

    var dx = 0;
    var dy = 0;
    if (slots.direction === 'left')  dx = -distance;
    if (slots.direction === 'right') dx = distance;
    if (slots.direction === 'up')    dy = -distance;
    if (slots.direction === 'down')  dy = distance;

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      moveShapeBy(shapes[i], dx, dy);
    }
    return 'moved ' + describeCount(shapes.length) + ' ' + slots.direction +
           ' by ' + distance;
  },

  RESIZE: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var factor = (slots.scale === 'smaller') ? 0.75 : 1.33;
    if (slots.isPercent && slots.number) {
      factor = slots.number / 100;
    }

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      scaleShapeBy(shapes[i], factor);
    }
    return 'scaled ' + describeCount(shapes.length) + ' by ' +
           Math.round(factor * 100) + '%';
  },

  ROTATE: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var degrees = slots.number ? slots.number : 90;
    if (slots.rotation === 'counterclockwise') {
      degrees = -degrees;
    }

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      rotateShapeBy(shapes[i], degrees);
    }
    return 'rotated ' + describeCount(shapes.length) + ' by ' + degrees + '°';
  },

  FLIP: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      flipShape(shapes[i], slots.axis);
    }
    return 'flipped ' + describeCount(shapes.length) + ' ' + slots.axis + 'ly';
  },

  // ------------------------------------------------------- layers and order
  //
  // Z-order in SVG is document order: later elements draw on top. So bringing
  // a shape forward means moving it later among its siblings. No separate
  // layer list to keep in step with the canvas.

  BRING_FORWARD: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var shapes = state.selection;
    for (var i = 0; i < shapes.length; i++) {
      if (slots.extent === 'full') {
        scene.appendChild(shapes[i]);
      } else {
        var next = shapes[i].nextElementSibling;
        if (next) {
          scene.insertBefore(shapes[i], next.nextElementSibling);
        }
      }
    }
    refreshSelection();
    return slots.extent === 'full'
      ? 'brought ' + describeCount(shapes.length) + ' to the front'
      : 'brought ' + describeCount(shapes.length) + ' forward one step';
  },

  SEND_BACKWARD: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var shapes = state.selection;
    for (var i = 0; i < shapes.length; i++) {
      if (slots.extent === 'full') {
        scene.insertBefore(shapes[i], scene.firstChild);
      } else {
        var previous = shapes[i].previousElementSibling;
        if (previous) {
          scene.insertBefore(shapes[i], previous);
        }
      }
    }
    refreshSelection();
    return slots.extent === 'full'
      ? 'sent ' + describeCount(shapes.length) + ' to the back'
      : 'sent ' + describeCount(shapes.length) + ' back one step';
  },

  GROUP: function () {
    if (state.selection.length < 2) {
      return 'select at least two shapes to group';
    }

    var group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-kind', 'group');
    scene.appendChild(group);

    var shapes = state.selection.slice();
    for (var i = 0; i < shapes.length; i++) {
      group.appendChild(shapes[i]);          // appendChild moves, not copies
    }

    writeTransform(group, { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });
    setSelection([group]);
    return 'grouped ' + describeCount(shapes.length);
  },

  UNGROUP: function () {
    var groups = [];
    for (var i = 0; i < state.selection.length; i++) {
      if (state.selection[i].getAttribute('data-kind') === 'group') {
        groups.push(state.selection[i]);
      }
    }
    if (groups.length === 0) {
      return 'no group selected';
    }

    var freed = [];
    for (var g = 0; g < groups.length; g++) {
      var consolidated = groups[g].transform.baseVal.consolidate();
      var groupMatrix = consolidated ? consolidated.matrix : new DOMMatrix();

      var children = [];
      for (var c = 0; c < groups[g].children.length; c++) {
        children.push(groups[g].children[c]);
      }
      for (var k = 0; k < children.length; k++) {
        // Fold the group's transform in BEFORE moving the child out,
        // otherwise it snaps back to where it was before grouping.
        bakeParentTransform(children[k], groupMatrix);
        scene.appendChild(children[k]);
        freed.push(children[k]);
      }
      groups[g].remove();
    }

    setSelection(freed);
    return 'ungrouped into ' + describeCount(freed.length);
  },

  LOCK_LAYER: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var locking = (slots.lockState !== 'unlock');
    for (var i = 0; i < state.selection.length; i++) {
      state.selection[i].setAttribute('data-locked', locking ? 'true' : 'false');
      // No dimming on the canvas -- a locked background would fade everything
      // sitting on top of it. The layers panel shows the state instead.
      state.selection[i].style.opacity = '';
    }
    var count = state.selection.length;
    if (locking) clearSelection();
    return (locking ? 'locked ' : 'unlocked ') + describeCount(count);
  },

  TOGGLE_VISIBILITY: function (slots) {
    if (slots.visibility === 'show') {
      var hidden = scene.querySelectorAll('[data-hidden="true"]');
      for (var i = 0; i < hidden.length; i++) {
        hidden[i].removeAttribute('data-hidden');
        hidden[i].style.display = '';
      }
      return 'showed ' + describeCount(hidden.length);
    }

    var problem = requireSelection();
    if (problem) return problem;

    var shapes = state.selection.slice();
    for (var j = 0; j < shapes.length; j++) {
      shapes[j].setAttribute('data-hidden', 'true');
      shapes[j].style.display = 'none';
    }
    clearSelection();
    return 'hid ' + describeCount(shapes.length);
  },

  // ----------------------------------------------------------------- editing

  DUPLICATE: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var copies = slots.number ? slots.number : 1;
    if (copies > 10) copies = 10;

    var made = [];
    for (var c = 1; c <= copies; c++) {
      for (var i = 0; i < state.selection.length; i++) {
        var clone = state.selection[i].cloneNode(true);
        clone.classList.remove('selected');
        scene.appendChild(clone);
        moveShapeBy(clone, 24 * c, 24 * c);
        made.push(clone);
      }
    }
    setSelection(made);
    return 'made ' + describeCount(made.length);
  },

  DELETE: function () {
    var problem = requireSelection();
    if (problem) return problem;

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      shapes[i].remove();
    }
    pruneSelection();
    return 'deleted ' + describeCount(shapes.length);
  },

  UNDO: function (slots) {
    var steps = slots.number ? slots.number : 1;
    var done = 0;
    for (var i = 0; i < steps; i++) {
      if (undo()) done = done + 1;
    }
    if (done === 0) return 'nothing left to undo';
    return 'undid ' + done + (done === 1 ? ' step' : ' steps');
  },

  REDO: function (slots) {
    var steps = slots.number ? slots.number : 1;
    var done = 0;
    for (var i = 0; i < steps; i++) {
      if (redo()) done = done + 1;
    }
    if (done === 0) return 'nothing left to redo';
    return 'redid ' + done + (done === 1 ? ' step' : ' steps');
  },

  // ------------------------------------------------------------- arrangement

  ALIGN: function (slots) {
    if (state.selection.length < 2) {
      return 'select at least two shapes to align';
    }

    var boxes = [];
    for (var i = 0; i < state.selection.length; i++) {
      boxes.push(sceneBox(state.selection[i]));
    }

    // The overall bounding box of everything selected -- the thing they
    // get aligned against.
    var left = boxes[0].x;
    var right = boxes[0].x + boxes[0].width;
    var top = boxes[0].y;
    var bottom = boxes[0].y + boxes[0].height;
    for (var b = 1; b < boxes.length; b++) {
      if (boxes[b].x < left) left = boxes[b].x;
      if (boxes[b].x + boxes[b].width > right) right = boxes[b].x + boxes[b].width;
      if (boxes[b].y < top) top = boxes[b].y;
      if (boxes[b].y + boxes[b].height > bottom) bottom = boxes[b].y + boxes[b].height;
    }

    var edge = slots.edge;
    var vertical = (slots.axis === 'vertical');

    for (var s = 0; s < state.selection.length; s++) {
      var box = boxes[s];
      var dx = 0;
      var dy = 0;

      if (edge === 'left')   dx = left - box.x;
      if (edge === 'right')  dx = right - (box.x + box.width);
      if (edge === 'top')    dy = top - box.y;
      if (edge === 'bottom') dy = bottom - (box.y + box.height);

      if (edge === 'center') {
        if (vertical) {
          dy = (top + bottom) / 2 - (box.y + box.height / 2);
        } else {
          dx = (left + right) / 2 - (box.x + box.width / 2);
        }
      }

      moveShapeBy(state.selection[s], dx, dy);
    }

    return 'aligned ' + describeCount(state.selection.length) + ' to ' + edge;
  },

  DISTRIBUTE: function (slots) {
    if (state.selection.length < 3) {
      return 'select at least three shapes to distribute';
    }

    var vertical = (slots.axis === 'vertical');

    var items = [];
    for (var i = 0; i < state.selection.length; i++) {
      var box = sceneBox(state.selection[i]);
      items.push({
        shape: state.selection[i],
        box: box,
        centre: vertical ? box.y + box.height / 2 : box.x + box.width / 2
      });
    }

    items.sort(function (a, b) { return a.centre - b.centre; });

    var first = items[0].centre;
    var last = items[items.length - 1].centre;
    var gap = (last - first) / (items.length - 1);

    // The two end shapes stay put; everything between them is spaced evenly.
    for (var k = 1; k < items.length - 1; k++) {
      var target = first + gap * k;
      var shift = target - items[k].centre;
      if (vertical) {
        moveShapeBy(items[k].shape, 0, shift);
      } else {
        moveShapeBy(items[k].shape, shift, 0);
      }
    }

    return 'spaced ' + describeCount(items.length) + ' evenly ' +
           (vertical ? 'vertically' : 'horizontally');
  },

  // ---------------------------------------------------------------- creation

  CREATE_SHAPE: function (slots) {
    var centre = viewCentre();
    var kind = slots.shapeType;
    var element;

    if (kind === 'circle' || kind === 'ellipse') {
      element = document.createElementNS(SVG_NS, 'circle');
      element.setAttribute('cx', centre.x);
      element.setAttribute('cy', centre.y);
      element.setAttribute('r', 50);
      element.setAttribute('data-kind', 'circle');
    } else {
      var width = (kind === 'square') ? 100 : 140;
      var height = (kind === 'square') ? 100 : 90;
      element = document.createElementNS(SVG_NS, 'rect');
      element.setAttribute('x', centre.x - width / 2);
      element.setAttribute('y', centre.y - height / 2);
      element.setAttribute('width', width);
      element.setAttribute('height', height);
      element.setAttribute('data-kind', 'rectangle');
    }

    var colour = slots.color ? slots.color : 'gray';
    element.setAttribute('fill', colourFor(colour, slots.shade));
    element.setAttribute('data-color', colour);

    scene.appendChild(element);
    writeTransform(element, { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });
    setSelection([element]);

    return 'added a ' + colour + ' ' + element.getAttribute('data-kind');
  },

  CREATE_TEXT: function () {
    var centre = viewCentre();
    var element = document.createElementNS(SVG_NS, 'text');
    element.setAttribute('x', centre.x - 40);
    element.setAttribute('y', centre.y);
    element.setAttribute('font-size', 24);
    element.setAttribute('fill', COLOR_HEX.black);
    element.setAttribute('data-kind', 'text');
    element.setAttribute('data-color', 'black');
    element.textContent = 'New text';

    scene.appendChild(element);
    writeTransform(element, { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });
    setSelection([element]);

    return 'added a text layer';
  },

  // ----------------------------------------------------------------- styling

  SET_FILL_COLOR: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    // slots.hex is only ever set by the toolbar's shade slider, which can
    // pick any point on the scale. Voice commands send a colour name and an
    // optional light/dark, and colourFor turns those into the same kind of
    // value.
    var hex = slots.hex ? slots.hex : colourFor(slots.color, slots.shade);
    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      shapes[i].setAttribute('fill', hex);
      shapes[i].setAttribute('data-color', slots.color);
    }
    var described = slots.shade ? (slots.shade + ' ' + slots.color) : slots.color;
    return 'filled ' + describeCount(shapes.length) + ' with ' + described;
  },

  SET_OPACITY: function (slots) {
    var problem = requireSelection();
    if (problem) return problem;

    var value = 0.5;
    if (slots.number) {
      value = slots.number / 100;
      // "fifty percent transparent" is 50% opaque either way, so no inversion
      // is attempted here -- see the note in the v3 backlog.
    }
    if (value > 1) value = 1;
    if (value < 0) value = 0;

    var shapes = unlockedSelection();
    for (var i = 0; i < shapes.length; i++) {
      shapes[i].setAttribute('fill-opacity', value);
    }
    return 'set opacity of ' + describeCount(shapes.length) + ' to ' +
           Math.round(value * 100) + '%';
  }

};


// ------------------------------------------------------------- the dispatcher
//
// applyCommand is the single point where a command actually runs. The voice
// path reaches it after the confidence and slot checks; the toolbar reaches it
// directly, because a button click carries no uncertainty to gate.

function applyCommand(intent, slots, sourceLabel) {
  var handler = HANDLERS[intent];
  if (!handler) {
    log(sourceLabel, intent, slots, 'no handler for that command', true);
    return;
  }

  if (MUTATING.indexOf(intent) !== -1) {
    snapshot();
  }

  var outcome = handler(slots);
  log(sourceLabel, intent, slots, outcome, false);

  if (window.refreshUI) window.refreshUI();
}


async function runCommand(phrase) {
  if (phrase.trim() === '') return;

  if (!window.classifyPhrase) {
    log(phrase, '(model not ready)', {}, 'the model is still loading', true);
    return;
  }

  // Lowercase and trim, exactly as the training phrases were. The model has
  // never seen a capital letter.
  var clean = phrase.trim().toLowerCase();

  var prediction = await window.classifyPhrase(clean);
  var intent = prediction.intent;
  var confidence = prediction.confidence;
  var label = intent + ' (' + confidence.toFixed(2) + ')';

  // The confidence gate. With 30 classes the model always returns something,
  // even for nonsense, so low certainty has to mean "refuse" rather than
  // "guess". A wrong action costs more than a repeated command -- especially
  // for someone working one-handed, for whom undo is expensive.
  if (confidence < CONFIDENCE_THRESHOLD) {
    log(phrase, label, {}, 'I did not catch that', true);
    return;
  }

  var slots = extractSlots(clean);

  // Refuse rather than guess when a required parameter is missing.
  var missing = missingSlots(intent, slots);
  if (missing.length > 0) {
    log(phrase, label, slots, 'need to know: ' + missing.join(', '), true);
    return;
  }

  applyCommand(intent, slots, phrase);
}


// ---------------------------------------------------------------------- input

var commandBox = document.getElementById('cmd');

commandBox.addEventListener('keydown', async function (event) {
  if (event.key === 'Enter') {
    var typed = commandBox.value;
    commandBox.value = '';
    await runCommand(typed);
  }
});
