// slot_extractor.js
//
// The classifier answers WHICH command was spoken.
// This answers WITH WHAT PARAMETERS.
//
//   "pan the canvas left"  ->  intent PAN      + { direction: "left" }
//   "select the blue ones" ->  intent SELECT_BY_COLOR + { color: "blue" }
//   "rotate this ninety degrees" -> intent ROTATE + { number: 90 }
//
// These are rules, not a model, because every value below comes from a closed
// list. A rule that fails is a rule you can read and fix.


// ---------------------------------------------------------------- vocabulary
//
// Each entry maps a canonical value to the words that mean it.
// Multi-word triggers are allowed and are checked before single words.

var VOCABULARY = {

  direction: {
    left:  ['left'],
    right: ['right'],
    up:    ['up', 'upward', 'upwards'],
    down:  ['down', 'downward', 'downwards']
  },

  edge: {
    left:   ['left'],
    right:  ['right'],
    top:    ['top'],
    bottom: ['bottom'],
    center: ['center', 'centre', 'middle']
  },

  axis: {
    horizontal: ['horizontal', 'horizontally', 'left to right', 'side to side'],
    vertical:   ['vertical', 'vertically', 'top to bottom', 'upside down']
  },

  color: {
    red:    ['red'],
    orange: ['orange'],
    yellow: ['yellow'],
    green:  ['green'],
    blue:   ['blue'],
    purple: ['purple', 'violet'],
    pink:   ['pink'],
    brown:  ['brown'],
    black:  ['black'],
    white:  ['white'],
    gray:   ['gray', 'grey'],
    teal:   ['teal'],
    cyan:   ['cyan'],
    magenta: ['magenta']
  },

  shade: {
    light: ['light', 'pale'],
    dark:  ['dark', 'deep']
  },

  objectType: {
    text:      ['text', 'label', 'heading', 'title', 'caption', 'paragraph'],
    image:     ['image', 'picture', 'photo'],
    rectangle: ['rectangle', 'rectangles', 'box', 'boxes', 'square', 'squares'],
    circle:    ['circle', 'circles', 'ellipse', 'ellipses'],
    triangle:  ['triangle', 'triangles'],
    line:      ['line', 'lines'],
    arrow:     ['arrow', 'arrows'],
    frame:     ['frame', 'frames', 'artboard'],
    group:     ['group', 'groups'],
    icon:      ['icon', 'icons'],
    button:    ['button', 'buttons'],
    vector:    ['vector', 'vectors']
  },

  shapeType: {
    rectangle: ['rectangle', 'box', 'rounded rectangle'],
    square:    ['square'],
    circle:    ['circle'],
    ellipse:   ['ellipse', 'oval'],
    triangle:  ['triangle'],
    line:      ['line'],
    arrow:     ['arrow'],
    frame:     ['frame', 'artboard']
  },

  amount: {
    small: ['a bit', 'a little', 'slightly', 'a touch', 'a tad'],
    large: ['a lot', 'much']
  },

  scale: {
    bigger:  ['bigger', 'larger', 'enlarge', 'wider', 'taller', 'stretch',
              'increase', 'grow', 'scale up', 'twice'],
    smaller: ['smaller', 'shrink', 'narrower', 'reduce', 'decrease',
              'scale down', 'half']
  },

  rotation: {
    clockwise:        ['clockwise'],
    counterclockwise: ['counterclockwise', 'anticlockwise', 'counter clockwise']
  },

  lockState: {
    lock:   ['lock', 'freeze'],
    unlock: ['unlock', 'unfreeze']
  },

  visibility: {
    hide: ['hide', 'invisible', 'conceal'],
    show: ['show', 'unhide', 'reveal', 'visible']
  },

  extent: {
    full: ['to the front', 'to the back', 'very front', 'very back',
           'all the way', 'to the top', 'to the bottom'],
    step: ['one level', 'one step', 'a level', 'a step', 'one layer']
  }
};


// ------------------------------------------------------------------- numbers

var NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100
};

var TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
            'eighty', 'ninety'];


// ------------------------------------------------------------------- helpers

// True if the phrase contains this trigger as a whole word or whole phrase.
// Whole-word matching stops "left" from matching inside "leftover".
function containsTrigger(phrase, trigger) {
  var padded = ' ' + phrase + ' ';
  return padded.indexOf(' ' + trigger + ' ') !== -1;
}

