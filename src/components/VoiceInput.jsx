import { useState } from 'react';

// Spellings to correct
const CORRECTIONS = {
  'dilr': 'DILR',
  'lrdi': 'LRDI',
  'varc': 'VARC',
  'qa': 'QA',
  'simcat': 'SimCAT',
  'ims': 'IMS',
  'cracku': 'Cracku',
  'tita': 'TITA',
  'rc': 'RC',
  'reading comprehension': 'RC',
  'parajumble': 'Parajumble',
  'arithmetic': 'Arithmetic',
  'algebra': 'Algebra',
  'geometry': 'Geometry',
};

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000
};

export function wordsToNumber(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9. ]/g, ' ').replace(/\band\b/g, ' ').trim();
  if (!clean) return null;

  // Handle decimal points like "one point five" or "two point five"
  if (clean.includes('point')) {
    const segments = clean.split('point');
    const integerPart = wordsToNumber(segments[0]) || 0;
    const decimalPartStr = segments[1].trim().split(/\s+/).map(p => {
      if (NUMBER_WORDS[p] !== undefined) return String(NUMBER_WORDS[p]);
      const num = parseFloat(p);
      return !isNaN(num) ? String(num) : '';
    }).join('');
    if (decimalPartStr) {
      return parseFloat(`${integerPart}.${decimalPartStr}`);
    }
  }

  // If it's already a direct digit string (e.g. "45") or float (e.g. "12.5")
  if (!isNaN(parseFloat(clean)) && isFinite(clean)) {
    return parseFloat(clean);
  }

  const parts = clean.split(/\s+/);
  let total = 0;
  let current = 0;
  let hasMatched = false;

  for (const part of parts) {
    if (NUMBER_WORDS[part] !== undefined) {
      hasMatched = true;
      const val = NUMBER_WORDS[part];
      if (val === 100) {
        current = (current || 1) * 100;
      } else if (val === 1000) {
        total += (current || 1) * 1000;
        current = 0;
      } else {
        current += val;
      }
    } else {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        hasMatched = true;
        current += num;
      }
    }
  }

  total += current;
  return hasMatched ? total : null;
}

export function autocorrectText(text, isNumeric = false) {
  let result = text.trim();
  
  if (isNumeric) {
    const parsedNum = wordsToNumber(result);
    if (parsedNum !== null) {
      return String(parsedNum);
    }
    return result;
  }

  // Capitalize abbreviations and terms
  Object.keys(CORRECTIONS).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    result = result.replace(regex, CORRECTIONS[wrong]);
  });

  return result;
}

export default function VoiceInput({ onTranscript, isNumeric = false }) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Configured for Indian accent filters

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const corrected = autocorrectText(transcript, isNumeric);
      onTranscript(corrected);
    };

    recognition.onerror = (err) => {
      console.error('Speech recognition error:', err);
      if (err.error === 'not-allowed') {
        alert('Microphone access blocked. Please enable microphone permission in your browser settings to use dictation.');
      } else if (err.error === 'no-speech') {
        alert('No speech was detected. Please click the mic and try speaking again.');
      } else if (err.error === 'network') {
        alert('Network error occurred during speech recognition. Please check your internet connection.');
      } else {
        alert(`Speech recognition failed: ${err.error}. Please try again.`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      className={`icon-btn mic-btn ${listening ? 'mic-btn--listening' : ''}`}
      onClick={startListening}
      style={{
        padding: '5px',
        fontSize: '13px',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: listening ? 'rgba(235, 87, 87, 0.15)' : 'var(--surface)',
        border: listening ? '1px solid var(--danger)' : '1px solid var(--border)',
        color: listening ? 'var(--danger)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        marginLeft: '5px',
        flexShrink: 0,
      }}
      title={listening ? 'Listening...' : 'Speak to input'}
      aria-label="Speak to input"
    >
      {listening ? '🎙️' : '🎤'}
    </button>
  );
}
