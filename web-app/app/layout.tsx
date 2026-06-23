import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Slack AI Workspace Assistant',
  description: 'REST API for Slack workspace operations built for AI agent integrations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fafafa' }}>{children}</body>
    </html>
  )
}
