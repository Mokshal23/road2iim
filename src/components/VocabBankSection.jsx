import { useState, useMemo, useEffect } from 'react';
import { addVocabDirectly, toggleVocabMasteryDirect, setVocabMasteryDirect, deleteVocabDirect } from '../hooks/useVocab';
import { updateEntry } from '../hooks/useEntries';
import { updateAeonArticleFields } from '../hooks/useAeonArticles';
import { defineWordWithGemini, generateDailyVocabSuggestions } from '../utils/ai';
import Modal from './Modal';
import { useAppStore } from '../store/useAppStore';

function speakWord(word) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
}

export default function VocabBankSection({ articles = [], entries = [], vocabList = [], studentId, readOnly = false }) {
  const showToast = useAppStore((state) => state.showToast);

  // States
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'learning', 'mastered'
  const [showVocabQuiz, setShowVocabQuiz] = useState(false);

  // Direct Add Form States
  const [directWord, setDirectWord] = useState('');
  const [directMeaning, setDirectMeaning] = useState('');
  const [definingWord, setDefiningWord] = useState(false);
  const [addingWord, setAddingWord] = useState(false);

  // AI Recommendation States
  const [recommendations, setRecommendations] = useState(() => {
    const today = new Date().toISOString().substring(0, 10);
    const cached = localStorage.getItem(`daily_vocab_recommendations_${today}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error('Failed to parse cached recommendations', err);
      }
    }
    return [];
  });
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addingRecWord, setAddingRecWord] = useState(null);

  // Combine vocabulary words from all three sources
  const words = useMemo(() => {
    const all = [];
    
    // 1. From Aeon articles
    const safeArticles = articles || [];
    for (const a of safeArticles) {
      if (a) {
        for (const v of a.vocab || []) {
          if (v?.word) {
            all.push({ 
              ...v, 
              articleTitle: a.title, 
              date: a.date, 
              parentType: 'article', 
              parentId: a.id, 
              fullVocab: a.vocab 
            });
          }
        }
      }
    }

    // 2. From Log sessions (entries)
    const safeEntries = entries || [];
    for (const e of safeEntries) {
      if (e) {
        for (const v of e.vocab || []) {
          if (v?.word) {
            all.push({ 
              ...v, 
              articleTitle: `Practice: ${e.topic}, ${e.date}`, 
              date: e.date, 
              parentType: 'entry', 
              parentId: e.id, 
              fullVocab: e.vocab 
            });
          }
        }
      }
    }

    // 3. From direct vocabulary logs
    const safeVocabList = vocabList || [];
    for (const v of safeVocabList) {
      if (v?.word) {
        all.push({
          ...v,
          articleTitle: 'Direct Addition',
          date: v.createdAt ? v.createdAt.substring(0, 10) : '',
          parentType: 'direct',
          parentId: v.id
        });
      }
    }

    return all.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
  }, [articles, entries, vocabList]);

  // Filter words based on search & filter state
  const filtered = useMemo(() => {
    return words.filter((w) => {
      const matchSearch = w.word.toLowerCase().includes(search.toLowerCase());
      if (filterMode === 'mastered') return matchSearch && w.mastered;
      if (filterMode === 'learning') return matchSearch && !w.mastered;
      return matchSearch;
    });
  }, [words, search, filterMode]);

  // Load / Cache Daily AI Recommendations
  useEffect(() => {
    if (!studentId || recommendations.length > 0) return;

    const fetchSuggestions = async () => {
      setLoadingRecs(true);
      const today = new Date().toISOString().substring(0, 10);
      const cacheKey = `daily_vocab_recommendations_${today}`;
      try {
        const existingWordStrings = words.map(w => w.word.toLowerCase());
        const recs = await generateDailyVocabSuggestions(existingWordStrings);
        setRecommendations(recs);
        localStorage.setItem(cacheKey, JSON.stringify(recs));
      } catch (err) {
        console.error('Error fetching AI vocab suggestions:', err);
        // generateDailyVocabSuggestions already has fallback, but just in case:
        const fallback = [
          { word: 'Anachronism', meaning: 'Something belonging to a period other than that in which it exists', example: 'The dial telephone is an anachronism in today’s smartphone-dominated era.' },
          { word: 'Capricious', meaning: 'Given to sudden and unaccountable changes of mood or behavior', example: 'The stock market can be capricious, shifting direction on a single rumor.' },
          { word: 'Ephemeral', meaning: 'Lasting for a very short time', example: 'The ephemeral beauty of cherry blossoms draws millions of tourists each spring.' },
        ];
        setRecommendations(fallback);
        localStorage.setItem(cacheKey, JSON.stringify(fallback));
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchSuggestions();
  }, [studentId, recommendations.length, words]);

  // Helper check if a word is already in the bank
  const isAlreadyAdded = (word) => {
    return words.some(w => w.word.toLowerCase() === word.toLowerCase());
  };

  // Toggle Mastery
  async function toggleMastery(wordObj) {
    try {
      if (wordObj.parentType === 'direct') {
        await toggleVocabMasteryDirect(wordObj.parentId, wordObj.mastered);
        showToast(`"${wordObj.word}" mastery updated!`, 'success');
      } else {
        const newVocab = wordObj.fullVocab.map(v => 
          v.word === wordObj.word ? { ...v, mastered: !v.mastered } : v
        );
        if (wordObj.parentType === 'article') {
          await updateAeonArticleFields(wordObj.parentId, { vocab: newVocab });
        } else {
          await updateEntry(wordObj.parentId, { vocab: newVocab });
        }
        showToast(`"${wordObj.word}" mastery updated!`, 'success');
      }
    } catch (err) {
      console.error('Failed to toggle mastery:', err);
      showToast('Error updating mastery.', 'error');
    }
  }

  // Delete Direct Vocabulary Word
  async function handleDeleteDirect(wordObj) {
    if (window.confirm(`Are you sure you want to delete "${wordObj.word}" from your vocabulary bank?`)) {
      try {
        await deleteVocabDirect(wordObj.parentId);
        showToast(`"${wordObj.word}" deleted from bank.`, 'success');
      } catch (err) {
        console.error('Failed to delete direct vocab:', err);
        showToast('Error deleting word.', 'error');
      }
    }
  }

  // Auto-define Word with Gemini
  async function handleAutoDefineWord() {
    if (!directWord.trim()) return;
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      showToast('Please save a Gemini API key in the AI Log Zone first!', 'info');
      return;
    }
    setDefiningWord(true);
    try {
      const meaning = await defineWordWithGemini(directWord.trim(), key);
      setDirectMeaning(meaning);
      showToast('Word defined successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch definition automatically. Please type it manually.', 'error');
    } finally {
      setDefiningWord(false);
    }
  }

  // Submit Direct Word Add Form
  async function handleDirectAddSubmit(e) {
    e.preventDefault();
    if (!directWord.trim() || !directMeaning.trim()) return;

    if (isAlreadyAdded(directWord.trim())) {
      showToast(`"${directWord.trim()}" is already in your vocabulary bank!`, 'info');
      return;
    }

    setAddingWord(true);
    try {
      await addVocabDirectly({
        word: directWord.trim(),
        meaning: directMeaning.trim()
      });
      showToast(`"${directWord.trim()}" added to vocabulary bank!`, 'success');
      setDirectWord('');
      setDirectMeaning('');
    } catch (err) {
      console.error('Failed to add word directly:', err);
      showToast(err.message || 'Failed to add word.', 'error');
    } finally {
      setAddingWord(false);
    }
  }

  // Add Recommended Word to Bank
  async function handleAddRecommendation(rec) {
    setAddingRecWord(rec.word);
    try {
      await addVocabDirectly({
        word: rec.word,
        meaning: rec.meaning
      });
      showToast(`"${rec.word}" added to vocabulary bank!`, 'success');
    } catch (err) {
      console.error('Failed to add recommendation:', err);
      showToast('Failed to add recommended word.', 'error');
    } finally {
      setAddingRecWord(null);
    }
  }

  return (
    <div className="vocab-bank-layout-container">
      {/* Top Banner Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Vocab Bank</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Manage and revise vocabulary logged from Aeon readings, practice sessions, or added directly.
          </p>
        </div>
        {words.length > 0 && (
          <button 
            className="btn btn--primary vocab-revision-quiz-btn" 
            onClick={() => setShowVocabQuiz(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🧠 Play Revision Quiz ({words.length})
          </button>
        )}
      </div>

      <div className="vocab-bank-grid">
        {/* Left Side: Form and Recommendations */}
        <div className="vocab-bank-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Direct Add Form */}
          {!readOnly && (
            <div className="card">
              <h3>Add Word Directly</h3>
              <p className="insight" style={{ marginBottom: '16px' }}>
                Expand your custom vocabulary vault. Enter any word and definition, or let Gemini define it for you.
              </p>
              
              <form onSubmit={handleDirectAddSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Word</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Enter word…" 
                        value={directWord} 
                        onChange={(e) => setDirectWord(e.target.value)}
                        style={{ flex: 1 }}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={handleAutoDefineWord}
                        disabled={definingWord || !directWord.trim()}
                        style={{ whiteSpace: 'nowrap', padding: '0 12px', fontSize: '13px' }}
                      >
                        {definingWord ? 'Defining...' : '✨ Auto-define'}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Meaning</label>
                    <textarea 
                      placeholder="Enter meaning/definition…" 
                      value={directMeaning} 
                      onChange={(e) => setDirectMeaning(e.target.value)}
                      style={{ 
                        width: '100%', 
                        minHeight: '60px', 
                        padding: '8px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border)', 
                        background: 'var(--surface)', 
                        color: 'var(--text)',
                        fontFamily: 'inherit'
                      }}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn--primary" 
                    disabled={addingWord || !directWord.trim() || !directMeaning.trim()}
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    {addingWord ? 'Adding word...' : '+ Add to bank'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="card">
            <h3>AI Recommendations for Today</h3>
            <p className="insight" style={{ marginBottom: '16px' }}>
              Three high-yield CAT vocabulary words generated dynamically.
            </p>
            
            {loadingRecs ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="spinner" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>⏳</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Generating recommendations...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recommendations.map((rec, i) => {
                  const added = isAlreadyAdded(rec.word);
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)', 
                        background: 'var(--bg)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <strong style={{ fontSize: '14.5px', color: 'var(--primary)' }}>{rec.word}</strong>
                          <span className="badge" style={{ marginLeft: '8px', fontSize: '9px', verticalAlign: 'middle', background: 'rgba(31, 133, 119, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>CAT Prep</span>
                        </div>
                        {!readOnly && (
                          <button 
                            className={`btn ${added ? 'btn--ghost' : 'btn--primary'} btn--sm`}
                            disabled={added || addingRecWord === rec.word}
                            onClick={() => handleAddRecommendation(rec)}
                            style={{ padding: '2px 8px', fontSize: '11.5px' }}
                          >
                            {addingRecWord === rec.word ? 'Adding...' : added ? 'Added ✓' : '+ Add'}
                          </button>
                        )}
                      </div>
                      <p style={{ margin: '6px 0 4px', fontSize: '12.5px', color: 'var(--text)' }}>
                        <strong>Meaning:</strong> {rec.meaning}
                      </p>
                      {rec.example && (
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          &ldquo;{rec.example}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Vocab List */}
        <div className="vocab-bank-col-right card">
          <div className="card__head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <h3 style={{ margin: 0 }}>Vocab Bank List ({words.length})</h3>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder="Search words…" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  style={{ flex: 1 }}
                />
                <select 
                  value={filterMode} 
                  onChange={(e) => setFilterMode(e.target.value)}
                  style={{ width: '130px', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                >
                  <option value="all">Show All</option>
                  <option value="learning">Need Practice</option>
                  <option value="mastered">Mastered</option>
                </select>
              </div>
            </div>
          </div>
          
          {filtered.length === 0 ? (
            <p className="empty" style={{ margin: '24px 0' }}>No words match yet.</p>
          ) : (
            <ul className="vocab-bank-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filtered.map((w, i) => (
                <li 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderBottom: '1px solid var(--border)',
                    background: w.mastered ? 'rgba(54, 143, 99, 0.02)' : 'transparent'
                  }}
                >
                  <button 
                    type="button"
                    onClick={() => toggleMastery(w)}
                    disabled={readOnly}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: readOnly ? 'default' : 'pointer', 
                      fontSize: '16px',
                      marginRight: '12px',
                      padding: 0,
                      color: w.mastered ? 'var(--success)' : 'var(--text-secondary)'
                    }}
                    title={w.mastered ? "Mark as Learning" : "Mark as Mastered"}
                  >
                    {w.mastered ? '✓' : '○'}
                  </button>
                  
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <strong style={w.mastered ? { color: 'var(--success)' } : {}}>{w.word}</strong>
                    <button
                      type="button"
                      onClick={() => speakWord(w.word)}
                      aria-label={`Pronounce ${w.word}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 4px',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        lineHeight: 1
                      }}
                      title="Listen to pronunciation"
                    >
                      🔊
                    </button>
                    {w.meaning && <span className="vocab-bank-list__meaning" style={{ color: 'var(--text)' }}> — {w.meaning}</span>}
                    <span 
                      className="vocab-bank-list__source" 
                      style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-secondary)', 
                        background: 'var(--surface)', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        marginLeft: '6px',
                        border: '1px solid var(--border)',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={w.articleTitle}
                    >
                      {w.articleTitle}
                    </span>
                  </div>

                  {/* Deletion Option for Direct Words */}
                  {!readOnly && w.parentType === 'direct' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDirect(w)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginLeft: '12px',
                        padding: '4px',
                        color: 'var(--danger)',
                        opacity: 0.7
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = 0.7}
                      title="Delete word from bank"
                    >
                      🗑️
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Revision Quiz Modal */}
      {showVocabQuiz && (
        <Modal title="Vocab Revision Quiz" onClose={() => setShowVocabQuiz(false)}>
          <VocabQuizModal 
            articles={articles} 
            entries={entries} 
            vocabList={vocabList} 
            onClose={() => setShowVocabQuiz(false)} 
          />
        </Modal>
      )}
    </div>
  );
}

