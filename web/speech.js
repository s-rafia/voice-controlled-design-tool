// speech.js
//
// The microphone. Turns speech into text and hands that text to runCommand --
// the same function the typed box calls, so the whole pipeline below this
// point is already tested.
//
// Speech recognition here is the browser's, not ours. Chrome sends the audio
// to Google's servers and sends back a transcript. That is worth being clear
// about: transcription is not part of this project's contribution, and it is
// the one piece that needs a network connection.


var micButton = document.getElementById('mic');
var heardLine = document.getElementById('heard');

// Chrome still uses the prefixed name; the standard one is there for whatever
// supports it later.
var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

var listening = false;
var recogniser = null;


function setHeard(text, isFinal) {
  heardLine.textContent = text;
  heardLine.className = isFinal ? 'heard final' : 'heard';
}

function setListening(on) {
  listening = on;
  micButton.classList.toggle('on', on);
  micButton.title = on ? 'Stop listening' : 'Start listening';
  if (!on) {
    setHeard('', false);
  }
}


if (!SpeechRecognition) {
  micButton.disabled = true;
  micButton.title = 'Speech recognition needs Chrome or Edge';
  setHeard('speech recognition is not available in this browser', false);

} else {

  recogniser = new SpeechRecognition();
  recogniser.lang = 'en-US';
  recogniser.continuous = false;      // one phrase at a time; restarted below
  recogniser.interimResults = true;   // show words as they arrive
  recogniser.maxAlternatives = 1;

  // Words appear here as they are recognised, then firm up. Showing the
  // interim text matters: a voice interface that gives no sign of what it
  // heard leaves the user guessing whether the microphone or the model failed.
  recogniser.addEventListener('result', function (event) {
    var text = '';
    var isFinal = false;

    for (var i = event.resultIndex; i < event.results.length; i++) {
      text = text + event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        isFinal = true;
      }
    }

    setHeard(text, isFinal);

    if (isFinal) {
      var phrase = text.trim();
      if (phrase !== '') {
        runCommand(phrase);
      }
    }
  });

  // continuous mode drifts and stops on its own, so instead each phrase ends
  // the session and we start a new one -- more reliable, and it gives a clean
  // boundary between commands.
  recogniser.addEventListener('end', function () {
    if (listening) {
      try {
        recogniser.start();
      } catch (error) {
        setListening(false);
      }
    }
  });

  recogniser.addEventListener('error', function (event) {
    if (event.error === 'no-speech') {
      return;                      // silence is not a failure
    }

    if (event.error === 'not-allowed') {
      setHeard('microphone permission was denied', false);
      setListening(false);
      return;
    }

    if (event.error === 'network') {
      setHeard('speech recognition needs a network connection', false);
      setListening(false);
      return;
    }

    setHeard('speech error: ' + event.error, false);
    setListening(false);
  });

  micButton.addEventListener('click', function () {
    if (listening) {
      setListening(false);
      recogniser.stop();
      return;
    }

    setListening(true);
    setHeard('listening...', false);
    try {
      recogniser.start();
    } catch (error) {
      setListening(false);
      setHeard('could not start the microphone', false);
    }
  });
}