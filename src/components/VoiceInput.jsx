import { useState, useRef, useEffect } from 'react';

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

export async function transcribeAudioWithGemini(base64Audio, modelName, apiKey, mimeType, isNumeric = false) {
  const promptText = isNumeric
    ? "Transcribe the following spoken audio. Return ONLY a single number (integer or decimal) representing what was spoken (e.g. if the user says 'forty five', return '45'). If no number is heard, return empty."
    : "Transcribe the following spoken audio as text. Return ONLY the transcribed text. Correct any spelling or capitalization for standard CAT prep terms (e.g., correct 'dilr' to 'DILR', 'lrdi' to 'LRDI', 'varc' to 'VARC', 'qa' to 'QA', 'simcat' to 'SimCAT', 'ims' to 'IMS', 'cracku' to 'Cracku'). Do not add any conversational remarks.";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: base64Audio
            }
          },
          {
            text: promptText
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `Gemini API call failed for ${modelName}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? text.trim() : '';
}

export async function transcribeAudioWithGroqWhisper(base64Audio, modelName, apiKey, mimeType) {
  // Convert base64 back to Blob
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const audioBlob = new Blob([byteArray], { type: mimeType || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', modelName);
  formData.append('language', 'en');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `Groq Whisper API call failed for ${modelName}`);
  }

  const data = await response.json();
  return data.text || '';
}

export async function transcribeAudioWithFailover(base64Audio, mimeType, isNumeric = false) {
  let lastError = null;

  const models = [
    { provider: 'gemini', name: 'gemini-2.5-flash' },
    { provider: 'gemini', name: 'gemini-2.0-flash' },
    { provider: 'gemini', name: 'gemini-1.5-flash' },
    { provider: 'groq', name: 'whisper-large-v3-turbo' },
    { provider: 'groq', name: 'whisper-large-v3' }
  ];

  for (const model of models) {
    try {
      const rawKey = localStorage.getItem(`${model.provider}_api_key`) || '';
      const apiKey = rawKey.trim();
      if (!apiKey || apiKey === 'null' || apiKey === 'undefined') {
        continue;
      }

      console.log(`Attempting audio transcription using: ${model.provider}/${model.name}`);

      if (model.provider === 'gemini') {
        const transcript = await transcribeAudioWithGemini(base64Audio, model.name, apiKey, mimeType, isNumeric);
        if (transcript) return transcript;
      } else if (model.provider === 'groq') {
        const transcript = await transcribeAudioWithGroqWhisper(base64Audio, model.name, apiKey, mimeType);
        if (transcript) {
          return autocorrectText(transcript, isNumeric);
        }
      }
    } catch (err) {
      console.warn(`Model ${model.provider}/${model.name} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw new Error(lastError?.message || 'All dictation fallback models failed.');
}

export default function VoiceInput({ onTranscript, isNumeric = false }) {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const activeStreamRef = useRef(null);

  // Unmount cleanup to stop active streams and clear timeouts
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore already stopped state errors
        }
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (listening) {
      stopRecording();
      return;
    }

    const geminiKey = (localStorage.getItem('gemini_api_key') || '').trim();
    const groqKey = (localStorage.getItem('groq_api_key') || '').trim();
    
    const hasGemini = geminiKey && geminiKey !== 'null' && geminiKey !== 'undefined';
    const hasGroq = groqKey && groqKey !== 'null' && groqKey !== 'undefined';

    if (!hasGemini && !hasGroq) {
      runSpeechRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
        
        // Stop audio track capture to turn off browser microphone active dot
        stream.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size < 100) return;

        setLoading(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            try {
              const transcript = await transcribeAudioWithFailover(base64data, audioBlob.type, isNumeric);
              if (transcript) {
                onTranscript(transcript);
              }
            } catch (err) {
              console.error('Audio transcription failover error:', err);
              alert(`AI transcribing failed: ${err.message}. Trying browser speech engine...`);
              runSpeechRecognition();
            } finally {
              setLoading(false);
            }
          };
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setListening(true);

      // Auto-stop recording after 30 seconds to prevent infinite recording
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);

    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('Failed to access microphone. Please check browser microphone permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore already stopped state errors
      }
    }
    setListening(false);
  };

  const runSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser and no API keys were found for dictation.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const corrected = autocorrectText(transcript, isNumeric);
      onTranscript(corrected);
    };

    recognition.onerror = (err) => {
      console.error('Browser Speech recognition error:', err);
      if (err.error === 'not-allowed') {
        alert('Microphone access blocked. Please enable microphone permission in browser settings.');
      } else if (err.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else {
        alert('Browser Speech Recognition failed. Please save your Gemini or Groq API Key on the Today tab for a robust dictation fallback.');
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  let btnColor = 'var(--text-secondary)';
  let btnBg = 'var(--surface)';
  let btnBorder = '1px solid var(--border)';
  let btnIcon = '🎤';
  let btnTitle = 'Speak to input';

  if (listening) {
    btnColor = 'var(--danger)';
    btnBg = 'rgba(235, 87, 87, 0.15)';
    btnBorder = '1px solid var(--danger)';
    btnIcon = '⏹️';
    btnTitle = 'Recording... Click to stop and transcribe';
  } else if (loading) {
    btnColor = 'var(--accent)';
    btnBg = 'rgba(74, 144, 226, 0.15)';
    btnBorder = '1px solid var(--accent)';
    btnIcon = '⏳';
    btnTitle = 'Transcribing audio...';
  }

  return (
    <button
      type="button"
      className={`icon-btn mic-btn ${listening ? 'mic-btn--listening' : ''}`}
      onClick={toggleRecording}
      disabled={loading}
      style={{
        padding: '5px',
        fontSize: '13px',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: btnBg,
        border: btnBorder,
        color: btnColor,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        marginLeft: '5px',
        flexShrink: 0,
      }}
      title={btnTitle}
      aria-label={btnTitle}
    >
      {btnIcon}
    </button>
  );
}
