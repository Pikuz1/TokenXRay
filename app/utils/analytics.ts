export const TRACK_EVENTS = [
  'address_submitted',
  'sample_token_clicked',
  'explain_opened',
  'report_printed',
  'check_unknown_shown',
] as const

export type TrackEventName = (typeof TRACK_EVENTS)[number]

export type TrackProps = Readonly<Record<string, string | number | boolean>>

export interface AnalyticsSink {
  record(event: TrackEventName, props: TrackProps): void
}

export interface Tracker {
  track(event: TrackEventName, props?: TrackProps): void
}

export interface RecordedEvent {
  event: TrackEventName
  props: TrackProps
}

/** Forwards events to a sink. Analytics must never break the app, so sink errors are dropped. */
export function createTracker(sink: AnalyticsSink): Tracker {
  return {
    track(event, props = {}) {
      try {
        sink.record(event, props)
      } catch {
        // Intentionally ignored.
      }
    },
  }
}

export function createConsoleSink(
  log: (...args: unknown[]) => void = (...args) => console.debug(...args),
): AnalyticsSink {
  return {
    record(event, props) {
      log('[track]', event, props)
    },
  }
}

export function createMemorySink(): AnalyticsSink & {
  readonly events: readonly RecordedEvent[]
} {
  const events: RecordedEvent[] = []
  return {
    events,
    record(event, props) {
      events.push({ event, props })
    },
  }
}
