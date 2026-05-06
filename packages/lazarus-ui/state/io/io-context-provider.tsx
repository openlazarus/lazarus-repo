'use client'

import { createContext, ReactNode, useContext } from 'react'

import {
  DeepgramContextProvider,
  LiveConnectionState,
  useDeepgram,
} from './deepgram-context-provider'
import {
  MicrophoneContextProvider,
  MicrophoneState,
  useMicrophone,
} from './microphone-context-provider'

// Interface for the unified IO context
interface IOContextType {
  // Add future IO-related properties here
  // Currently just exposing microphone and deepgram contexts
}

const IOContext = createContext<IOContextType | undefined>(undefined)

interface IOContextProviderProps {
  children: ReactNode
}

/**
 * Unified provider for all IO-related contexts
 * This provides a central place to manage all input/output related state
 * and can be extended with additional IO devices in the future
 */
export const IOProvider: React.FC<IOContextProviderProps> = ({ children }) => {
  // Here we could add shared state or methods that coordinate between different IO systems

  return (
    <IOContext.Provider value={{}}>
      <MicrophoneContextProvider>
        <DeepgramContextProvider>{children}</DeepgramContextProvider>
      </MicrophoneContextProvider>
    </IOContext.Provider>
  )
}

/**
 * Hook to access the IO context
 * This combines the microphone and deepgram contexts and provides a unified interface
 */
export function useIO() {
  const context = useContext(IOContext)
  const microphone = useMicrophone()
  const deepgram = useDeepgram()

  if (context === undefined) {
    throw new Error('useIO must be used within an IOProvider')
  }

  return {
    microphone,
    deepgram,
    // Add more IO-related functionality here as needed
  }
}

// Re-export the types and enums for convenience
export { LiveConnectionState, MicrophoneState }
