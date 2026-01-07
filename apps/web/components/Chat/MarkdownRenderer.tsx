'use client'

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className="prose prose-invert prose-sm max-w-none"
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match

          if (isInline) {
            return (
              <code
                className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            )
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg text-sm"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0">{children}</p>
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc pl-6">{children}</ul>
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal pl-6">{children}</ol>
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-base font-bold mb-2 mt-3">{children}</h3>
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-primary pl-4 italic my-3">
              {children}
            </blockquote>
          )
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
