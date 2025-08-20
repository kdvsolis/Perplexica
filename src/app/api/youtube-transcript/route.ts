import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtubeTranscript';

export async function POST(req: NextRequest) {
  const { url, question } = await req.json();
  if (!url) return NextResponse.json({ error: 'Missing YouTube URL' }, { status: 400 });

  try {
    const result = await getYoutubeTranscript(url);
    if (!result) {
      console.error('[youtube-transcript] Transcript not available for URL:', url);
      return NextResponse.json({ error: 'Transcript not available' }, { status: 404 });
    }
    // If a question is provided, do simple Q&A over transcript (LLM or simple search)
    if (question && result.transcript) {
      // For demo: naive answer extraction (in production, use LLM)
      const lower = result.transcript.toLowerCase();
      const q = question.toLowerCase();
      let answer = '';
      if (lower.includes(q)) {
        // Return the sentence containing the question keyword
        const sentences = result.transcript.split('. ');
        answer = sentences.find(s => s.toLowerCase().includes(q)) || '';
      } else {
        answer = 'Sorry, I could not find an answer in the transcript.';
      }
      return NextResponse.json({ ...result, answer });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[youtube-transcript] Exception:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch transcript' }, { status: 500 });
  }
}
