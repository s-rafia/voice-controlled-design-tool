# Voice-Controlled Design Tool

A browser-based design tool where operations that normally need two hands — panning,
multi-select, layer reordering, can be performed by voice. A fine-tuned DistilBERT
classifier maps spoken phrases to 30 canvas commands.

**Status:** in progress. The intent classifier is trained and evaluated (30 commands,
544 training phrases, 87–93% on held-out phrases across three runs).

## Repository

- `notebooks/` — data preparation, fine-tuning, evaluation
- `data/` — the command dataset and the held-out evaluation set
- `build_dataset.py` — regenerates both CSVs
- `command_taxonomy.md` — the 30 commands and the reasoning behind them

Full write-up to follow.
