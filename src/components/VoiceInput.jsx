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

// Words to numbers mapping for digit fields
const TEXT_TO_NUMBERS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'forty five': 45, 'fifty': 50, 'sixty': 60,
  'one point five': 1.5, 'two point five': 2.5, 'three point five': 3.5
};

export function autocorrectText(text, isNumeric = false) {
  let result = text.trim();
  
  if (isNumeric) {
    const clean = result.toLowerCase().replace(/[^a-z0-9. ]/g, '').trim();
    if (TEXT_TO_NUMBERS[clean] !== undefined) {
      return String(TEXT_TO_NUMBERS[clean]);
    }
    // Attempt parsing float
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) return String(parsed);
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
