# ADR – SCB Bridge between NeuroSync (System-1) and Eliza (System-2)

> Status: **Draft** │ Date: {{DATE}}

## 1. Context

We operate two separate runtimes:

| Runtime         | Nickname          | Role                                                                                                                   |
| --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| NeuroSync       | **System-1 (S1)** | Handles real-time voice avatar (LLM ➜ TTS ➜ Blendshapes ➜ LiveLink). Houses the **Shared Cognitive Blackboard (SCB)**. |
| Eliza – the-org | **System-2 (S2)** | Swarm of higher-level reasoning agents running in Discord.                                                             |

Both runtimes need **bidirectional** but **loosely-coupled** communication:

- **S1 ⇢ S2** – expose SCB slices so System-2 agents can read context.
- **S2 ⇢ S1** – allow agents to write _directives_ (or events) back into the SCB.

We deliberately begin with a _thin_ HTTP interface that can be secured and extended later.

## 2. Decision

- Use simple **JSON over HTTP** (REST-like) endpoints hosted by S1 (Flask).
- S2 uses `fetch` inside a **Provider** (read) and an **Action** (write) placed directly in the **the-org** package (not as an external plugin) to avoid import/path issues.
- Auth is optional for MVP; requests may add `X-NeuroSync-Key` header once secrets are provisioned.
- All responses are `application/json`.

### 2.1 Endpoints

| Method | Path                  | Request Body                       | Response                                  | Notes                                                |
| ------ | --------------------- | ---------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/scb/slice?tokens=N` | –                                  | `{ summary: string, window: SCBEntry[] }` | `N` ~ token budget (default 600).                    |
| `POST` | `/scb/event`          | `{ type, actor, text, salience? }` | `{ status:"ok" }`                         | Generic event log.                                   |
| `POST` | `/scb/directive`      | `{ actor, text, ttl? }`            | `{ status:"ok" }`                         | Used by S2 to influence S1. Adds `type:"directive"`. |
| `GET`  | `/scb/ping`           | –                                  | `{ status:"ok" }`                         | Lightweight health-check (added for tooling).        |

#### SCBEntry Schema

```ts
{
  t: number   // unix epoch seconds (set automatically when missing)
  type: 'event' | 'directive' | 'speech' | string
  actor: string
  text: string
  salience?: number
  ttl?: number
}
```

### 2.2 Headers (future-proof)

```
X-NeuroSync-Key: <token>        // optional, not validated in MVP
X-Eliza-Origin: the-org/<agent> // optional audit/metrics
```

### 2.3 Error Codes

| Code | When                                |
| ---- | ----------------------------------- |
| 400  | Malformed payload or missing fields |
| 401  | Auth failure (future)               |
| 500  | Internal server error               |

## 3. Consequences

- S1 continues to work standalone (endpoints already exist or minor additions).
- S2 can be embedded anywhere (Discord guild, CLI, etc.) as long as it has the URL.
- Upgrading to WebSockets or gRPC later is non-breaking.
- Redis vs in-memory implementation in S1 is hidden behind `/scb/*` routes.

## 4. Open Questions / Next Steps

1. Define concrete auth story (JWT? Discord OAuth? simple bearer?).
2. Rate-limit S2 writes to protect SCB.
3. Explore push model (S1→S2) to avoid polling.
4. Versioning – maybe add `X-SCB-Version` header.

---
