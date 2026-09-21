# Evaluation Results

Two evaluations were carried out on version 2: an offline evaluation of the intent
classifier against a held-out phrase set, and a recorded session in which a basic
mobile UI mockup was built within the tool using both the toolbar and voice.

---

## 1. Classifier Accuracy on Held-Out Phrases

### Training configuration

| Setting | Value |
|---|---|
| Base model | `distilbert-base-uncased` |
| Split | 70 / 15 / 15 stratified by label, `random_state=42`, giving 380 / 82 / 82 |
| Learning rate | 3e-5 |
| Batch size | 16 |
| Maximum epochs | 40 |
| Early stopping | patience 5, best model selected on macro F1 |
| Maximum sequence length | 32 tokens |

The saved run stopped at epoch 24.

### Variance across runs

The model was trained three times with identical data, code, settings and seed. The
repetition was not planned: Colab runtime resets forced it, and run 2 fell back to CPU
while runs 1 and 3 used a T4 GPU.

| | Run 1 (GPU) | Run 2 (CPU) | Run 3 (GPU) |
|---|---|---|---|
| Held-out accuracy | 91.7% | 87.0% | 93.3% |
| Errors (of 60) | 5 | 8 | 4 |
| Highest confidence on an incorrect prediction | 0.38 | 0.78 | 0.58 |
| Optimal confidence threshold | 0.40 | 0.70 | 0.60 |

Accuracy is reported as a range, 87% to 93%, rather than as the best individual run. The
optimal confidence threshold also moved between runs, from 0.40 to 0.70, which
establishes that the threshold is a property of one trained model and must be
re-derived after any retraining. The deployed model uses 0.60, derived from run 3.

Three errors recurred in every run and represent genuine gaps in the dataset. Two
appeared in some runs only and are attributable to training variance. Separating the two
categories was possible only because the runs were repeated.

The held-out set (`hard_eval.csv`, 60 phrases, two per label) was written in the same
register as the training data, that is, instructions phrased as instructions. A separate
probe set written in a conversational register performed substantially worse. This is
recorded as a limitation in `LIMITATIONS.md` rather than omitted.

### Metrics from the saved training run

`results.json` in the repository root records the metrics written by the training
notebook for a single run.

| Metric | Value |
|---|---|
| Test split accuracy (82 phrases) | 85.4% |
| Test split macro F1 | 85.8% |
| Held-out accuracy (60 phrases) | 93.3% |
| Held-out macro F1 | 92.9% |
| Split sizes, train / validation / test | 380 / 82 / 82 |

Macro F1 is recorded alongside accuracy because the classes are small, at 18 to 20
phrases each, and accuracy alone conceals per-class failure.

The same file also contains `best_epoch`, `stopped_at_epoch` and
`confidence_threshold` fields. These three are literal values typed into the notebook
cell rather than read from the training run, so they are not presented as measurements
here. In particular, `confidence_threshold` in that file reads 0.40 and does not
correspond to the 0.60 threshold deployed in `commands.js`.

Two evaluation sets were used and they behave differently. The test split is a random
15% of the 544 training phrases and scores 85.4%. The held-out set is 60 phrases written
separately and scores 93.3%. The separately written set therefore scores higher than the
random split, not lower. The dataset design anticipated the reverse, on the assumption
that phrases within a label share vocabulary and would inflate the random split. That
assumption is not supported by the result. It is consistent with the register finding
recorded in `LIMITATIONS.md`: `hard_eval.csv` was written in the same voice as the
training data and is therefore less demanding than intended. Of the two figures, 85.4%
is the more conservative.

### Methodological caveat

The confidence threshold in each run was selected by inspecting the same 60 phrases used
to measure it. The resulting claim that a given threshold blocks a given number of errors
is therefore optimistic. A clean figure requires a third set committed to in advance.
Seven probe phrases are held in reserve for this purpose and remain unused.

---

## 2. Recorded Build Session

A basic mobile UI mockup, consisting of a phone frame, header bar, hero image, a
two-by-two card grid, a product row and text labels, was built twice within a single
session: once using the toolbar and panels, and once using voice.

### Voice Command Outcomes

32 voice commands were issued. 27 executed correctly (84%) and 5 failed.

All five failures originated in speech recognition rather than intent classification.
There were no misclassifications and no false refusals.

Spoken phrases are given in the first column; the second column reproduces the
transcript exactly as recorded in the activity log.

| Spoken | Transcribed by Chrome | Outcome |
|---|---|---|
| move the canvas to right | "to write" | PAN identified at 0.80; "write" is not a direction, so the tool requested one |
| move the canvas to right | "to write" | as above |
| make them white | "make them bite" | 0.29, below threshold, refused |
| select all the grey rectangles | "the great rectangles" | selected all rectangles by type rather than by color |
| color it white | "colour red white" | filled red |

### Interception of Mis-Transcribed Input

Of the five mis-transcribed phrases, three were intercepted before any action was
taken: twice because the PAN command requires a direction parameter that the
mis-transcribed word did not supply, and once because the confidence gate refused a
prediction of 0.29 rather than selecting a fill color on weak evidence.

Two of 32 commands (6%) produced an unintended action. Both were reversible in a single
step.

### Features Confirmed in Use

- Number extraction: "duplicated two times" produced `{number: 2}` and two copies.
- Combined color and type filtering: "select all the grey rectangles" matched on color
  and shape kind together, selecting 3 of the 8 rectangles present.
- Shade modifiers: "make it light green", "make it light yellow" and "make it light
  blue" all resolved correctly.
- Alignment with an edge parameter: "align them to the left" aligned 3 selected shapes.

---

## 3. Operations Affected

Certain operations in a conventional design tool cannot be carried out with one hand.
They require a modifier key held while the other hand clicks or drags. For a user unable
to do both at once, those operations are closed off, along with the work that depends on
them.

| Operation | By mouse | By voice |
|---|---|---|
| Select 3 shapes of one color | click, then shift-click twice, with the modifier held while the other hand clicks | "select all the grey rectangles" |
| Select all 8 rectangles | 8 clicks, 7 of them with shift held | "select all the rectangles" |
| Pan the canvas | space bar held while dragging | "move the canvas right" |
| Duplicate twice | two separate actions | "duplicate two times" |
| Recolor a multi-shape selection | select each object, then apply | one command over the existing selection |

Three of these require a modifier key held while the other hand acts: shift for
multi-select, and the space bar for panning. Multi-select is further a prerequisite for
aligning, grouping, distributing and recoloring multiple objects, so its loss extends
beyond selection itself.

The number of physical actions is also material. Selecting eight rectangles with a mouse
requires eight separate clicks; selecting them by voice requires one phrase, and remains
one phrase whether eight objects are present or eighty. Where each physical action
carries a cost in pain, fatigue or effort that must be rationed across a working
session, reducing the number of actions required has direct consequences for how much
work a user can complete.

---

## 4. Scope of These Findings

These results establish that the classifier generalizes to unseen phrasings within the
register on which it was trained; that the confidence gate and parameter requirements
intercept the majority of mis-transcribed input before it produces an incorrect action;
and that the operations identified as difficult to reach with one hand are reachable by
voice.

They do not establish performance for users whose speech patterns differ from the
author's; behavior under background noise; performance in a register unlike the training
data (see `LIMITATIONS.md`); or results for any user other than the author. A study with
participants who have limited hand mobility has not been conducted and is the
appropriate next step.

The session reported here is a documented working demonstration with logged outcomes. It
is not a user study.
