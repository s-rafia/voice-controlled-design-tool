# Known Limitations

Twelve limitations identified during training, interface development and use of the
finished tool. None are fixed in version 2. Each entry states the observation, the
evidence for it, and the proposed resolution.

Figures attributed to the saved training run are verified against
`notebooks/train_classifier.ipynb` and `results.json`. Figures attributed to the two
earlier runs are taken from session records; those runs were overwritten and their
outputs are no longer recoverable.

---

## 1. Training Variance Between Runs

The model was trained three times with identical data, code and settings. The
repetition was forced by Colab runtime resets. Run 2 fell back to CPU; runs 1 and 3
used a T4 GPU.

| | Run 1 (GPU) | Run 2 (CPU) | Run 3 (GPU, saved) |
|---|---|---|---|
| Held-out accuracy | 91.7% | 87.0% | 93.3% |
| Errors of 60 | 5 | 8 | 4 |
| Highest confidence on an incorrect prediction | 0.38 | 0.78 | 0.58 |
| Lowest confidence on a correct prediction | 0.25 | 0.32 | 0.26 |
| Optimal threshold from sweep | 0.40 | 0.70 | 0.60 |

Accuracy ranges from 87% to 93%. The optimal threshold ranges from 0.40 to 0.70.

The runs differed in calibration as well as accuracy. Run 1 was broadly uncertain, with
many correct predictions between 0.25 and 0.50. Run 2 was confident including when
incorrect, reaching 0.78 on an error. Run 3 fell between the two.

### Errors present in all three runs

| Phrase | True label | Predicted, run 1 / 2 / 3 |
|---|---|---|
| grab every layer | SELECT_ALL | SELECT_BY_TYPE / TOGGLE_VISIBILITY / LOCK_LAYER |
| add the red square too | ADD_TO_SELECTION | SET_FILL_COLOR / SELECT_BY_COLOR / SELECT_BY_COLOR |
| fade the image a little | SET_OPACITY | PAN / ZOOM_OUT / ZOOM_OUT |

Incorrect in two runs of three: "clear everything i selected", predicted DELETE instead
of DESELECT.

Incorrect in runs 1 and 2 but correct in run 3, and therefore attributable to variance
rather than to a dataset weakness: "undo this grouping" and "shrink this down a bit".

"grab every layer" draws a different incorrect label in each run. The model has no
stable representation for the phrase rather than a consistent confusion with one
neighboring label.

### Consequences

A confidence threshold tuned on 60 phrases containing between 4 and 8 errors is fitted
to noise. It is a property of one trained model and must be re-derived after every
retraining. Single-run accuracy at this dataset size should be reported as a range.

### Proposed resolution

Train across several seeds and report the mean and range for both accuracy and
threshold. Each run takes a few minutes on GPU.

---

## 2. Absence of Complaint Phrasings

Every phrase in `commands.csv` is an instruction, for example "zoom out" or "widen the
view". None are complaints about the current state, for example "this is too close" or
"it is too small". The complaint construction inverts the intent, and the model has not
encountered one during training.

| Input | Predicted | Confidence | Correct label |
|---|---|---|---|
| screen is too close | ZOOM_IN | 0.42 | ZOOM_OUT |
| screen is too far | ZOOM_OUT | 0.34, refused | ZOOM_IN |

The model keys on "close" and "far" as surface words and does not register that "too X"
describes a state to be corrected rather than a quantity to be increased.

This affects `ZOOM_IN`, `ZOOM_OUT`, `RESIZE` and `SET_OPACITY` at minimum. It is the
most consequential gap in the dataset, because complaint phrasing is common under
frustration, and in an accessibility tool frustrated use is not an edge case.

### Proposed resolution

Add complaint-form phrases to every label where a state can be described as excessive.

---

## 3. Label Overlap Between SELECT_ALL and SELECT_BY_TYPE

"grab every layer" is misclassified in every run. The word "layer" appears in training
phrases for both `SELECT_ALL` ("select all the layers", "select every layer") and
`SELECT_BY_TYPE` ("select all vector layers", "select all image layers"). Dataset
verification identified this pair as the closest cross-label collision in the file
before training began.

### Proposed resolution

Determine whether "layer" functions as a type word or a generic word, and make the
training phrases consistent with that decision.

---

