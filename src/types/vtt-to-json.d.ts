declare module 'vtt-to-json' {
  interface VttCue {
    start: number;
    end: number;
    part: string;
    [key: string]: any;
  }
  export default function vttToJson(filePath: string): Promise<VttCue[]>;
}
