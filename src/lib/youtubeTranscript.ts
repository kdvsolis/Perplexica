import axios from 'axios';
import { exec } from 'child_process';
import vttToJson from 'vtt-to-json';
import fs from 'fs';

/**
 * Extracts the transcript, title, and thumbnail from a YouTube video.
 * Only uses auto-generated English subtitles (visible spoken text).
 */
export async function getYoutubeTranscript(
  url: string
): Promise<{ transcript: string; title: string; thumbnail: string } | null> {
  // Extract video ID from YouTube URL
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  const videoId = match ? match[1] : null;

  if (!videoId) {
    console.error('[youtubeTranscript] Could not extract videoId from URL:', url);
    return null;
  }

  try {
    // Download auto-generated English subtitles using yt-dlp
    console.log('[youtubeTranscript] Running yt-dlp for videoId:', videoId, 'URL:', url);
    await new Promise((resolve, reject) => {
      exec(
        `yt-dlp --write-auto-subs --skip-download --sub-lang en --output "${videoId}.%(ext)s" ${url}`,
        (err, stdout, stderr) => {
          if (err) {
            console.error('[youtubeTranscript] yt-dlp error:', err, stderr);
            return reject(err);
          }
          console.log('[youtubeTranscript] yt-dlp finished. stdout:', stdout, 'stderr:', stderr);
          resolve(null);
        }
      );
    });

    const vttFile = `${videoId}.en.vtt`;
    if (!fs.existsSync(vttFile)) {
      console.error('[youtubeTranscript] VTT file not found:', vttFile);
      return null;
    }

    console.log('[youtubeTranscript] VTT file found:', vttFile);

    // Parse VTT file to JSON
    let transcriptArr;
    try {
      const vttString = fs.readFileSync(vttFile, 'utf8');
      transcriptArr = await vttToJson(vttString);
    } catch (e) {
      console.error('[youtubeTranscript] vtt-to-json error:', e);
      return null;
    }

    // Extract the actual text from subtitle segments
    let transcript = '';
    if (Array.isArray(transcriptArr) && transcriptArr.length > 0) {
      if ('part' in transcriptArr[0]) {
        transcript = transcriptArr.map((seg: any) => seg.part).join(' ');
      } else if ('text' in transcriptArr[0]) {
        transcript = transcriptArr.map((seg: any) => seg.text).join(' ');
      } else if ('lines' in transcriptArr[0]) {
        transcript = transcriptArr.map((seg: any) => seg.lines.join(' ')).join(' ');
      }
    }

    // (Optional) Delete the .vtt file after parsing
    // fs.unlinkSync(vttFile);

    // Fetch video metadata: title and thumbnail
    let meta;
    try {
      meta = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
    } catch (e) {
      console.error('[youtubeTranscript] Error fetching video meta:', e);
      return null;
    }

    return {
      transcript,
      title: meta.data.title,
      thumbnail: meta.data.thumbnail_url
    };
  } catch (e) {
    console.error('[youtubeTranscript] Unexpected error:', e);
    return null;
  }
}
