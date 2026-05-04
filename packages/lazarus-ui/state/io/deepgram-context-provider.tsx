'use client'

import {
  createClient,
  LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
} from '@deepgram/sdk'
import {
  createContext,
  FunctionComponent,
  ReactNode,
  useContext,
  useState,
} from 'react'

interface DeepgramContextType {
  connection: LiveClient | null
  connectToDeepgram: (options: LiveSchema, endpoint?: string) => Promise<void>
  disconnectFromDeepgram: () => void
  connectionState: LiveConnectionState
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined,
)

interface DeepgramContextProviderProps {
  children: ReactNode
}

const getApiKey = async (): Promise<string> => {
  // Fetching Deepgram API key
  const response = await fetch('http://127.0.0.1:5000/get-deepgram-key', {
    cache: 'no-store',
  })
  const result = await response.json()
  // Successfully retrieved Deepgram API key
  return result.key
}

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
  const [connection, setConnection] = useState<LiveClient | null>(null)
  const [connectionState, setConnectionState] = useState<LiveConnectionState>(
    LiveConnectionState.CLOSED,
  )

  const connectToDeepgram = async (options: LiveSchema, endpoint?: string) => {
    // Connecting to Deepgram
    const key = await getApiKey()
    const deepgram = createClient(key)

    const conn = deepgram.listen.live(options, endpoint)
    // Created Deepgram live connection

    conn.addListener(LiveTranscriptionEvents.Open, () => {
      // Deepgram connection opened
      setConnectionState(LiveConnectionState.OPEN)
    })

    conn.addListener(LiveTranscriptionEvents.Close, () => {
      // Deepgram connection closed
      setConnectionState(LiveConnectionState.CLOSED)
    })

    conn.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.error('Deepgram connection error:', error)
    })

    setConnection(conn)
    // Deepgram connection setup complete
  }

  const disconnectFromDeepgram = async () => {
    // Disconnecting from Deepgram
    if (connection) {
      connection.finish()
      setConnection(null)
      // Deepgram connection finished
    }
  }

  return (
    <DeepgramContext.Provider
      value={{
        connection,
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
      }}>
      {children}
    </DeepgramContext.Provider>
  )
}

function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext)
  if (context === undefined) {
    throw new Error('useDeepgram must be used within a DeepgramContextProvider')
  }
  return context
}

export {
  DeepgramContextProvider,
  LiveConnectionState,
  LiveTranscriptionEvents,
  useDeepgram,
  type LiveTranscriptionEvent,
}
