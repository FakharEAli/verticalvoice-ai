# VerticalVoice AI — Cost Comparison

**Pricing changes frequently. Every rate in this document should be
re-verified against the provider's live pricing page before any real
purchase, budget approval, or pilot pricing conversation.** The numbers below
are illustrative, sourced from publicly published list prices at the time of
writing, and are used only to show the *shape* of the cost model, not to
quote a client.

## 1. Voice runtime: Ultravox vs. an assembled STT+LLM+TTS pipeline

| Approach | Rate | What it includes | Trade-off |
|---|---|---|---|
| **Ultravox** (primary, `src/providers/voice`) | ~$0.05/min (published list rate) | Speech-to-speech in one hop: ASR + LLM turn-taking + TTS + barge-in handling, billed as a single per-minute rate | Simpler integration (one `VoiceRuntimeProvider` implementation), one bill, one latency budget. Less control over swapping individual model components. |
| **Assembled pipeline** (hypothetical: e.g. Deepgram STT + an LLM API + a TTS API, orchestrated by us) | Sum of 3 separate per-minute/per-token rates, typically in the same ballpark per minute once turn-taking, interruption handling, and orchestration overhead are counted | Full control over each component (can swap STT/LLM/TTS providers independently); can undercut a bundled rate at high volume with the right mix | Significantly more integration and ops surface: we would own turn-taking, endpointing, interruption/barge-in logic, and failure handling across three vendor APIs instead of one. Retell (`src/providers/voice`) is kept as the fallback `VoiceRuntimeProvider` specifically so we are not single-sourced on Ultravox. |

**Takeaway**: Ultravox is not necessarily cheaper on a spreadsheet, but it
collapses the highest-complexity part of the system (real-time speech
turn-taking) into a single provider call, which is the right trade for a
small team. The `VoiceRuntimeProvider` interface (`src/providers/voice/types.ts`)
means this decision is swappable without touching the compiler or the packs.

## 2. Telephony: Twilio vs. Telnyx

| Provider | Inbound (per min) | Outbound (per min) | Notes |
|---|---|---|---|
| **Twilio** (primary, `TelephonyProvider`) | ~$0.0085 | ~$0.014 | Rates vary by destination country/number type; these are illustrative US toll rates. Twilio is the primary provider — it's what the demo tenants are wired to. |
| **Telnyx** (cost-optimization provider, `TELEPHONY_PROVIDER=telnyx`) | Typically lower than Twilio at comparable volume | Typically lower than Twilio at comparable volume | Telnyx pricing is usage-tiered and route-dependent; the platform's `TelephonyProvider.estimateCost()` method (`src/providers/telephony/types.ts`) is the mechanism for getting a live, accurate quote per call — **do not hardcode a Telnyx rate** into product pricing, because it moves with route, volume tier, and number type. |

Both providers implement the same `TelephonyProvider` interface, so switching
the primary telephony vendor for a tenant (or for the whole platform) is a
config change (`TELEPHONY_PROVIDER` env var), not a code change.

## 3. Illustrative cost per 100 calls (3-minute average call)

Assumptions: 100 inbound calls, 3 minutes average handle time each = 300
total minutes. Figures below use the illustrative rates above and are meant
to show relative magnitude, not a quote.

| Cost component | Rate used | Cost for 300 minutes |
|---|---|---|
| Ultravox voice runtime | $0.05/min | $15.00 |
| Twilio inbound telephony | $0.0085/min | $2.55 |
| **Total (illustrative)** | | **~$17.55 / 100 calls** |

At 3 minutes/call this is roughly **$0.176 per call**, dominated by the voice
runtime rate, not telephony. This is why voice-runtime provider choice
(Ultravox vs. an assembled pipeline vs. Retell) is the primary lever for
per-call cost, and why the platform treats it as swappable via the
`VoiceRuntimeProvider` interface rather than hardcoding a single vendor.

## 4. The three budget modes

The platform is designed to run at three distinct cost tiers depending on
what's being demonstrated, controlled almost entirely by the
`VOICE_PROVIDER` / `TELEPHONY_PROVIDER` env vars (`.env.example`):

| Mode | Approx. monthly cost | What's running | How it's achieved |
|---|---|---|---|
| **Local Development** | Near $0 | Full app, full UI, full evaluation suite, no real phone calls | `VOICE_PROVIDER=mock` and `TELEPHONY_PROVIDER=mock` — the provider interfaces are satisfied by mock implementations, so the compiler, tool gateway, policy engine, dashboards, and the 140-scenario evaluation suite all run against synthetic data with zero external spend |
| **Demonstration** | ~$20–75/month | A handful of real phone numbers + real Ultravox/Twilio minutes for live demo calls (e.g. demonstration calls to the 3 seeded demo tenants) | Real credentials plugged into `.env.local`, low call volume, one number per vertical, no outbound calling activated |
| **Pilot** | ~$100–300/month | One or a few real small-business tenants running live inbound (and possibly limited outbound) traffic, real Supabase project (not local), real integrations (Calendar/POS/CRM) turned on per tenant | Scales with call volume; the per-100-calls math above is the basis for estimating this range at realistic small-business call volumes (a few hundred to low-thousands of calls/month) |

The provider abstraction layer (`src/providers/voice`, `src/providers/telephony`)
is what makes moving between these three modes a configuration change instead
of a code change — the same compiled agent config and the same tool gateway
run in all three modes.
