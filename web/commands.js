// commands.js
//
// Turns (intent + slots) into something happening on the canvas.
//
//   phrase -> classifier -> intent
//          -> extractor  -> slots
//          -> HANDLERS[intent](slots) -> the canvas changes
//
// Day 3 covers the viewport and selection commands. The rest arrive on Day 4.


// Below this confidence, refuse rather than act. Derived from the threshold
// sweep on the held-out set: 0.60 blocked all 4 errors at a cost of 4 of 56
// correct predictions. It is a property of this particular trained model, so
// it has to be re-derived after any retrain.
var CONFIDENCE_THRESHOLD = 0.60;


// ---------------------------------------------- slot values to canvas values

// The extractor speaks in general terms; the canvas has specific shape kinds.
// This is where the two vocabularies meet.
var KIND_FOR_TYPE = {
  rectangle: 'rectangle',
  circle: 'circle',
  text: 'text'
};


// -------------------------------------------------------------- the handlers
//
// One function per command. Each takes the slots and returns a sentence
// describing what it did, which goes into the log.

var HANDLERS = {

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

  SELECT_ALL: function () {
    var shapes = allShapes();
    setSelection(shapes);
    return 'selected all ' + shapes.length + ' shapes';
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
    return 'selected ' + shapes.length + ' ' + slots.color + ' shapes';
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
    return 'selected ' + shapes.length + ' ' + kind + ' shapes';
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
    return 'added ' + shapes.length + ' shapes to the selection';
  }

};


// --------------------------------------------------------------- the dispatcher

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
  // Same principle as the confidence gate: a wrong action costs more than
  // a repeated command, especially for someone working one-handed.
  var missing = missingSlots(intent, slots);
  if (missing.length > 0) {
    log(phrase, label, slots, 'need to know: ' + missing.join(', '), true);
    return;
  }

  var handler = HANDLERS[intent];
  if (!handler) {
    log(phrase, label, slots, 'not built yet -- coming on Day 4', true);
    return;
  }

  var outcome = handler(slots);
  log(phrase, label, slots, outcome, false);
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
