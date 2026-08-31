# Command Taxonomy — Voice-Controlled Design Tool

30 intent labels, 544 training phrases, ~18 phrases per label.
Schema: `phrase,label` — `phrase` is what the user speaks, `label` is the command it
maps to. (v1 used `text`; the training code must be updated to match.)
All phrases lowercase, no punctuation — this matches what the
Web Speech API returns from a live microphone, so training data and runtime input
look the same.

## Why these 30

The tool's premise is that the operations hardest to perform one-handed in Figma —
panning while zooming, multi-select, layer reordering, alignment — should be
available by voice. The taxonomy is organised around that, not around a full
feature clone of Figma. Every label is an operation that either requires two hands,
a modifier key, or a menu dive in a conventional design tool.

## Groups

### Viewport (5) — changes what you see, never the design
| Label | Operation |
|---|---|
| `PAN` | Move the canvas/viewport in a direction |
| `ZOOM_IN` | Increase zoom level |
| `ZOOM_OUT` | Decrease zoom level |
| `ZOOM_FIT` | Fit all content to the window |
| `ZOOM_RESET` | Return to 100% / actual size |

### Selection (5)
| Label | Operation |
|---|---|
| `SELECT_ALL` | Select every object on the canvas |
| `DESELECT` | Clear the current selection |
| `SELECT_BY_COLOR` | Select all objects of a named colour |
| `SELECT_BY_TYPE` | Select all objects of a kind (text, image, rectangle…) |
| `ADD_TO_SELECTION` | Add one more object to what is already selected |

`SELECT_BY_COLOR` and `SELECT_BY_TYPE` are the accessibility payoff: they replace
shift-click multi-select, which needs a modifier key held with one hand while the
other clicks.

### Transform (4)
| Label | Operation |
|---|---|
| `MOVE_OBJECT` | Move/nudge the selected object |
| `RESIZE` | Scale the selection larger or smaller |
| `ROTATE` | Rotate the selection |
| `FLIP` | Mirror the selection horizontally or vertically |

### Layers and structure (6)
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

## Changes from the original (v1) taxonomy

The original dataset was lost; this rebuild is reconstructed from the training code
and extended. Three deliberate changes:

1. **`MOVE_UP` / `MOVE_DOWN` → `BRING_FORWARD` / `SEND_BACKWARD`.** In v1 those
   labels meant z-order ("move this shape up one layer"), which collided
   conceptually with moving an object up on the canvas. The rename removes the
   ambiguity and frees `MOVE_OBJECT` for actual repositioning.
2. **`SELECT_BY_COLOR` and `PAN` are in from the start.** In v1 both were bolted on
   mid-training after the model confused them with neighbours, which meant
   re-splitting and retraining.
3. **The disambiguation phrases are training data, not patches.** Every confusable
   pair now has minimal pairs present in the initial dataset.

## Designed confusable pairs

These are in the data on purpose. They are the cases a naive dataset gets wrong,
and they are the interesting thing to report in a write-up.

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

## Held-out evaluation set

`hard_eval.csv` — 60 phrases, two per label, that appear nowhere in training and are
weighted toward the pairs above. Accuracy on a random 15% split of the training data
is inflated, because phrases within a label share vocabulary. This file is the number
worth quoting.

## Not intents — slots

The classifier answers *what operation*, not *with what parameters*. "pan the canvas
left" and "pan the canvas right" are both `PAN`; the direction is a slot, extracted
separately by rule (see the project plan, Phase 2b). Keeping direction, colour and
magnitude out of the label space is what keeps the label count at 30 instead of
several hundred.
