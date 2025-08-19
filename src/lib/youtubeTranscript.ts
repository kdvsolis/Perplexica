import axios from 'axios';

// You can use a package like youtube-transcript or call a public transcript API
// This is a placeholder for actual implementation
export async function getYoutubeTranscript(url: string): Promise<{ transcript: string; title: string; thumbnail: string } | null> {
  // Extract video ID from URL
  // Support youtu.be short links as well
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  const videoId = match ? match[1] : null;
  if (!videoId) return null;

  try {
    // Fetch transcript
    const res = await axios.get(`https://youtube-transcript-api.vercel.app/api/transcript/${videoId}`);
    let transcript = '';
    if (res.data && res.data.transcript) {
      transcript = res.data.transcript.map((seg: any) => seg.text).join(' ');
    } else {
      return null;
    }
    // Fetch video meta (title, thumbnail)
    const meta = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return {
      transcript,
      title: meta.data.title,
      thumbnail: meta.data.thumbnail_url
    };
  } catch (e) {
    return null;
  }
}
