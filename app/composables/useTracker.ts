import { createConsoleSink, createTracker } from '~/utils/analytics'
import type { AnalyticsSink, Tracker } from '~/utils/analytics'

const defaultSink = createConsoleSink()
let activeSink: AnalyticsSink = defaultSink

// Components share one tracker; swapping the sink re-routes it without re-wiring callers.
const tracker = createTracker({
  record: (event, props) => activeSink.record(event, props),
})

/** Routes events to another provider, for example a hosted analytics service. */
export function setAnalyticsSink(sink: AnalyticsSink = defaultSink): void {
  activeSink = sink
}

export function useTracker(): Tracker {
  return tracker
}
