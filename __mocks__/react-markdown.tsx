import React from 'react'

interface ReactMarkdownProps {
  children: string
  [key: string]: unknown
}

function ReactMarkdown({ children }: ReactMarkdownProps) {
  return <div data-testid="react-markdown-content">{children}</div>
}

ReactMarkdown.displayName = 'ReactMarkdown'
export default ReactMarkdown
