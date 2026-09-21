# Command Taxonomy

30 intent labels across 544 training phrases, 18 to 20 phrases per label.

Schema: `phrase,label`, where `phrase` is what the user speaks and `label` is the
command it maps to. All phrases are lowercase and unpunctuated, matching the form in
which the Web Speech API returns a transcript, so that training data and runtime input
have the same shape.

---

## Selection Criteria

The premise of the tool is that canvas operations depending on a keyboard modifier held
while the mouse acts should also be available by speech. Panning requires the space bar
held while dragging. Multi-select requires shift held while clicking. A user who cannot
hold a key and click simultaneously has no route to either.

The taxonomy is organized around that constraint rather than around a full feature clone
of an existing design tool. Multi-select is also a prerequisite for aligning, grouping,
distributing and recoloring more than one object, so the labels covering those
operations are included as consequences of the same restriction.

---

## Label Groups

### Viewport (5)

Changes what is visible. Never alters the design.

| Label | Operation |
|---|---|
| `PAN` | Move the viewport in a direction |
| `ZOOM_IN` | Increase zoom level |
| `ZOOM_OUT` | Decrease zoom level |
| `ZOOM_FIT` | Fit all content to the window |
| `ZOOM_RESET` | Return to 100%, actual size |

### Selection (5)

| Label | Operation |
|---|---|
| `SELECT_ALL` | Select every object on the canvas |
| `DESELECT` | Clear the current selection, or remove named objects from it |
| `SELECT_BY_COLOR` | Select objects by color, optionally narrowed by shape kind |
| `SELECT_BY_TYPE` | Select objects by kind (text, rectangle, circle, group) |
| `ADD_TO_SELECTION` | Add further objects to the current selection |

`SELECT_BY_COLOR` and `SELECT_BY_TYPE` carry the accessibility purpose of the taxonomy.
They replace shift-click multi-select, and the number of spoken commands required does
not grow with the number of objects selected.

### Transform (4)

| Label | Operation |
|---|---|
| `MOVE_OBJECT` | Move or nudge the selection |
| `RESIZE` | Scale the selection larger or smaller |
| `ROTATE` | Rotate the selection |
| `FLIP` | Mirror the selection horizontally or vertically |

### Layers and Structure (6)

| Label | Operation |
|---|---|
| `BRING_FORWARD` | Raise the selection in z-order |
| `SEND_BACKWARD` | Lower the selection in z-order |
| `GROUP` | Group the selected objects |
| `UNGROUP` | Break a group apart |
| `LOCK_LAYER` | Lock or unlock a layer |
| `TOGGLE_VISIBILITY` | Show or hide a layer |

### Editing (4)

`DUPLICATE`, `DELETE`, `UNDO`, `REDO`

### Arrangement (2)

`ALIGN`, `DISTRIBUTE`

### Creation (2)

`CREATE_SHAPE`, `CREATE_TEXT`

### Styling (2)

`SET_FILL_COLOR`, `SET_OPACITY`

---

## Changes from Version 1

The version 1 dataset was lost to a drive failure. This taxonomy is a reconstruction
from the surviving training code, with three deliberate changes.

1. **`MOVE_UP` and `MOVE_DOWN` replaced by `BRING_FORWARD` and `SEND_BACKWARD`.** In
   version 1 those labels denoted z-order, which collided conceptually with moving an
   object upward on the canvas. The rename removes the ambiguity and leaves
   `MOVE_OBJECT` for repositioning.
2. **`SELECT_BY_COLOR` and `PAN` are present from the outset.** In version 1 both were
   added mid-training after the model confused them with neighboring labels, which
   required re-splitting and retraining.
3. **Disambiguation phrases are part of the initial dataset rather than later patches.**
   Every confusable pair below has minimal pairs present from the first training run.

---

## Designed Confusable Pairs

These pairs are present in the data deliberately. They are the cases a dataset assembled
without attention to label boundaries would misclassify.

| Pair | Minimal example |
|---|---|
| `PAN` vs `MOVE_OBJECT` | "move the canvas up" / "move this shape up" |
| `BRING_FORWARD` vs `MOVE_OBJECT` | "move this layer up one level" / "nudge it up" |
| `ZOOM_IN` vs `RESIZE` | "make everything look bigger on screen" / "make this shape bigger" |
| `ZOOM_OUT` vs `ZOOM_FIT` | "give me a wider view" / "fit everything on screen" |
| `SELECT_BY_COLOR` vs `SET_FILL_COLOR` | "select the blue ones" / "make this blue" |
| `SELECT_ALL` vs `SELECT_BY_TYPE` | "select all the layers" / "select all the text layers" |
| `TOGGLE_VISIBILITY` vs `SET_OPACITY` | "make this shape invisible" / "make this almost invisible" |
| `UNDO` vs `UNGROUP` | "undo that" / "undo this grouping" |
| `DUPLICATE` vs `REDO` | "make another one of these" / "do that again" |

---

## Evaluation Sets

Two sets are used.

The **test split** is a random 15% of the 544 training phrases, 82 phrases in total.

The **held-out set**, `hard_eval.csv`, is 60 phrases, two per label, written separately
and appearing nowhere in training. It is weighted toward the confusable pairs above.

`hard_eval.csv` was written on the expectation that it would be the harder of the two,
on the reasoning that phrases within a label share vocabulary and would inflate the
random split. The measured results are the reverse: 93.3% on the held-out set against
85.4% on the random split. The held-out set was written in the same register as the
training data, which limits how far it tests generalization. See `RESULTS.md` and
`LIMITATIONS.md`.

---

## Parameters Are Not Labels

The classifier identifies the operation, not its parameters. "Pan the canvas left" and
"pan the canvas right" are both `PAN`; direction is extracted separately by rule in
`slot_extractor.js`. Keeping direction, color and magnitude out of the label space is
what holds the label count at 30 rather than several hundred.
