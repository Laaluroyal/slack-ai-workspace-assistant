const TOOLS = [
  { name: 'list_channels', desc: 'List public and private channels', params: '{ "limit": 100 }' },
  { name: 'get_channel_messages', desc: 'Fetch message history from a channel', params: '{ "channel": "C0BCWEU3WJU", "limit": 50 }' },
  { name: 'search_messages', desc: 'Search messages across the workspace', params: '{ "query": "keyword", "count": 20 }' },
  { name: 'get_thread', desc: 'Get replies in a thread', params: '{ "channel": "C0BCWEU3WJU", "thread_ts": "1234567890.000100" }' },
  { name: 'get_user', desc: 'Get a user profile', params: '{ "user": "U12345" }' },
  { name: 'list_users', desc: 'List workspace users', params: '{ "limit": 100 }' },
  { name: 'get_files', desc: 'List files shared in the workspace', params: '{ "limit": 20 }' },
  { name: 'send_message', desc: 'Post a message to a channel', params: '{ "channel": "C0BCWEU3WJU", "text": "Hello!" }' },
  { name: 'reply_to_thread', desc: 'Reply to a thread', params: '{ "channel": "C0BCWEU3WJU", "thread_ts": "...", "text": "Reply" }' },
  { name: 'create_channel_post', desc: 'Post with Block Kit layout', params: '{ "channel": "C0BCWEU3WJU", "text": "Fallback", "blocks": "[]" }' },
  { name: 'send_dm', desc: 'Send a direct message to a user', params: '{ "user_id": "U12345", "text": "Hey!" }' },
  { name: 'channel_activity', desc: 'Analyze message activity per channel', params: '{ "limit": 5 }' },
  { name: 'user_activity', desc: 'Rank users by message participation', params: '{ "limit": 10 }' },
  { name: 'thread_metrics', desc: 'Thread responsiveness and unanswered threads', params: '{ "channel": "C0BCWEU3WJU" }' },
]

export default function Home() {
  return (
    <main style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: 960,
      margin: '0 auto',
      padding: '3rem 1.5rem',
      color: '#111',
    }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem' }}>⚡</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Slack AI Workspace Assistant
          </h1>
        </div>
        <p style={{ color: '#555', margin: 0, fontSize: '1rem' }}>
          REST API for Slack workspace operations — built for AI agent integrations
        </p>
      </header>

      <section style={{
        background: '#f9f9f9',
        border: '1px solid #e5e5e5',
        borderRadius: 10,
        padding: '1.25rem 1.5rem',
        marginBottom: '2.5rem',
      }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginTop: 0, marginBottom: '0.75rem' }}>
          Endpoint
        </h2>
        <code style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a2e' }}>
          POST /api/slack
        </code>
        <p style={{ color: '#555', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
          Send a JSON body with a <code style={{ background: '#eee', padding: '0.1em 0.3em', borderRadius: 3 }}>tool</code> field
          and any required parameters. Returns JSON.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '1rem' }}>
          Example
        </h2>
        <pre style={{
          background: '#1a1a2e',
          color: '#e8e8f0',
          padding: '1.25rem 1.5rem',
          borderRadius: 10,
          fontSize: '0.875rem',
          overflowX: 'auto',
          margin: 0,
          lineHeight: 1.6,
        }}>{`curl -X POST https://your-app.vercel.app/api/slack \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "list_channels", "limit": 20}'`}</pre>
      </section>

      <section>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '1rem' }}>
          Available Tools ({TOOLS.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.75rem' }}>
          {TOOLS.map(t => (
            <div key={t.name} style={{
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              padding: '1rem 1.125rem',
              background: '#fff',
            }}>
              <div style={{
                fontWeight: 600,
                fontSize: '0.85rem',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                color: '#1a1a2e',
                marginBottom: '0.35rem',
              }}>
                {t.name}
              </div>
              <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                {t.desc}
              </div>
              <code style={{
                display: 'block',
                background: '#f4f4f4',
                color: '#555',
                fontSize: '0.75rem',
                padding: '0.4rem 0.6rem',
                borderRadius: 5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {`{"tool":"${t.name}", ...${t.params}}`}
              </code>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
