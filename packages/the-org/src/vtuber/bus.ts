import { EventEmitter } from 'events';

// A singleton event bus that lives inside the Bun/Node process. Because all three
// VTuber agents (Conductor, Synthesiser, Narrator) are started in the same
// process, publishing on this bus allows truly cross-agent events without relying
// on Discord messages or polling.

export const vtuberBus = new EventEmitter();

// Increase the default listener limit so three agents won't trigger a warning.
vtuberBus.setMaxListeners(20);
