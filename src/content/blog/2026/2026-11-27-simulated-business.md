---
title: "Give agents a simulated business, not just mocked APIs"
description: "A useful agent sandbox needs a coherent world: shared state, consequences, virtual time and evidence that the business goal was actually achieved."
pubDatetime: 2026-11-27T08:20:00.000Z
tags:
  - ai
  - integration-architecture
  - telecom
heroImage: "/images/simulated-business-hero.webp"
heroImageAlt: "A miniature telecom world in a contained tray, with a house, cable fault and repair equipment: an editorial metaphor for a business simulation."
featured: false
---

Give an agent a goal: restore service on line L42.

The agent checks the line, restarts the router, runs another diagnostic and opens a repair ticket. Every API call returns valid JSON. The final answer sounds confident.

Did it fix anything?

With independently mocked endpoints, that is surprisingly hard to answer. If each endpoint invents its own response, the diagnostic can say the line is broken while the customer record says service is healthy. A router restart appears to repair a damaged cable simply because the next response was sampled differently.

That tests whether an agent can keep a conversation going. It does not tell us much about whether it can operate a business.

The more useful sandbox is a small simulated business with persistent state and explicit rules. This is an architecture proposal, not a description of a product already built.

## Start with the business person's screen

The entry point should be a goal and a situation, not a folder of test fixtures.

A service manager picks “intermittent broadband fault,” selects a synthetic customer, gives the agent a spending limit and presses Run. The scenario starts with a damaged cable, an old healthy diagnostic in a cache and no repair booked. The agent sees the customer complaint and the tools it is allowed to use. It does not get the hidden fault description or the success criteria.

The manager should be able to watch the decisions and then ask a concrete question: **did the agent restore service and verify it, without booking two repairs or closing the case too early?**

That requires more than plausible payloads.

## Schemas give the world a vocabulary

[OpenAPI](https://spec.openapis.org/oas/latest.html) describes HTTP interfaces, including operations and their request and response structures. [JSON Schema](https://json-schema.org/understanding-json-schema/about) describes and constrains JSON data. Event contracts add the shapes of messages exchanged between systems.

Use those contracts to build tool definitions, validate requests and generate the initial synthetic records. They are valuable inputs. They are not an executable model of the business.

A schema can require a line identifier and constrain a status to a set of values. It does not, by itself, establish that this customer's router belongs to L42, that a cable fault causes these diagnostic readings, or that a completed repair changes the next observation.

The simulation needs a separate behavioral layer: entities and relationships, transition rules, scheduled events and invariants. Generate the customer, service, line and device together. Then validate each API's projection of those records against its contract. Do not generate each endpoint's world independently.

## Two gateways, different jobs

![Proposed architecture: business goal enters an isolated agent sandbox. Model calls go through an AI gateway. Business calls go through a controlled tool gateway to one per-run simulation engine and shared state. Production is not connected.](/images/simulated-business-architecture.svg)

*Two controlled routes out of the agent runtime. The simulation is authoritative for business state; the model is not. [Open the architecture diagram](/images/simulated-business-architecture.svg).*

The **tool/API gateway** owns the business boundary. It authenticates the run, checks the allowed operation and validates the input. Every permitted business call goes to the same logical simulation engine, which owns that run's state. Read operations produce views of that state. Commands apply defined transitions and return contract-valid responses.

The **AI gateway** owns model access: allowed models, request tracing and usage controls. For example, [Cloudflare AI Gateway documents](https://developers.cloudflare.com/ai-gateway/) logging, cost analytics, rate limiting and model routing. Those are useful model-plane capabilities; they do not simulate a repair workflow. A hard per-run spending cap is a requirement of this proposal, not something to infer from the presence of cost analytics.

Tie both routes to the same run identifier so a reviewer can connect model decisions to tool calls and state changes. Keep their responsibilities separate even if one platform supplies both kinds of gateway.

There must be no fallback from an unknown operation to a real service. Reject it, record the missing capability and let the run fail visibly. The execution environment must enforce the route: no production credentials, no direct network path around the gateways, and no unrestricted browser, shell or secondary tool channel that quietly restores that access. A prompt telling the agent to stay in the sandbox is not isolation.

## L42 must stay broken for a reason

Here is a deliberately small scenario. The timings are invented test parameters, not a model of any operator's repair process.

![L42 scenario timeline: diagnostics observe a cable fault; restarting the router leaves the cable broken; one repair is booked; virtual time advances to repair completion; a fresh diagnostic verifies healthy service before case closure.](/images/simulated-business-l42.svg)

*One fault, several observations, and an explicit repair event. Stale data is a modeled view of the world, not a second truth. [Open the L42 timeline](/images/simulated-business-l42.svg).*

At the start, the cable is damaged. Repeated assurance diagnostics derive from that fault. They can include bounded measurement variation, but they cannot randomly declare a permanent recovery.

Restarting the router changes router state and may briefly interrupt connectivity. It does not change the cable's condition. Once the restart finishes, a fresh diagnostic still detects the fault.

Dispatching a repair creates a work order and schedules an event. It does not instantly mark the line healthy. When the simulation clock reaches the repair time, the event changes the cable state. A subsequent fresh diagnostic can then establish recovery.

The old cached healthy result is allowed to exist. Its observation time and freshness must be explicit, and the scenario must define when that cache refreshes. This is how to test whether an agent notices stale evidence without making the world arbitrarily contradictory.

Case closure should depend on post-repair evidence, not merely on a successful dispatch response. A reviewer should be able to point to the exact observation that justified closing it.

## Make retries change nothing twice

Now lose the response to the repair booking after the booking has committed.

The agent sees a timeout and retries. If it reuses the operation's idempotency key, the simulation should return the existing work order rather than create a second visit. Reusing that key with different input should produce the modeled conflict. The key's scope and retention are part of the scenario's API behavior, not a universal property of HTTP.

Keep the idempotency record in the same per-run world as the work order. Isolate runs from one another, including their caches, queues and scheduled events. Otherwise one agent's experiment can alter another's starting conditions.

Virtual time also needs a policy. Let a harness advance to the next scheduled event, or expose a constrained waiting operation. Do not let the agent rewrite the clock or the hidden state to satisfy its goal. Order simultaneous events deterministically and record the order used.

## Replay the world; do not promise identical reasoning

Save the initial snapshot, scenario version, random seed and clock policy. Record accepted commands, emitted events, observations and state transitions. With deterministic transition rules and event ordering, the same command sequence should reproduce the same simulated world.

That is different from asking a live model to make exactly the same decisions again. A seed for synthetic data does not control a remote model's behavior. Keep recorded model/tool transcripts for forensic replay, and distinguish that from a new evaluation run against the same starting world.

The result screen should show the goal, outcome evidence and violations. For L42: one repair booked, cable repaired, fresh healthy diagnostic obtained, case closed afterward. Beside that, show elapsed virtual time, model usage and any denied calls. A polished final message from the agent is not the result.

## A useful simulation has an edge

Start with one scenario that domain experts can challenge. Add a delayed repair, an unavailable appointment or a misleading old measurement only when its behavior is defined well enough to judge the agent fairly.

This sandbox cannot establish production reliability on its own. It will miss undocumented service behavior, real network conditions and human exceptions. Agents can also learn the shortcuts in a narrow scenario set. Keep unseen variants, review the rules with business owners and follow simulation with controlled integration testing.

But it can expose a much more important failure than malformed JSON: an agent that takes reasonable-looking actions without understanding their consequences.

Give it a world where the cable stays broken until something actually repairs it.
