import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Database, History, Terminal, BarChart3, Info, Loader2, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const App = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null); // last answer shown in evidence panel
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]); // running chat-style list of Q&A

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/history?limit=20');
        const items = res.data?.history || [];
        setHistory(items);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    fetchHistory();
  }, []);

  const deleteHistoryItem = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/history/${id}`);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const clearHistory = async () => {
    try {
      const ids = history.map((h) => h.id);
      await Promise.all(
        ids.map((id) => axios.delete(`http://127.0.0.1:8000/history/${id}`))
      );
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const executeQuery = async (searchQuery = query) => {
    if (!searchQuery) return;
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post('http://127.0.0.1:8000/ask', { query: searchQuery });
      const payload = {
        id: Date.now(),
        question: searchQuery,
        ...response.data,
      };

      setResult(response.data);
      setMessages(prev => [...prev, payload]);
      setQuery("");
      
      setHistory(prev => {
        const existing = prev.filter((h) => h.question !== searchQuery);
        const fromBackend = (response.data.historyItem || null);
        const newItem = fromBackend || { id: Date.now(), question: searchQuery, created_at: new Date().toISOString() };
        return [newItem, ...existing].slice(0, 20);
      });
    } catch (err) {
      console.error("Backend Connection Error:", err);
      setError("We couldn't reach the analytics backend. Make sure the FastAPI server is running on http://127.0.0.1:8000 and then try again.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoCircle}>
              <BarChart3 size={18} color="#0F172A" />
            </div>
            <div>
              <div style={styles.headerTitle}>CoPoint AI</div>
              <div style={styles.headerSubtitle}>Natural language analytics on your warehouse</div>
            </div>
          </div>
          <div style={styles.headerRight}>
          </div>
        </header>

        <div style={styles.layout}>
          {/* LEFT PANE: HISTORY */}
          <aside style={styles.paneSideLeft}>
            <div style={styles.historyHeaderRow}>
              <h3 style={styles.paneTitle}>
                <History size={14} />
                <span>Recent questions</span>
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  style={styles.clearHistoryButton}
                  onClick={clearHistory}
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 && (
              <p style={styles.emptyHistory}>Your last 20 questions will show up here.</p>
            )}
            {history.map((item) => (
              <div
                key={item.id}
                style={styles.historyItem}
                onClick={() => executeQuery(item.question)}
              >
                <div style={styles.historyItemMain}>
                  <span style={styles.historyBullet} />
                  <span style={styles.historyText}>{item.question}</span>
                </div>
                <button
                  type="button"
                  style={styles.historyDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </aside>

          {/* CENTER PANE: CHAT & VISUALS */}
          <main style={styles.paneMain}>
            <div style={styles.mainTop}>
              {messages.length === 0 && (
                <>
                  <div style={styles.mainTitleRow}>
                    <div>
                      <div style={styles.mainTitle}>Ask your data a question</div>
                      <div style={styles.mainSubtitle}>
                        Describe the business question in plain English. CoPoint will generate SQL,
                        run it, and explain the results.
                      </div>
                    </div>
                  </div>

                  <div style={styles.suggestionRow}>
                    {[
                      "How did Q4 revenue trend month over month?",
                      "Which shipping methods drive the highest ratings?",
                      "What are the top 5 categories by revenue?",
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        style={styles.suggestionChip}
                        onClick={() => executeQuery(s)}
                      >
                        <Search size={14} />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={styles.chatDisplay}>
              {loading ? (
                <div style={styles.loadingArea}>
                  <Loader2 size={40} className="spinner" style={styles.spinner} />
                  <p style={styles.loadingText}>Running analysis against your warehouse…</p>
                </div>
              ) : messages.length > 0 ? (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} style={styles.insightCard}>
                      <div style={styles.cardHeader}>
                        <Info size={14} />
                        <span>Grounded insight</span>
                      </div>
                      <div style={styles.questionText}>Q: {msg.question}</div>
                      <p style={styles.answerText}>{msg.answer}</p>

                      <div style={styles.vizRow}>
                        <div style={styles.vizBox}>
                          <div style={styles.sectionLabel}>Key metric view</div>
                          {msg.chartData && msg.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                  dataKey="name"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: '#6B7280', fontSize: 11 }}
                                />
                                <YAxis
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: '#6B7280', fontSize: 11 }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    borderRadius: 8,
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
                                    fontSize: 12,
                                  }}
                                  cursor={{ fill: '#F9FAFB' }}
                                />
                                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={styles.noViz}>No chartable metric detected for this question.</div>
                          )}
                        </div>

                        {msg.previewRows && msg.previewRows.length > 0 && (
                          <div style={styles.tableBox}>
                            <div style={styles.sectionLabel}>Result preview</div>
                            <div style={styles.tableWrapper}>
                              <table style={styles.table}>
                                <thead>
                                  <tr>
                                    {(msg.columns || []).map((col) => (
                                      <th key={col.name} style={styles.th}>{col.name}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.previewRows.map((row, idx) => (
                                    <tr key={idx}>
                                      {(msg.columns || []).map((col) => (
                                        <td key={col.name} style={styles.td}>
                                          {row[col.name]}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : error ? (
                <div style={styles.errorState}>
                  <h2 style={styles.errorTitle}>Unable to run your question</h2>
                  <p style={styles.errorBody}>{error}</p>
                </div>
              ) : (
                <div style={styles.welcome}>
                  <BarChart3 size={56} color="#2563EB" style={{ marginBottom: '18px' }} />
                  <h2 style={styles.welcomeTitle}>Turn questions into warehouse-ready SQL</h2>
                  <p style={styles.welcomeBody}>
                    Ask about growth, retention, shipping, or any metric in your retail dataset.
                    CoPoint will translate your intent into safe, optimized queries.
                  </p>
                </div>
              )}
            </div>

            {/* INPUT BAR */}
            <div style={styles.inputContainer}>
              <div style={styles.inputShell}>
                <Search size={30} color="#9CA3AF" />
                <input
                  style={styles.input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      executeQuery();
                    }
                  }}
                  placeholder="Ask a business question, e.g. “How did Q4 revenue trend by month?”"
                />
              </div>
              <button
                style={styles.button}
                onClick={() => executeQuery()}
                disabled={loading}
              >
                {loading ? "Running…" : "Run query"}
              </button>
            </div>
          </main>

          {/* RIGHT PANE: EVIDENCE */}
          <aside style={styles.paneSideRight}>
            <h3 style={styles.paneTitle}>
              <Terminal size={20} />
              <span>SQL & lineage</span>
            </h3>
            {result ? (
              <>
                <label style={styles.label}>Generated SQL</label>
                <pre style={styles.code}>{result.sql}</pre>
                <label style={styles.label}>Data sources</label>
                {(result.citations || []).map((c, i) => (
                  <div key={i} style={styles.cite}>
                    <Database size={12} color="#2563EB" />
                    <span>{c}</span>
                  </div>
                ))}
              </>
            ) : (
              <p style={styles.placeholder}>
                When you run a question, the exact SQL and referenced tables will appear here for review.
              </p>
            )}
          </aside>
        </div>

        {/* CSS for Spinner Rotation */}
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .spinner { animation: spin 1.2s linear infinite; }
        `}</style>
      </div>
    </div>
  );
};

const styles = {
  app: {
    height: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
    background: 'radial-gradient(circle at top left, #0F172A, #020617)',
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#020617',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  shell: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.96))',
    borderRadius: 0,
    borderTop: '1px solid rgba(148,163,184,0.25)',
    boxShadow: '0 0 0 rgba(0,0,0,0)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(31,41,55,0.9)',
    background: 'linear-gradient(90deg, rgba(15,23,42,0.98), rgba(15,23,42,0.9))',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#E5E7EB',
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #38BDF8, #6366F1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 30px rgba(37,99,235,0.7)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  envBadge: {
    fontSize: 30,
    padding: '7px 14px',
    borderRadius: 999,
    border: '1px solid rgba(148,163,184,0.6)',
    color: '#E5E7EB',
    background: 'rgba(15,23,42,0.85)',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '230px minmax(0, 1.4fr) 320px',
    minHeight: 0,
    flex: 1,
    maxHeight: '100%',
    overflow: 'hidden',
    background: 'radial-gradient(circle at top left, rgba(15,23,42,1), rgba(15,23,42,0.98))',
  },
  paneSideLeft: {
    borderRight: '1px solid rgba(31,41,55,0.9)',
    padding: '18px 14px 20px',
    background: 'radial-gradient(circle at top, rgba(15,23,42,1), rgba(15,23,42,0.98))',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  historyHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  paneSideRight: {
    borderLeft: '1px solid rgba(31,41,55,0.9)',
    padding: '18px 18px 20px',
    background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,1))',
    color: '#CBD5F5',
    display: 'flex',
    flexDirection: 'column',
  },
  paneMain: {
    padding: '12px 18px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#E5E7EB',
    minHeight: 0,
  },
  paneTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyHistory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(31,41,55,0.6)',
    background: 'radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(15,23,42,0.4))',
    color: '#D1D5DB',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    overflow: 'hidden',
  },
  historyItemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  historyBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: 'linear-gradient(135deg, #22C55E, #4ADE80)',
  },
  historyText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0,
  },
  historyDelete: {
    border: 'none',
    background: 'transparent',
    color: '#6B7280',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearHistoryButton: {
    border: 'none',
    background: 'transparent',
    color: '#9CA3AF',
    fontSize: 11,
    cursor: 'pointer',
    padding: 2,
  },
  mainTop: {
    marginBottom: 4,
  },
  mainTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#F9FAFB',
  },
  mainSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
    maxWidth: 520,
  },
  suggestionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    borderRadius: 999,
    border: '1px solid rgba(55,65,81,0.8)',
    background: 'rgba(31,41,55,0.9)',
    color: '#D1D5DB',
    fontSize: 13,
    cursor: 'pointer',
  },
  chatDisplay: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
  },
  loadingArea: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#E5E7EB',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  spinner: {
    marginBottom: 4,
    color: '#60A5FA',
  },
  welcome: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 40px',
    color: '#E5E7EB',
  },
  welcomeTitle: {
    fontSize: 23,
    fontWeight: 600,
    marginBottom: 8,
  },
  welcomeBody: {
  errorState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '0 40px',
    color: '#FCA5A5',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
    color: '#FCA5A5',
  },
  errorBody: {
    fontSize: 15,
    color: '#FECACA',
    maxWidth: 520,
  },
    fontSize: 15,
    color: '#9CA3AF',
    maxWidth: 520,
  },
  insightCard: {
    background: 'radial-gradient(circle at top left, rgba(15,23,42,0.9), rgba(15,23,42,0.85))',
    borderRadius: 18,
    border: '1px solid rgba(55,65,81,0.9)',
    padding: 20,
    boxShadow: '0 22px 50px rgba(15,23,42,0.7)',
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#BFDBFE',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    letterSpacing: 1.2,
  },
  answerText: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  vizRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
    gap: 12,
    alignItems: 'stretch',
  },
  vizBox: {
    padding: 12,
    background: 'rgba(15,23,42,0.9)',
    borderRadius: 10,
    border: '1px solid rgba(55,65,81,0.9)',
  },
  tableBox: {
    padding: 12,
    background: 'rgba(15,23,42,0.9)',
    borderRadius: 10,
    border: '1px solid rgba(55,65,81,0.9)',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  tableWrapper: {
    maxHeight: 220,
    overflow: 'auto',
    borderRadius: 6,
    border: '1px solid rgba(31,41,55,0.9)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    position: 'sticky',
    top: 0,
    background: 'rgba(15,23,42,0.98)',
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '1px solid rgba(31,41,55,0.9)',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  td: {
  questionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 6,
  },
    padding: '9px 12px',
    borderBottom: '1px solid rgba(31,41,55,0.8)',
    color: '#E5E7EB',
    whiteSpace: 'nowrap',
  },
  inputContainer: {
    display: 'flex',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 2,
    alignItems: 'center',
  },
  inputShell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    borderRadius: 999,
    border: '1px solid rgba(55,65,81,0.9)',
    background: 'rgba(15,23,42,0.95)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F9FAFB',
    fontSize: 14,
  },
  button: {
    padding: '14px 24px',
    borderRadius: 999,
    border: 'none',
    background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: 110,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9CA3AF',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  code: {
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    padding: 10,
    fontSize: 13,
    borderRadius: 10,
    overflowX: 'auto',
    border: '1px solid rgba(31,41,55,0.9)',
    maxHeight: 260,
  },
  cite: {
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    color: '#E5E7EB',
  },
  placeholder: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  noViz: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    padding: '20px 8px',
  },
};

export default App;