// Internal Revision Quiz Component
function VocabQuizModal({ articles, entries, vocabList, onClose }) {
  const [mode, setMode] = useState('select'); 
  const [poolType, setPoolType] = useState('all'); 
  const [shuffledWords, setShuffledWords] = useState([]);
  
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({}); 
  const [mcqScore, setMcqScore] = useState(0);

  // Compile words pool for the quiz
  const allWords = useMemo(() => {
    const list = [];
    
    // 1. From articles
    for (const a of articles || []) {
      for (const v of a.vocab || []) {
        if (v.word && v.meaning) {
          list.push({ ...v, parentType: 'article', parentId: a.id, fullVocab: a.vocab });
        }
      }
    }

    // 2. From entries
    for (const e of entries || []) {
      for (const v of e.vocab || []) {
        if (v.word && v.meaning) {
          list.push({ ...v, parentType: 'entry', parentId: e.id, fullVocab: e.vocab });
        }
      }
    }

    // 3. From direct additions
    for (const v of vocabList || []) {
      if (v.word && v.meaning) {
        list.push({ ...v, parentType: 'direct', parentId: v.id });
      }
    }

    return list;
  }, [articles, entries, vocabList]);

  function startQuiz(selectedMode) {
    let pool = [...allWords];
    if (poolType === 'unmastered') {
      pool = pool.filter(w => !w.mastered);
    }
    
    if (pool.length === 0) {
      alert(poolType === 'unmastered' ? 'No unmastered words found!' : 'No vocabulary words found. Please log some articles or add words directly first.');
      return;
    }

    const shuffled = pool.sort(() => 0.5 - Math.random());
    setShuffledWords(shuffled);

    if (selectedMode === 'flashcard') {
      setFlashcardIdx(0);
      setFlipped(false);
      setMode('flashcard');
    } else if (selectedMode === 'mcq') {
      const qCount = Math.min(10, shuffled.length);
      const questions = [];
      
      const fallbackDistractors = [
        "To praise highly or speak of with approval",
        "A state of temporary disuse or suspension",
        "Showing a rude and arrogant lack of respect",
        "Making or constituting a disturbingly harsh and loud noise",
        "Very attentive to and concerned about accuracy and detail",
        "Not revealing one's thoughts or feelings readily",
        "Make someone feel isolated or estranged",
        "An item of additional material at the end of a document"
      ];

      for (let i = 0; i < qCount; i++) {
        const word = shuffled[i];
        
        let otherMeanings = allWords
          .filter(w => w.word !== word.word)
          .map(w => w.meaning);
        
        otherMeanings = [...new Set(otherMeanings)];

        if (otherMeanings.length < 3) {
          otherMeanings = [...otherMeanings, ...fallbackDistractors];
        }

        const distractors = otherMeanings
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        const optionsList = [word.meaning, ...distractors]
          .sort(() => 0.5 - Math.random());

        questions.push({
          wordObj: word,
          options: optionsList,
          correctIdx: optionsList.indexOf(word.meaning)
        });
      }

      setMcqQuestions(questions);
      setMcqIdx(0);
      setMcqAnswers({});
      setMcqScore(0);
      setMode('mcq');
    }
  }

  async function markMastery(wordObj, isMastered) {
    try {
      if (wordObj.parentType === 'direct') {
        await setVocabMasteryDirect(wordObj.parentId, isMastered);
      } else {
        const newVocab = wordObj.fullVocab.map(v => 
          v.word === wordObj.word ? { ...v, mastered: isMastered } : v
        );
        if (wordObj.parentType === 'article') {
          await updateAeonArticleFields(wordObj.parentId, { vocab: newVocab });
        } else {
          await updateEntry(wordObj.parentId, { vocab: newVocab });
        }
      }
    } catch (err) {
      console.error('Failed to update mastery during quiz:', err);
    }
  }

  function handleFlashcardNext(mastered) {
    const currentWord = shuffledWords[flashcardIdx];
    markMastery(currentWord, mastered);
    setFlipped(false);
    setTimeout(() => {
      setFlashcardIdx(prev => prev + 1);
    }, 150);
  }

  function handleMcqSelect(optionIdx) {
    if (mcqAnswers[mcqIdx] !== undefined) return;
    const correctIdx = mcqQuestions[mcqIdx].correctIdx;
    setMcqAnswers(prev => ({ ...prev, [mcqIdx]: optionIdx }));
    if (optionIdx === correctIdx) {
      setMcqScore(prev => prev + 1);
    }
  }

  function handleMcqNext() {
    if (mcqIdx < mcqQuestions.length - 1) {
      setMcqIdx(prev => prev + 1);
    } else {
      setMode('mcq-finished');
    }
  }

  return (
    <div>
      {mode === 'select' && (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13.5px' }}>
            Revise your saved vocabulary words. Total words in bank: <strong>{allWords.length}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
            <label style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="vocab-pool" 
                checked={poolType === 'all'} 
                onChange={() => setPoolType('all')} 
              />
              All Words
            </label>
            <label style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="vocab-pool" 
                checked={poolType === 'unmastered'} 
                onChange={() => setPoolType('unmastered')} 
              />
              Need Practice ({allWords.filter(w => !w.mastered).length})
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card hoverable" onClick={() => startQuiz('flashcard')} style={{ cursor: 'pointer', textAlign: 'center', padding: '24px 16px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>🎴</span>
              <strong style={{ fontSize: '14px', fontWeight: 600 }}>Flashcards Mode</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Flip card to reveal meaning and mark as Mastered / Need Practice.</p>
            </div>
            
            <div className="card hoverable" onClick={() => startQuiz('mcq')} style={{ cursor: 'pointer', textAlign: 'center', padding: '24px 16px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📝</span>
              <strong style={{ fontSize: '14px', fontWeight: 600 }}>Multiple Choice Quiz</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Test your comprehension with 10 random words from your bank.</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'flashcard' && (
        <div>
          {flashcardIdx < shuffledWords.length ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>Word {flashcardIdx + 1} of {shuffledWords.length}</span>
                <span>Pool: {poolType === 'unmastered' ? 'Unmastered' : 'All'}</span>
              </div>
              
              <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${((flashcardIdx + 1) / shuffledWords.length) * 100}%` }}></div>
              </div>

              <div className="flashcard-container" onClick={() => setFlipped(!flipped)}>
                <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
                  <div className="flashcard-front">
                    <h2>{shuffledWords[flashcardIdx].word}</h2>
                    <span className="flashcard-hint">Click card to reveal meaning</span>
                  </div>
                  <div className="flashcard-back">
                    <h2 style={{ fontSize: '20px', color: 'var(--blue)', marginBottom: '12px' }}>{shuffledWords[flashcardIdx].word}</h2>
                    <p style={{ fontSize: '14.5px', color: 'var(--text)' }}>{shuffledWords[flashcardIdx].meaning}</p>
                    <span className="flashcard-hint" style={{ marginTop: 'auto', color: 'var(--text-secondary)' }}>Click to flip back</span>
                  </div>
                </div>
              </div>

              {flipped && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
                  <button className="btn btn--ghost" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(189,72,86,0.05)' }} onClick={() => handleFlashcardNext(false)}>
                    ❌ Need Practice
                  </button>
                  <button className="btn btn--primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleFlashcardNext(true)}>
                    ✅ Mastered
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🎉</span>
              <h4>Practice Completed!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '0 0 20px' }}>
                You reviewed all {shuffledWords.length} words in this session.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn--primary" onClick={() => setMode('select')}>Back to Selector</button>
                <button className="btn btn--ghost" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'mcq' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>Question {mcqIdx + 1} of {mcqQuestions.length}</span>
            <span>Score: {mcqScore} / {mcqQuestions.length}</span>
          </div>

          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((mcqIdx + 1) / mcqQuestions.length) * 100}%` }}></div>
          </div>

          <div className="card" style={{ background: 'var(--bg)', marginBottom: '16px', padding: '18px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Define the word</span>
            <h2 style={{ fontSize: '24px', margin: '6px 0 0', fontWeight: 700 }}>{mcqQuestions[mcqIdx].wordObj.word}</h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {mcqQuestions[mcqIdx].options.map((option, idx) => {
              const selectedIdx = mcqAnswers[mcqIdx];
              const isSelected = selectedIdx === idx;
              const isCorrect = mcqQuestions[mcqIdx].correctIdx === idx;

              let optClass = 'quiz-option';
              if (selectedIdx !== undefined) {
                if (isCorrect) optClass += ' quiz-option--correct';
                else if (isSelected) optClass += ' quiz-option--wrong';
              }

              return (
                <button
                  key={idx}
                  className={optClass}
                  disabled={selectedIdx !== undefined}
                  onClick={() => handleMcqSelect(idx)}
                >
                  <span className="quiz-option__label">{String.fromCharCode(65 + idx)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {mcqAnswers[mcqIdx] !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13.5px', color: mcqAnswers[mcqIdx] === mcqQuestions[mcqIdx].correctIdx ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {mcqAnswers[mcqIdx] === mcqQuestions[mcqIdx].correctIdx ? '✓ Correct!' : '❌ Incorrect'}
              </span>
              <button className="btn btn--primary" onClick={handleMcqNext}>
                {mcqIdx === mcqQuestions.length - 1 ? 'Finish Quiz' : 'Next Question ➔'}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'mcq-finished' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🏆</span>
          <h4>Quiz Finished!</h4>
          <h2 style={{ fontSize: '32px', margin: '10px 0', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {mcqScore} / {mcqQuestions.length} Correct
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '0 0 20px', lineHeight: 1.4 }}>
            {mcqScore === mcqQuestions.length ? '🎓 Perfect score! You have completely mastered these words.' :
             mcqScore >= mcqQuestions.length * 0.7 ? '👍 Nice job! Keep practicing to get 100% accuracy.' :
             '📚 Spend more time with flashcards to reinforce word meanings.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn--primary" onClick={() => setMode('select')}>Back to Selector</button>
            <button className="btn btn--ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
