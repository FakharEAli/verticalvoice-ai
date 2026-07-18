# VerticalVoice AI — End-to-End Call Data Flow

This sequence diagram traces one real inbound call from the moment it hits
Twilio to the moment the dashboard reflects it. It uses `check-availability`
as the example tool call (registered in `src/lib/tools/gateway.ts`), and shows
the full round trip through the 10-step tool gateway, the webhook that fires
when the call ends, and the background worker (`src/workers/call-normalizer`)
that turns raw provider data into the transcript/summary/outcome the
dashboard displays. Every arrow in this diagram corresponds to a real file in
the repo — nothing here is a hypothetical integration.

```mermaid
sequenceDiagram
    autonumber
    participant Caller
    participant Twilio as Twilio<br/>(Telephony Provider)
    participant Ultravox as Ultravox<br/>(Voice Runtime)
    participant Gateway as Tool Gateway<br/>src/lib/tools/gateway.ts
    participant Policy as Policy Engine<br/>src/industries/core/policies.ts
    participant Domain as Domain Service<br/>src/domain/healthcare
    participant DB as Supabase PostgreSQL
    participant Webhook as Webhook Handler<br/>src/app/api/v1/webhooks/*
    participant Worker as call-normalizer worker<br/>src/workers/call-normalizer
    participant Dash as Dashboard<br/>/dashboard/calls

    Caller->>Twilio: Dials tenant's number
    Twilio->>Twilio: Inbound route configured<br/>(configureInboundRoute)
    Twilio->>Ultravox: Forward call audio stream
    Ultravox->>Ultravox: Load compiled agent config<br/>(system prompt, tools, greeting)
    Ultravox->>Caller: Greeting ("Thank you for calling...")
    Caller->>Ultravox: "Can I get an appointment Tuesday at 2pm?"
    Ultravox->>Ultravox: Detect intent: check_availability

    Ultravox->>Gateway: POST tool call: check-availability<br/>Bearer: call-scoped JWT
    Note over Gateway: Step 1: authenticate call token (token.ts)
    Note over Gateway: Step 2: resolve tenant from call record
    Note over Gateway: Step 3: resolve agent config (redaction/HIPAA mode)
    Note over Gateway: Step 4: validate tool is enabled for this call
    Note over Gateway: Step 5: validate input against Zod schema
    Gateway->>Policy: Step 6: evaluate active policies
    Policy-->>Gateway: allow / deny / escalate decisions
    Note over Gateway: Step 7: check idempotency key
    Gateway->>Domain: Step 8: execute tool call
    Domain->>DB: Query availability (tenant-scoped, RLS-enforced)
    DB-->>Domain: Available slots
    Domain-->>Gateway: { available: true, slots: [...] }
    Note over Gateway: Step 9: apply PII/PHI redaction rules
    Gateway->>DB: Step 10: log tool run to audit_events
    Gateway-->>Ultravox: Tool result (redacted as needed)

    Ultravox->>Caller: "You're booked for Tuesday at 2pm."
    Caller->>Ultravox: "Thanks, bye."
    Ultravox->>Twilio: End call
    Twilio->>Caller: Call disconnected

    Twilio->>Webhook: statusCallback: call completed<br/>(signed request)
    Webhook->>Webhook: Verify Twilio signature<br/>src/lib/webhooks/signature.ts
    Webhook->>DB: Insert raw call event
    Ultravox->>Webhook: call.ended webhook<br/>(transcript, recording URL)
    Webhook->>Webhook: Verify Ultravox signature
    Webhook->>DB: Insert raw call event

    Worker->>DB: Poll / trigger on new call events
    Worker->>Ultravox: getCall() / getRecording()<br/>(NormalizedCall shape)
    Worker->>Worker: Normalize transcript, compute<br/>duration, derive outcome
    Worker->>DB: Write calls, transcripts,<br/>call_outcomes rows

    Dash->>DB: Query calls for tenant (RLS-scoped)
    DB-->>Dash: Call list + transcript + outcome
    Dash-->>Caller: (indirectly) Business sees the<br/>booked appointment on /dashboard/calls
```

The key takeaway for judges: the voice runtime never talks to the database
directly. Every tool invocation is forced through the gateway's 10-step
pipeline — auth, tenant resolution, config resolution, enablement check,
schema validation, policy evaluation, idempotency, execution, redaction, and
audit logging — and every call's post-hoc data (transcript, summary, outcome)
is derived by the `call-normalizer` worker from provider webhooks rather than
trusted verbatim from the voice runtime, so a single compromised or buggy
webhook cannot corrupt tenant data without passing through the same
validation and RLS boundaries as a live call.
