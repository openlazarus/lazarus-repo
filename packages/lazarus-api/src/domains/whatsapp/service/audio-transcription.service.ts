import { DeepgramClient } from '@deepgram/sdk'
import type { IAudioTranscriptionService } from './audio-transcription.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('audio-transcription')

/**
 * Audio transcription service using Deepgram SDK v5.
 * Transcribes audio buffers (e.g. WhatsApp voice messages) to text.
 * Never throws — returns null on failure so message processing is not blocked.
 */
class AudioTranscriptionService implements IAudioTranscriptionService {
  private client: DeepgramClient | null = null

  private getClient(): DeepgramClient | null {
    if (this.client) return this.client
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      log.warn('DEEPGRAM_API_KEY not set, transcription disabled')
      return null
    }
    this.client = new DeepgramClient({ apiKey })
    return this.client
  }

  async transcribe(audioBuffer: Buffer): Promise<string | null> {
    const client = this.getClient()
    if (!client) return null

    try {
      const result = await client.listen.v1.media.transcribeFile(audioBuffer, {
        model: 'nova-3',
        smart_format: true,
        detect_language: true,
      })

      // Response is ListenV1Response | ListenV1AcceptedResponse — cast to access results
      const data = result as {
        results?: { channels?: { alternatives?: { transcript?: string }[] }[] }
      }
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript

      if (!transcript) {
        log.warn('No transcript in response')
        return null
      }

      log.info(`Transcribed ${audioBuffer.length} bytes -> ${transcript.length} chars`)
      return transcript
    } catch (err) {
      log.error({ err: err }, 'Failed to transcribe audio')
      return null
    }
  }
}

export const audioTranscriptionService: IAudioTranscriptionService = new AudioTranscriptionService()
