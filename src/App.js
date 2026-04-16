import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Database, History, Terminal, BarChart3, Info, Loader2, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const App = () => {
  // Your Live Azure Backend Domain
  const BACKEND_URL = 'https://utcapstone-backend-akh2c2cjdua3hfa8.canadacentral-01.azurewebsites.net';

  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null); // last answer shown in evidence panel
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]); // running chat-style list of Q&A

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/history?limit=20`);
        const items = res.data?.history || [];
        setHistory(items);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    fetchHistory();
  }, [BACKEND_URL]);

  const deleteHistoryItem = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/history/${id}`);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const clearHistory = async () => {
    try {
      const ids = history.map((h) => h.id);
      await Promise.all(
        ids.map((id) => axios.delete(`${BACKEND_URL}/history/${id}`))
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
      const recentHistory = messages.slice(-10).map(msg => ({
        question: msg.question,
        answer: msg.answer,
        sql: msg.sql || "",
      }));

      const response = await axios.post(`${BACKEND_URL}/ask`, {
        query: searchQuery,
        conversation_history: recentHistory,
      });

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
      setError(`Backend Error: Could not reach CoPoint Intelligence at ${BACKEND_URL}. Ensure your backend CORS settings allow this frontend domain.`);
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
                  placeholder="Ask a business question..."
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
    fontFamily: "'Inter', sans-serif",
    color: '#020617',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  shell: {
    height: '100%',
    width: '100%',
    background: 'rgba(15,23,42,0.96)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(31,41,55,0.9)',
    background: 'rgba(15,23,42,0.98)',
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
    boxShadow: '0 8px 20px rgba(37,99,235,0.5)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 600,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '230px minmax(0, 1.4fr) 320px',
    flex: 1,
    overflow: 'hidden',
  },
  paneSideLeft: {
    borderRight: '1px solid rgba(31,41,55,0.9)',
    padding: '18px 14px',
    background: 'rgba(15,23,42,1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  paneSideRight: {
    borderLeft: '1px solid rgba(31,41,55,0.9)',
    padding: '18px',
    background: 'rgba(15,23,42,0.98)',
    color: '#CBD5F5',
    display: 'flex',
    flexDirection: 'column',
  },
  paneMain: {
    padding: '12px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#E5E7EB',
    overflow: 'hidden',
  },
  paneTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptyHistory: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(31,41,55,0.4)',
    color: '#D1D5DB',
    fontSize: 12,
    cursor: 'pointer',
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
    background: '#22C55E',
  },
  historyText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  historyDelete: {
    background: 'transparent',
    border: 'none',
    color: '#6B7280',
    cursor: 'pointer',
  },
  clearHistoryButton: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    fontSize: 10,
    cursor: 'pointer',
  },
  mainTop: {
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#F9FAFB',
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  suggestionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(31,41,55,1)',
    border: '1px solid rgba(55,65,81,1)',
    color: '#D1D5DB',
    fontSize: 12,
    cursor: 'pointer',
  },
  chatDisplay: {
    flex: 1,
    overflowY: 'auto',
  },
  loadingArea: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9CA3AF',
  },
  spinner: {
    color: '#3B82F6',
    marginBottom: 10,
  },
  welcome: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '0 40px',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 8,
  },
  welcomeBody: {
    fontSize: 14,
    color: '#9CA3AF',
    maxWidth: 480,
  },
  insightCard: {
    background: 'rgba(31,41,55,0.5)',
    borderRadius: 12,
    padding: 20,
    border: '1px solid rgba(55,65,81,0.5)',
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: '#60A5FA',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  vizRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  vizBox: {
    background: 'rgba(15,23,42,0.8)',
    padding: 16,
    borderRadius: 8,
  },
  tableBox: {
    background: 'rgba(15,23,42,0.8)',
    padding: 16,
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  tableWrapper: {
    maxHeight: 240,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    textAlign: 'left',
    padding: '8px',
    borderBottom: '1px solid #334155',
    color: '#94A3B8',
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #1E293B',
  },
  inputContainer: {
    display: 'flex',
    gap: 10,
    padding: '16px 0',
  },
  inputShell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#0F172A',
    padding: '0 16px',
    borderRadius: 8,
    border: '1px solid #334155',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'white',
    height: 48,
    fontSize: 14,
    outline: 'none',
  },
  button: {
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '0 24px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  code: {
    background: '#020617',
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    color: '#E2E8F0',
    overflowX: 'auto',
    border: '1px solid #1E293B',
  },
  cite: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    marginTop: 8,
  },
  placeholder: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 1.5,
  },
  errorState: {
    textAlign: 'center',
    padding: '40px',
  },
  errorTitle: {
    fontSize: 18,
    color: '#F87171',
    marginBottom: 8,
  },
  errorBody: {
    color: '#94A3B8',
    fontSize: 14,
  },
};

export default App;