## 4. Modifier Words Outweighing Verbs

Three errors share a cause: the prediction is driven by a modifier rather than by the
verb carrying the meaning.

- "shrink this down a bit" predicted MOVE_OBJECT. "down a bit" is directional phrasing.
- "fade the image a little" predicted PAN and ZOOM_OUT. "a little" occurs throughout the
  `PAN` phrases.
- "add the red square too" predicted SET_FILL_COLOR and SELECT_BY_COLOR. Color words
  dominate.

The directional commands hold most of the softening words in the dataset ("a bit", "a
little", "slightly"), so those words became evidence for direction.

### Proposed resolution

Distribute softening modifiers across all command families rather than concentrating
them in the directional labels.

---

## 5. No Command for Positional or Count-Based Selection

"select the first 3" returns 0.27 and is refused. The refusal is correct, but incidental:
no `SELECT_BY_POSITION` label exists. "select the first 3 boxes" returns SELECT_BY_TYPE
at 0.41, which passes the threshold and is wrong.

### Proposed resolution

Either add the label or declare positional selection out of scope. Both are defensible.
Leaving it undecided is not.

---

## 6. Shallow Generalization

"give a broader look" returns ZOOM_IN at 0.36. The training set contains "give me a
broader look of this" labeled ZOOM_OUT. Removing two words reverses the predicted
direction.

A model that had learned that "broader" denotes outward movement would not produce this
result. The held-out score depends more on phrase shape than on meaning.

This is corroborated by the two evaluation sets. The random 15% test split scores 85.4%
while `hard_eval.csv` scores 93.3%, despite `hard_eval.csv` having been written to be
the harder of the two. It was written in the same register as the training data, which
limits how far it tests generalization. See `RESULTS.md`.

---

## 7. Threshold Derived from the Measurement Set

The threshold in each run was selected by inspecting the same 60 phrases used to
measure its effect, so any statement of the form "blocks N of N errors" is optimistic.

For the saved run the sweep produced:

| Threshold | Incorrect predictions blocked | Correct predictions blocked |
|---|---|---|
| 0.40 | 1 of 4 | 1 of 56 |
| 0.50 | 1 of 4 | 2 of 56 |
| 0.60 | 4 of 4 | 4 of 56 |
| 0.70 | 4 of 4 | 5 of 56 |

0.60 is the lowest threshold that blocks every error in that run, which is why it is
deployed. A figure not fitted to the measurement set requires a third set committed to
in advance. Seven probe phrases are held in reserve for this purpose and remain unused.

---

## 8. Reference Frame Ambiguity in PAN

Identified through use of the tool rather than through testing. "Move the canvas up"
admits two valid readings.

Under the paper model, the canvas is a sheet being pushed, and the artwork moves up the
screen. Under the camera model, the canvas is fixed and a viewpoint moves over it, so
the artwork appears to move down.

The first implementation used the camera model; the expected behavior was the paper
model. This is the same division underlying the "natural scrolling" setting in desktop
operating systems, where neither direction is objectively correct.

The behavior was resolved as the paper model on two grounds. The commands say "canvas",
which names an object rather than a viewpoint, and direct manipulation matches the
convention of space-dragging in existing design tools.

The dataset remains unresolved. Under the single `PAN` label:

| Phrase | Frame |
|---|---|
| move the canvas up | paper |
| move the whole canvas up | paper |
| shift the view right | camera |
| move the view to the left | camera |
| move the artboard view down | camera |

These phrases describe opposite motions under one label. The classifier is correct in
identifying all of them as panning. The ambiguity is in the command vocabulary.

### Proposed resolution

Split into two labels, remove the camera-framed phrases so the vocabulary is internally
consistent, or retain both and treat the reference frame as a user preference. Note that
no quantity of additional training data resolves this, because the intent is unambiguous
and the reference frame is not.

---

## 9. Spoken Dimensions Unsupported

Identified while constructing a mobile mockup within the tool.

| Input | Predicted | Confidence | Result |
|---|---|---|---|
| make a 1920 by 1080 rectangle | CREATE_SHAPE | 0.44 | refused |
| make a square of 500 by 500 pixels | CREATE_SHAPE | 0.57 | refused |

The classification is correct in both cases. The refusal comes from the 0.60 threshold.
No phrase in `commands.csv` contains two numbers, so a sentence of that shape is unlike
anything seen during training and the model hedges.

Two independent gaps must close together.

1. **Dataset.** `CREATE_SHAPE` requires phrases carrying explicit dimensions, for
   example "make a 1920 by 1080 rectangle" or "draw a 200 pixel square". This requires
   retraining, and therefore re-export to ONNX, re-quantization, and a re-derived
   threshold.
2. **Extractor.** `matchNumber` returns the first number it encounters and stops. No
   `width` or `height` parameters exist, and `CREATE_SHAPE` ignores numbers entirely,
   always drawing 140 by 90. Parsing "A by B" requires a two-number match and
   recognition of the separator.

Closing the extractor gap alone changes nothing, because the confidence gate refuses
before the handler runs. That ordering is itself a finding: a confidence gate renders
downstream features invisible until the classifier clears it, so parameter work and
dataset work cannot be sequenced independently.

Exact dimensions remain reachable through the properties panel, which is operable with
one hand, so the capability exists and only the spoken route is absent.

---

## 10. Ambiguity of "Align Horizontally"

"align the squares horizontally" classifies as `ALIGN` at 0.97 and yields
`{axis: horizontal, objectType: rectangle}`, but no `edge` parameter, so the tool
requests one.

This is correct behavior rather than a failure. Three shapes aligned horizontally could
be arranged on their tops, their bottoms or their centers, producing three different
results. The term is ambiguous in established tools as well: "align horizontal centers"
gives shapes the same x coordinate, producing a vertical stack, while most speakers
using "align these horizontally" intend a horizontal row, which is the same y
coordinate. The term points in opposite directions depending on whether the speaker is
reasoning in tool terminology or in ordinary language.

Selecting a default would be correct approximately half the time. Under the design rule
stated in `README.md`, that an incorrect action carries a higher cost than a repeated
command, requesting the missing parameter is the correct response.

### Proposed resolution

Introduce row and stack vocabulary that avoids the ambiguous term, for example "put them
in a row" or "stack them", rather than attempting to disambiguate "horizontally".

---

## 11. No Multi-Turn Parameter Filling

When a required parameter is absent, `runCommand` reports it and stops. No pending
command state exists, so the answer must arrive as a complete phrase. Saying "left" in
isolation has no effect, and the full command must be repeated.

For a user working without a keyboard this is the wrong shape of interaction: the system
requests information it is not listening for.

### Proposed resolution

Hold the intent, accept the next utterance as the missing parameter, and time out after
a short interval.

---

## 12. Separation of Speech Recognition Failures

Observed during the recorded session, from the Web Speech API transcript log.

| Spoken | Transcribed | Consequence |
|---|---|---|
| deselect the red square | "the select the Red Square" | the verb never reached the model |
| (fragment) | "red circle" | SELECT_BY_COLOR at 0.47, correctly refused |

Speech recognition is provided by Chrome and is not part of this project's
contribution. Combining its errors with intent-classification results would misattribute
them.

Voice failures are therefore sorted into five categories: mis-transcription, correct
refusal below threshold, false refusal of a phrase that was in fact clear, genuine
misclassification, and a missing required parameter. `RESULTS.md` reports the recorded
session using this decomposition.

---

## Defects Corrected During Evaluation

Two selection defects were found through use of the tool. Both were in the command
handlers rather than in the model.

- `SELECT_BY_COLOR` read only the color parameter and discarded the shape type, so
  "select the red circle" selected every red shape. The extractor had supplied both
  parameters correctly.
- `DESELECT` accepted no parameters, so "deselect the red square" cleared the entire
  selection.

Both support a point the evaluation makes independently: with a confidence gate in
place, the majority of observed failures occurred downstream of the classifier rather
than within it.

---

## Reserved Probe Set

The following phrases appear nowhere in `commands.csv` or `hard_eval.csv` and have not
been used to select any parameter of the model. They are reserved as an untouched third
evaluation set for use after any future retraining.

```
move the box ot left          -> MOVE_OBJECT   (misspelling intentional)
make a rectangle              -> CREATE_SHAPE
select the first 3            -> out of scope
select the first 3 boxes      -> out of scope
screen is too close           -> ZOOM_OUT
screen is too far             -> ZOOM_IN
give a broader look           -> ZOOM_OUT
```