// Look through one slot's vocabulary and return the first canonical value
// whose trigger appears in the phrase. Returns null if nothing matches.
function matchSlot(phrase, slotVocabulary) {
  var values = Object.keys(slotVocabulary);

  // Multi-word triggers first, so "top to bottom" wins over "top".
  for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      var triggers = slotVocabulary[value];
      for (var j = 0; j < triggers.length; j++) {
        var trigger = triggers[j];
        var isMultiWord = trigger.indexOf(' ') !== -1;
        if (pass === 0 && !isMultiWord) continue;
        if (pass === 1 && isMultiWord) continue;
        if (containsTrigger(phrase, trigger)) {
          return value;
        }
      }
    }
  }
  return null;
}

// Find a number, written either as digits ("90") or as words ("ninety",
// "forty five", "one eighty").
function matchNumber(words) {
  for (var i = 0; i < words.length; i++) {
    var word = words[i];

    // digits
    if (/^\d+$/.test(word)) {
      return parseInt(word, 10);
    }

    if (!(word in NUMBER_WORDS)) continue;

    var next = words[i + 1];
   

    // "one level", "one step", "one layer" describe how far, not how many.
    // That is the extent slot's job, so don't report a number here.
    if (next === 'level' || next === 'step' || next === 'layer') {
      continue;
    }

        // "one" is usually a pronoun -- "the blue one", "that one", "this one".
    // Only count it as a number when it heads a compound ("one hundred",
    // "one eighty") or is followed by a unit ("one pixel", "one degree").
    if (word === 'one') {
      var UNITS = ['hundred', 'pixel', 'pixels', 'degree', 'degrees',
                   'percent', 'time', 'times', 'copy', 'copies'];
      var startsCompound = (next === 'hundred') || (TENS.indexOf(next) !== -1);
      var hasUnit = UNITS.indexOf(next) !== -1;
      if (!startsCompound && !hasUnit) {
        continue;
      }
    }

    // "one hundred" -> 100, "two hundred" -> 200
    if (next === 'hundred') {
      return NUMBER_WORDS[word] * 100;
    }

    // "one eighty" -> 180  (spoken shorthand for 180 degrees)
    if (word === 'one' && TENS.indexOf(next) !== -1) {
      return 100 + NUMBER_WORDS[next];
    }

    // "forty five" -> 45
    if (TENS.indexOf(word) !== -1 && next in NUMBER_WORDS &&
        NUMBER_WORDS[next] < 10) {
      return NUMBER_WORDS[word] + NUMBER_WORDS[next];
    }

    return NUMBER_WORDS[word];
  }
  return null;
}


// -------------------------------------------------- which slots each command needs

var REQUIRED_SLOTS = {
  PAN:               ['direction'],
  MOVE_OBJECT:       ['direction'],
  SELECT_BY_COLOR:   ['color'],
  SET_FILL_COLOR:    ['color'],
  SELECT_BY_TYPE:    ['objectType'],
  CREATE_SHAPE:      ['shapeType'],
  FLIP:              ['axis'],
  ALIGN:             ['edge'],
  RESIZE:            ['scale'],
  LOCK_LAYER:        ['lockState'],
  TOGGLE_VISIBILITY: ['visibility']
};


// --------------------------------------------------------------- the function

function extractSlots(phrase) {
  var clean = phrase.toLowerCase().trim();
  var words = clean.split(/\s+/);

  var slots = {};

  var slotNames = Object.keys(VOCABULARY);
  for (var i = 0; i < slotNames.length; i++) {
    var name = slotNames[i];
    var value = matchSlot(clean, VOCABULARY[name]);
    if (value !== null) {
      slots[name] = value;
    }
  }

  var number = matchNumber(words);
  if (number !== null) {
    slots.number = number;
    slots.isPercent = containsTrigger(clean, 'percent');
  }

  return slots;
}

// Which required slots are missing for this command?
// The dispatcher uses this to ask instead of guessing.
function missingSlots(intent, slots) {
  var required = REQUIRED_SLOTS[intent];
  if (!required) return [];

  var missing = [];
  for (var i = 0; i < required.length; i++) {
    if (!(required[i] in slots)) {
      missing.push(required[i]);
    }
  }
  return missing;
}
