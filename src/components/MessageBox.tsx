'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useEffect, useState } from 'react';
import { Message } from './ChatWindow';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
} from 'lucide-react';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import CitationPopup from './CitationPopup';

const ThinkTagProcessor = ({
  children,
  thinkingEnded,
}: {
  children: React.ReactNode;
  thinkingEnded: boolean;
}) => {
  return (
    <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
  );
};

// Helper: Render YouTube video info bubble
function YoutubeVideoBubble({ url, title, thumbnail, transcript }: { url: string; title: string; thumbnail: string; transcript: string }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<string | null>(null);

  // Q&A handler
  async function handleAsk() {
    setQaLoading(true);
    setQaResult(null);
    try {
      const res = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, question: qaInput }),
      });
      const data = await res.json();
      setQaResult(data.answer || 'No answer found.');
    } catch {
      setQaResult('Error fetching answer.');
    }
    setQaLoading(false);
  }

  return (
    <div className="rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary p-4 flex flex-col items-start space-y-3 max-w-xl">
      <div className="flex flex-row items-center space-x-4">
        <img src={thumbnail} alt={title} className="w-24 h-16 rounded-lg object-cover" />
        <div className="flex flex-col">
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-base text-[#24A0ED] hover:underline">
            {title}
          </a>
          <span className="text-xs text-black/60 dark:text-white/60 mt-1">YouTube Video</span>
        </div>
      </div>
      <button
        className="text-xs text-[#24A0ED] hover:underline focus:outline-none"
        onClick={() => setShowTranscript((v) => !v)}
      >
        {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
      </button>
      {showTranscript && (
        <div className="max-h-48 overflow-y-auto bg-white/80 dark:bg-black/30 rounded p-2 text-xs whitespace-pre-line border border-light-100 dark:border-dark-100 w-full">
          {transcript}
        </div>
      )}
      <div className="w-full flex flex-col space-y-2 mt-2">
        <label className="text-xs font-medium">Ask about this video:</label>
        <div className="flex flex-row space-x-2">
          <input
            type="text"
            className="flex-1 rounded border border-light-200 dark:border-dark-200 px-2 py-1 text-xs bg-transparent"
            value={qaInput}
            onChange={e => setQaInput(e.target.value)}
            placeholder="Type your question..."
            disabled={qaLoading}
          />
          <button
            className="bg-[#24A0ED] text-white rounded px-3 py-1 text-xs font-medium disabled:bg-[#e0e0dc] dark:disabled:bg-[#ececec21]"
            onClick={handleAsk}
            disabled={!qaInput.trim() || qaLoading}
          >
            Ask
          </button>
        </div>
        {qaResult && <div className="text-xs mt-1 bg-light-100 dark:bg-dark-100 rounded p-2">{qaResult}</div>}
      </div>
    </div>
  );
}

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
}: {
  message: Message;
  messageIndex: number;
  history: Message[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
}) => {
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const [speechMessage, setSpeechMessage] = useState(message.content);
  const [thinkingEnded, setThinkingEnded] = useState(false);
  const [sidebarCitation, setSidebarCitation] = useState<null | { source: any; index: number }>(null);

  // --- YouTube Video Bubble ---
  // If the message contains a YouTube video info marker, render a special bubble
  // Use a regex without /s flag for compatibility
  const youtubeInfoMatch = message.content.match(/Summarize this YouTube video: (https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11}))[\s\S]*?Transcript:/);
  const youtubeMeta = message.youtubeMeta || null;
  const youtubeTranscript = message.youtubeTranscript || null;

  useEffect(() => {
    const citationRegex = /\[([^\]]+)\]/g;
    const regex = /\[(\d+)\]/g;
    let processedMessage = message.content;

    if (message.role === 'assistant' && message.content.includes('<think>')) {
      const openThinkTag = processedMessage.match(/<think>/g)?.length || 0;
      const closeThinkTag = processedMessage.match(/<\/think>/g)?.length || 0;

      if (openThinkTag > closeThinkTag) {
        processedMessage += '</think> <a> </a>'; // The extra <a> </a> is to prevent the the think component from looking bad
      }
    }

    if (message.role === 'assistant' && message.content.includes('</think>')) {
      setThinkingEnded(true);
    }

    if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length > 0
    ) {
      setParsedMessage(
        processedMessage.replace(
          citationRegex,
          (_, capturedContent: string) => {
            const numbers = capturedContent
              .split(',')
              .map((numStr) => numStr.trim());

            const linksHtml = numbers
              .map((numStr) => {
                const number = parseInt(numStr);

                if (isNaN(number) || number <= 0) {
                  return `[${numStr}]`;
                }

                const source = message.sources?.[number - 1];
                const url = source?.metadata?.url;
                const content = source?.pageContent || source?.metadata?.title || url || '';
                // Use CitationPopup for hover
                return `<span class='citation-hover' data-citation-index='${number - 1}'>[${numStr}]</span>`;
              })
              .join('');

            return linksHtml;
          },
        ),
      );
      setSpeechMessage(message.content.replace(regex, ''));
      return;
    } else if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length === 0
    ) {
      setParsedMessage(processedMessage.replace(regex, ''));
      setSpeechMessage(message.content.replace(regex, ''));
      return;
    }

    setSpeechMessage(message.content.replace(regex, ''));
    setParsedMessage(processedMessage);
  }, [message.content, message.sources, message.role]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  // --- Replace citation rendering with CitationPopup in Markdown ---
  // Helper to render citations as CitationPopup
  function citationReplacer(match: string, capturedContent: string) {
    const numbers = capturedContent.split(',').map((numStr) => numStr.trim());
    return numbers
      .map((numStr) => {
        const number = parseInt(numStr);
        if (isNaN(number) || number <= 0 || !message.sources || !message.sources[number - 1]) {
          return `[${numStr}]`;
        }
        const source = message.sources[number - 1];
        const content = source.pageContent || source.metadata?.title || source.metadata?.url || '';
        // Render CitationPopup as a React component
        return `<CitationPopup data-citation-index='${number - 1}' data-citation-content='${encodeURIComponent(
          content
        )}'>[${numStr}]</CitationPopup>`;
      })
      .join('');
  }

  // --- Custom Markdown override for citation numbers ---
  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      CitationPopup: {
        component: (props: any) => {
          const idx = parseInt(props['data-citation-index']);
          const content = decodeURIComponent(props['data-citation-content'] || '');
          return (
            <CitationPopup
              content={content}
              onLinkClick={() => {
                if (message.sources && message.sources[idx]) {
                  setSidebarCitation({ source: message.sources[idx], index: idx });
                }
              }}
            >
              <span style={{ cursor: 'pointer', color: '#24A0ED' }}>{props.children}</span>
            </CitationPopup>
          );
        },
      },
    },
  };

  // --- Replace citations in parsedMessage with CitationPopup tags ---
  useEffect(() => {
    const citationRegex = /\[([^\]]+)\]/g;
    let processedMessage = message.content;
    if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length > 0
    ) {
      setParsedMessage(processedMessage.replace(citationRegex, citationReplacer));
      setSpeechMessage(message.content.replace(/\[(\d+)\]/g, ''));
      return;
    }
    // ...existing code...
  }, [message.content, message.sources, message.role]);

  return (
    <div>
      {message.role === 'user' && (
        <div
          className={cn(
            'w-full',
            messageIndex === 0 ? 'pt-16' : 'pt-8',
            'break-words',
          )}
        >
          <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
            {message.content}
          </h2>
        </div>
      )}

      {message.role === 'assistant' && (
        <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
          <div
            ref={dividerRef}
            className="flex flex-col space-y-6 w-full lg:w-9/12"
          >
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <BookCopy className="text-black dark:text-white" size={20} />
                  <h3 className="text-black dark:text-white font-medium text-xl">
                    Sources
                  </h3>
                </div>
                <MessageSources sources={message.sources} />
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center space-x-2">
                <Disc3
                  className={cn(
                    'text-black dark:text-white',
                    isLast && loading ? 'animate-spin' : 'animate-none',
                  )}
                  size={20}
                />
                <h3 className="text-black dark:text-white font-medium text-xl">
                  Answer
                </h3>
              </div>

              {youtubeInfoMatch && youtubeMeta && youtubeTranscript && (
                <div className="mb-4">
                  <YoutubeVideoBubble
                    url={youtubeInfoMatch[1]}
                    title={youtubeMeta.title}
                    thumbnail={youtubeMeta.thumbnail}
                    transcript={youtubeTranscript}
                  />
                </div>
              )}

              <Markdown
                className={cn(
                  'prose prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                  'max-w-none break-words text-black dark:text-white',
                )}
                options={markdownOverrides}
              >
                {parsedMessage}
              </Markdown>
              {loading && isLast ? null : (
                <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                  <div className="flex flex-row items-center space-x-1">
                    {/*  <button className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black text-black dark:hover:text-white">
                      <Share size={18} />
                    </button> */}
                    <Rewrite rewrite={rewrite} messageId={message.messageId} />
                  </div>
                  <div className="flex flex-row items-center space-x-1">
                    <Copy initialMessage={message.content} message={message} />
                    <button
                      onClick={() => {
                        if (speechStatus === 'started') {
                          stop();
                        } else {
                          start();
                        }
                      }}
                      className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                    >
                      {speechStatus === 'started' ? (
                        <StopCircle size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {isLast &&
                message.suggestions &&
                message.suggestions.length > 0 &&
                message.role === 'assistant' &&
                !loading && (
                  <>
                    <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                    <div className="flex flex-col space-y-3 text-black dark:text-white">
                      <div className="flex flex-row items-center space-x-2 mt-4">
                        <Layers3 />
                        <h3 className="text-xl font-medium">Related</h3>
                      </div>
                      <div className="flex flex-col space-y-3">
                        {message.suggestions.map((suggestion, i) => (
                          <div
                            className="flex flex-col space-y-3 text-sm"
                            key={i}
                          >
                            <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                            <div
                              onClick={() => {
                                sendMessage(suggestion);
                              }}
                              className="cursor-pointer flex flex-row justify-between font-medium space-x-2 items-center"
                            >
                              <p className="transition duration-200 hover:text-[#24A0ED]">
                                {suggestion}
                              </p>
                              <Plus
                                size={20}
                                className="text-[#24A0ED] flex-shrink-0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
          <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
            <SearchImages
              query={history[messageIndex - 1].content}
              chatHistory={history.slice(0, messageIndex - 1)}
              messageId={message.messageId}
            />
            <SearchVideos
              chatHistory={history.slice(0, messageIndex - 1)}
              query={history[messageIndex - 1].content}
              messageId={message.messageId}
            />
          </div>
        </div>
      )}
      {sidebarCitation && (
        <div className="fixed top-0 right-0 w-full max-w-md h-full z-[100] bg-white dark:bg-dark-primary border-l border-light-200 dark:border-dark-200 shadow-xl overflow-y-auto p-6">
          <button
            className="absolute top-4 right-4 text-black dark:text-white text-lg font-bold"
            onClick={() => setSidebarCitation(null)}
            aria-label="Close citation sidebar"
          >
            ×
          </button>
          <h2 className="text-xl font-bold mb-2">Citation [{sidebarCitation.index + 1}]</h2>
          <div className="prose dark:prose-invert max-w-none">
            {/* PDF/web rendering and highlight logic */}
            {sidebarCitation.source.metadata?.type === 'pdf' || sidebarCitation.source.metadata?.type === 'web' ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: highlightCitationParagraph(
                    sidebarCitation.source.pageContent,
                    sidebarCitation.source.metadata?.highlightText
                  ),
                }}
              />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: sidebarCitation.source.pageContent || sidebarCitation.source.metadata?.title || sidebarCitation.source.metadata?.url || '' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to highlight and scroll to the cited paragraph
function highlightCitationParagraph(content: string, highlightText?: string) {
  if (!content || !highlightText) return content;
  // Simple highlight: wrap the cited text in a <mark>
  const safeHighlight = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(safeHighlight, 'gi');
  return content.replace(regex, match => `<mark style="background: #ffe066;">${match}</mark>`);
}

export default MessageBox;
