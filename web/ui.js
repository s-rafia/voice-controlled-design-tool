// ui.js
//
// The visible controls: the toolbar on the left, and on the right the
// properties box and the layers list.
//
// Every toolbar button calls the SAME handler the voice path calls. Two input
// methods, one set of operations -- so a command cannot behave differently
// depending on how it was invoked, and adding a command to HANDLERS adds it to
// both paths at once.
//
// The toolbar also exists for a second reason: the Day 6 evaluation compares
// completing tasks with mouse and keyboard against completing them by voice.
// Without conventional controls there is nothing to compare against.


// ------------------------------------------------------------- the swatches

var SWATCH_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple',
                    'pink', 'teal', 'brown', 'gray', 'black', 'white'];

var activeColour = 'blue';

var shadeSlider  = document.getElementById('shade');
var shadeValue   = document.getElementById('shadeValue');
var shadePreview = document.getElementById('shadePreview');

// The hex the sliders currently describe: base colour, shifted toward white
// or black by however far the slider has been dragged.
function currentHex() {
  return mixHex(COLOR_HEX[activeColour], parseInt(shadeSlider.value, 10) / 100);
}

function updateShadePreview() {
  shadePreview.style.background = currentHex();
  shadeValue.textContent = shadeSlider.value;
}

(function buildSwatches() {
  var holder = document.getElementById('swatches');

  for (var i = 0; i < SWATCH_ORDER.length; i++) {
    (function (name) {
      var button = document.createElement('button');
      button.className = 'swatch';
      button.style.background = COLOR_HEX[name];
      button.title = name;

      button.addEventListener('click', function () {
        activeColour = name;
        shadeSlider.value = 0;          // a new colour starts unshaded
        updateShadePreview();

        var chosen = holder.querySelectorAll('.swatch');
        for (var k = 0; k < chosen.length; k++) {
          chosen[k].classList.remove('chosen');
        }
        button.classList.add('chosen');

        applyCommand('SET_FILL_COLOR',
                     { color: name, hex: currentHex() },
                     '(toolbar) ' + name);
      });

      holder.appendChild(button);
    })(SWATCH_ORDER[i]);
  }
})();

// Work backwards from a finished colour to the slider position that produced
// it. Needed because the panel has to follow the selection: click a shape that
// is already a lightened green, and the slider should sit where that green is,
// not wherever it was left last time.
function estimateShade(baseHex, currentHex) {
  var total = 0;
  var counted = 0;

  for (var i = 1; i <= 5; i = i + 2) {
    var base = parseInt(baseHex.slice(i, i + 2), 16);
    var now  = parseInt(currentHex.slice(i, i + 2), 16);

    if (now >= base && (255 - base) > 8) {
      total = total + (now - base) / (255 - base);
      counted = counted + 1;
    } else if (now < base && base > 8) {
      total = total - (base - now) / base;
      counted = counted + 1;
    }
  }

  if (counted === 0) return 0;

  var amount = Math.round((total / counted) * 100 / 5) * 5;   // nearest 5
  if (amount >  80) amount = 80;
  if (amount < -80) amount = -80;
  return amount;
}

// Point the fill controls at whatever is selected, without applying anything.
function syncFillFromSelection() {
  if (state.selection.length === 0) return;

  var shape = state.selection[0];
  var name = shape.getAttribute('data-color');
  if (!name || !COLOR_HEX[name]) return;

  activeColour = name;

  var fill = shape.getAttribute('fill') || COLOR_HEX[name];
  shadeSlider.value = (fill.charAt(0) === '#' && fill.length === 7)
    ? estimateShade(COLOR_HEX[name], fill)
    : 0;

  updateShadePreview();

  var swatches = document.querySelectorAll('#swatches .swatch');
  for (var i = 0; i < swatches.length; i++) {
    swatches[i].classList.toggle('chosen', swatches[i].title === name);
  }

  // Opacity follows too, for the same reason.
  var opacity = shape.getAttribute('fill-opacity');
  opacitySlider.value = opacity === null ? 100 : Math.round(parseFloat(opacity) * 100);
  opacityValue.textContent = opacitySlider.value;
}


