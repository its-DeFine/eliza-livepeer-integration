export const VTuberEvents = {
  SCB_UPDATED: 'VTUBER_SCB_UPDATED',
  INSIGHT_READY: 'VTUBER_INSIGHT_READY',
  NARRATION_READY: 'VTUBER_NARRATION_READY',
} as const;

export type VTuberEventName = (typeof VTuberEvents)[keyof typeof VTuberEvents];

export { vtuberBus } from './bus';
