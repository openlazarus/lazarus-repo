export interface IAudioTranscriptionService {
  /** Transcribe an audio buffer to text. Returns null on failure. */
  transcribe(audioBuffer: Buffer): Promise<string | null>
}