// Dragging updates the preview live; the colour is applied when you let go,
// so one drag makes one undo step rather than twenty.
shadeSlider.addEventListener('input', updateShadePreview);

shadeSlider.addEventListener('change', function () {
  var amount = parseInt(shadeSlider.value, 10);
  var word = amount === 0 ? activeColour
           : (amount > 0 ? 'lighter ' : 'darker ') + activeColour;
  applyCommand('SET_FILL_COLOR',
               { color: activeColour, hex: currentHex() },
               '(toolbar) ' + word);
});

updateShadePreview();


// ------------------------------------------------------------------ opacity

var opacitySlider = document.getElementById('opacity');
var opacityValue  = document.getElementById('opacityValue');

opacitySlider.addEventListener('input', function () {
  opacityValue.textContent = opacitySlider.value;
});

opacitySlider.addEventListener('change', function () {
  applyCommand('SET_OPACITY',
               { number: parseInt(opacitySlider.value, 10), isPercent: true },
               '(toolbar) opacity ' + opacitySlider.value + '%');
});


// --------------------------------------------------------- toolbar wiring
//
// One listener on the whole toolbar rather than one per button. New buttons
// work with no extra JavaScript -- they only need data-intent and data-slots.

document.getElementById('tools').addEventListener('click', function (event) {
  var button = event.target.closest('[data-intent]');
  if (!button) return;

  var intent = button.getAttribute('data-intent');
  var slots = JSON.parse(button.getAttribute('data-slots') || '{}');
  var name = button.title || button.textContent;

  applyCommand(intent, slots, '(toolbar) ' + name);
});


// ------------------------------------------------------- properties box
//
// Shown only for a single selected shape. Exact numbers are what make a
// deliberate layout possible -- "make it bigger" is fine for adjusting,
// useless for building a 360-wide phone screen.

var propsBox = document.getElementById('props');

function propInput(labelText, value, onCommit) {
  var wrap = document.createElement('label');
  wrap.className = 'prop';

  var span = document.createElement('span');
  span.textContent = labelText;

  var input = document.createElement('input');
  input.type = 'number';
  input.value = Math.round(value);

  function commit() {
    var next = parseFloat(input.value);
    if (isNaN(next)) return;
    snapshot();
    onCommit(next);
    refreshUI();
  }

  input.addEventListener('change', commit);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { commit(); }
  });

  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

function refreshProps() {
  propsBox.innerHTML = '';

  if (state.selection.length !== 1) {
    var note = document.createElement('div');
    note.className = 'propsNote';
    note.textContent = state.selection.length === 0
      ? 'select one shape to see its size'
      : state.selection.length + ' shapes selected';
    propsBox.appendChild(note);
    return;
  }

  var shape = state.selection[0];
  var box = sceneBox(shape);
  var kind = shape.getAttribute('data-kind');

  var grid = document.createElement('div');
  grid.className = 'propGrid';

  grid.appendChild(propInput('X', box.x, function (v) {
    setShapePosition(shape, v, sceneBox(shape).y);
  }));
  grid.appendChild(propInput('Y', box.y, function (v) {
    setShapePosition(shape, sceneBox(shape).x, v);
  }));

  if (kind !== 'group') {
    grid.appendChild(propInput('W', box.width, function (v) {
      var current = sceneBox(shape);
      var x = current.x;
      var y = current.y;
      setShapeSize(shape, v, current.height);
      setShapePosition(shape, x, y);
    }));
    grid.appendChild(propInput('H', box.height, function (v) {
      var current = sceneBox(shape);
      var x = current.x;
      var y = current.y;
      setShapeSize(shape, current.width, v);
      setShapePosition(shape, x, y);
    }));
  }

  propsBox.appendChild(grid);

  // Text content is edited here rather than on the canvas. Voice dictation is
  // a separate problem from command classification -- see the v3 backlog.
  if (kind === 'text') {
    var row = document.createElement('label');
    row.className = 'prop wide';

    var span = document.createElement('span');
    span.textContent = 'Text';

    var field = document.createElement('input');
    field.type = 'text';
    field.id = 'textField';
    field.value = shape.textContent;

    function commitText() {
      if (field.value === shape.textContent) return;
      snapshot();
      shape.textContent = field.value;
      refreshUI();
    }

    field.addEventListener('change', commitText);
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { commitText(); field.blur(); }
    });

    row.appendChild(span);
    row.appendChild(field);
    propsBox.appendChild(row);
  }
}

