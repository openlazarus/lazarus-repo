import { useCallback, useState } from 'react'

import { useWebSocket } from './use-websocket'

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string[]
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

export type CalendarManagementResponse = {
  events: CalendarEvent[]
  meetingSlots: Array<{ start: string; end: string }>
  prioritizedTasks: Array<CalendarEvent & { priority: number }>
}

export const useCalendarSocket = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [meetingSlots, setMeetingSlots] = useState<
    Array<{ start: string; end: string }>
  >([])
  const [prioritizedTasks, setPrioritizedTasks] = useState<
    Array<CalendarEvent & { priority: number }>
  >([])
  const [error, setError] = useState<string | null>(null)

  const { status, connect, disconnect, sendMessage } = useWebSocket({
    messageHandlers: {
      calendar_events: (data: { events: CalendarEvent[] }) => {
        setEvents(data.events)
      },
      meeting_slots: (data: {
        slots: Array<{ start: string; end: string }>
      }) => {
        setMeetingSlots(data.slots)
      },
      prioritized_tasks: (data: {
        tasks: Array<CalendarEvent & { priority: number }>
      }) => {
        setPrioritizedTasks(data.tasks)
      },
      calendar_error: (data: { message: string }) => {
        setError(data.message)
      },
    },
  })

  const manageCalendar = useCallback(
    (params: {
      account: string
      calendars: string[]
      startDate: string
      endDate: string
      findMeetingSlots?: boolean
      prioritizeTasks?: boolean
    }) => {
      sendMessage('user_request', {
        request: 'manage_calendar',
        parameters: {
          account: params.account,
          calendars: params.calendars,
          start_date: params.startDate,
          end_date: params.endDate,
          find_meeting_slots: params.findMeetingSlots,
          prioritize_tasks: params.prioritizeTasks,
        },
      })
    },
    [sendMessage],
  )

  const scheduleMeeting = useCallback(
    (params: {
      title: string
      start: string
      end: string
      attendees: string[]
      description?: string
      location?: string
    }) => {
      sendMessage('user_request', {
        request: 'schedule_meeting',
        parameters: params,
      })
    },
    [sendMessage],
  )

  const updateEvent = useCallback(
    (params: { eventId: string; updates: Partial<CalendarEvent> }) => {
      sendMessage('user_request', {
        request: 'update_event',
        parameters: params,
      })
    },
    [sendMessage],
  )

  const deleteEvent = useCallback(
    (eventId: string) => {
      sendMessage('user_request', {
        request: 'delete_event',
        parameters: { event_id: eventId },
      })
    },
    [sendMessage],
  )

  return {
    status,
    error,
    events,
    meetingSlots,
    prioritizedTasks,
    connect,
    disconnect,
    manageCalendar,
    scheduleMeeting,
    updateEvent,
    deleteEvent,
  }
}
