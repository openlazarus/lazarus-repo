'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react'

interface MicrophoneContextType {
  microphone: MediaRecorder | null
  startMicrophone: () => void
  stopMicrophone: (forceStop?: boolean) => void
  setupMicrophone: () => void
  microphoneState: MicrophoneState | null
}

export enum MicrophoneEvents {
  DataAvailable = 'dataavailable',
  Error = 'error',
  Pause = 'pause',
  Resume = 'resume',
  Start = 'start',
  Stop = 'stop',
}

export enum MicrophoneState {
  NotSetup = -1,
  SettingUp = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
}

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined,
)

interface MicrophoneContextProviderProps {
  children: ReactNode
}

const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children,
}) => {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>(
    MicrophoneState.NotSetup,
  )
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  const setupMicrophone = async () => {
    // Setting up microphone
    setMicrophoneState(MicrophoneState.SettingUp)

    try {
      // Simple audio setup as in the official example
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      // Got user media stream successfully

      setMediaStream(userMedia)

      // Simple MediaRecorder setup without complex options
      const microphone = new MediaRecorder(userMedia)
      // MediaRecorder created

      setMicrophoneState(MicrophoneState.Ready)
      setMicrophone(microphone)
      // Microphone setup complete. State: Ready
    } catch (err: any) {
      // Error setting up microphone
      setMicrophoneState(MicrophoneState.Error)
      throw err
    }
  }

  const stopMicrophone = useCallback(
    (forceStop: boolean = false) => {
      // console.log(`Stopping microphone. Force stop: ${forceStop}`)
      if (forceStop) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => {
            track.stop()
            // console.log('Media stream track stopped')
          })
        }
        if (
          microphone &&
          (microphone.state === 'recording' || microphone.state === 'paused')
        ) {
          try {
            microphone.stop()
            // console.log('MediaRecorder stopped')
          } catch (e) {
            // console.error('Error stopping microphone:', e)
          }
        }
        setMicrophoneState(MicrophoneState.NotSetup)
        setMicrophone(null)
        setMediaStream(null)
        // console.log('Microphone fully reset')
      } else {
        // console.log('Pausing microphone')
        setMicrophoneState(MicrophoneState.Pausing)
        if (microphone?.state === 'recording') {
          microphone.pause()
          setMicrophoneState(MicrophoneState.Paused)
          // console.log('Microphone paused')
        }
      }
    },
    [microphone, mediaStream],
  )

  const startMicrophone = useCallback(() => {
    // Starting microphone
    if (microphone?.state === 'recording') {
      // Microphone already recording, skipping start
      return
    }
    setMicrophoneState(MicrophoneState.Opening)

    if (microphone?.state === 'paused') {
      // Resuming paused microphone
      microphone.resume()
    } else {
      // Starting new microphone recording with timeslice: 250ms
      // The timeslice parameter is critical - it tells the recorder how often to deliver data
      microphone?.start(250) // Deliver data every 250ms
    }

    setMicrophoneState(MicrophoneState.Open)
    // Microphone started successfully
  }, [microphone])

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
      }}>
      {children}
    </MicrophoneContext.Provider>
  )
}

function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext)

  if (context === undefined) {
    throw new Error(
      'useMicrophone must be used within a MicrophoneContextProvider',
    )
  }

  return context
}

export { MicrophoneContextProvider, useMicrophone }