// Double-clicking a text layer selects it and puts the cursor in the field.
stage.addEventListener('dblclick', function (event) {
  var hit = event.target.closest('[data-kind="text"]');
  if (!hit) return;
  setSelection([hit]);
  refreshUI();
  var field = document.getElementById('textField');
  if (field) { field.focus(); field.select(); }
});


// ------------------------------------------------------------------- icons
//
// Inline SVG rather than emoji or text: emoji render differently on every
// platform, and text labels crowd the row. These are drawn with strokes so
// they take their colour from the button, which is how the on/off states work.

function svgIcon(inner) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
         inner + '</svg>';
}

var ICON = {
  eye: svgIcon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
               '<circle cx="12" cy="12" r="3"/>'),

  eyeOff: svgIcon('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8' +
                  'a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4' +
                  'c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07' +
                  'a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'),

  locked: svgIcon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
                  '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),

  unlocked: svgIcon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
                    '<path d="M7 11V7a5 5 0 0 1 9.9-1"/>')
};

function iconButton(markup, title, isActive) {
  var button = document.createElement('button');
  button.className = 'mini' + (isActive ? ' active' : '');
  button.title = title;
  button.innerHTML = markup;
  return button;
}


// ------------------------------------------------------------ layers list
//
// Drawn top-first, because that is how designers think about stacking, and
// the opposite of document order.

function describeLayer(shape) {
  var kind = shape.getAttribute('data-kind');
  if (kind === 'text') {
    return 'Text — ' + (shape.textContent || '').slice(0, 16);
  }
  if (kind === 'group') {
    return 'Group of ' + shape.children.length;
  }
  var colour = shape.getAttribute('data-color') || '';
  return colour.charAt(0).toUpperCase() + colour.slice(1) + ' ' + kind;
}

function refreshLayers() {
  var holder = document.getElementById('layers');
  holder.innerHTML = '';

  var shapes = allShapes();

  for (var i = shapes.length - 1; i >= 0; i--) {
    (function (shape) {
      var hidden = shape.getAttribute('data-hidden') === 'true';
      var locked = isLocked(shape);
      var chosen = state.selection.indexOf(shape) !== -1;

      var row = document.createElement('div');
      row.className = 'layer';
      if (chosen) row.classList.add('sel');
      if (locked) row.classList.add('locked');
      if (hidden) row.classList.add('hidden');

      var dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.background = shape.getAttribute('fill') || '#d4d4d8';

      var name = document.createElement('div');
      name.className = 'name';
      name.textContent = describeLayer(shape);

      var eye = iconButton(hidden ? ICON.eyeOff : ICON.eye,
                           hidden ? 'show this layer' : 'hide this layer',
                           hidden);

      var lock = iconButton(locked ? ICON.locked : ICON.unlocked,
                            locked ? 'unlock this layer' : 'lock this layer',
                            locked);

      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(eye);
      row.appendChild(lock);

      row.addEventListener('click', function () {
        setSelection([shape]);
        refreshUI();
      });

      eye.addEventListener('click', function (event) {
        event.stopPropagation();          // don't also select the layer
        snapshot();
        if (hidden) {
          shape.removeAttribute('data-hidden');
          shape.style.display = '';
        } else {
          shape.setAttribute('data-hidden', 'true');
          shape.style.display = 'none';
        }
        refreshUI();
      });

      lock.addEventListener('click', function (event) {
        event.stopPropagation();
        snapshot();
        shape.setAttribute('data-locked', locked ? 'false' : 'true');
        shape.style.opacity = '';
        refreshUI();
      });

      holder.appendChild(row);
    })(shapes[i]);
  }
}


// Called by commands.js after anything changes, and by app.js after a drag
// or a selection change.
window.refreshUI = function () {
  refreshLayers();
  refreshProps();
  syncFillFromSelection();
};

refreshLayers();
refreshProps();
