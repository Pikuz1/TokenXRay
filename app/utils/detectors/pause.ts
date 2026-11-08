import { createAbiDetector } from './abi'

export const detectPause = createAbiDetector('pause', ['pause', 'unpause', 'paused'])
