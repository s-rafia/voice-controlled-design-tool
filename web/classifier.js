// classifier.js
//
// Loads the fine-tuned DistilBERT model and exposes one function:
//
//   window.classifyPhrase(phrase) -> { intent, confidence }
//
// This file replaces classifyStub. The keyword rules are gone -- from here on
// the intent comes from the model trained on commands.csv.
//
// It is a module (<script type="module">) because transformers.js is
// distributed as one. That also means it runs after the other scripts, which
// is why it is loaded last.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

// Never reach out to Hugging Face -- everything is local.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = './';        // so 'model' means ./model/

var commandBox = document.getElementById('cmd');
var statusBox = document.getElementById('status');

commandBox.disabled = true;
commandBox.placeholder = 'loading the model, about 66 MB...';

try {
  var started = Date.now();

  var classifier = await pipeline('text-classification', 'model', { dtype: 'q8' });

  var seconds = ((Date.now() - started) / 1000).toFixed(1);

  // The one function the rest of the app uses.
  window.classifyPhrase = async function (phrase) {
    var output = await classifier(phrase, { top_k: 1 });
    return { intent: output[0].label, confidence: output[0].score };
  };

  commandBox.disabled = false;
  commandBox.placeholder = 'e.g. select the blue ones';
  commandBox.focus();
  statusBox.textContent = 'model ready (' + seconds + 's) — nothing selected';

} catch (error) {
  commandBox.placeholder = 'model failed to load';
  statusBox.textContent = 'model failed to load — see the console';
  console.error(error);
}
