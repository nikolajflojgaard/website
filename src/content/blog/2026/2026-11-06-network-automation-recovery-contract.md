---
title: "Network automation needs a recovery contract, not just an intent API"
description: "Configuration can succeed while the customer order fails. A hybrid workflow needs an explicit recovery owner, a point of no return, and evidence of completion."
pubDatetime: 2026-11-06T08:20:00.000Z
tags:
  - telecom
  - integration-architecture
  - enterprise-architecture
heroImage: "/images/network-recovery-contract.svg"
heroImageAlt: "Illustrative hybrid order workflow with local commit boundaries, observed network state and recovery ownership."
ogImage: "https://nikolajflojgaard.me/images/network-recovery-contract.png"
featured: false
---

*Proposed architecture, not a vendor deployment diagram. [Open the editable SVG](/images/network-recovery-contract.svg).*

The network configuration succeeds, but the inventory update fails. The customer order is still open.

Which team owns the next move?

An intent API can describe the desired outcome perfectly and still leave that question unanswered. The difficult part is deciding what to do with work that has already happened when the rest of the flow cannot finish.

On November 4, [Rakuten Symphony and Boost Mobile announced an expanded relationship](https://symphony.rakuten.com/newsroom/rakuten-symphonys-configuration-management-solution-scales-boost-mobiles-5g-operational-efficiency), adding Configuration Manager alongside existing OSS service assurance. That is the news hook here. The announcement does not establish how their order recovery works, and its performance benefits are vendor claims, not independent measurements.

The architecture below is a proposal for a hypothetical hybrid estate. It is not a description of either company's implementation, nor evidence that they use Azure or a particular API standard.

## Start with the awkward order

Suppose a business support system accepts a service upgrade. An Azure-hosted workflow records the order and asks an on-premises adapter to change the network configuration. The adapter accepts the command; later, a read-back confirms the requested configuration is present. Inventory must then record the new assignment before the order can close.

Now make inventory unavailable for twenty minutes.

For a staged change that nobody has used, rolling the network back can be appropriate. Once the customer is using the upgraded service, that same response can interrupt a working connection. Leaving the order marked complete would hide unfinished work. Repeating the activation would be worse if the operation is not safe to repeat.

The recovery decision depends on where the order is in its lifecycle, not just which endpoint returned an error.

## Draw the point of no return

[Microsoft's Saga guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga) provides useful vocabulary: local transactions, compensating actions, a pivot after which the flow must complete, and idempotent retryable steps. It also makes an uncomfortable point explicit: compensation can fail too.

For this proposed flow, put the pivot at customer cutover, after preparation and checks. Before cutover, release a reservation or remove a staged configuration if the order cannot proceed. After confirmed cutover, preserve the active service and repair the remaining inventory and order records. A later service reversal would be a separately authorised change, not an automatic consequence of an inventory timeout.

That boundary needs agreement from the service owner. “Activation” is too vague: staging a configuration and switching live traffic have different consequences.

An adapter's database commit also does not make a device change atomic. Keep the adapter's operation record separate from evidence of what the network actually did. If cutover times out, the workflow has an unknown outcome to reconcile, not permission to assume that it is still safely before the pivot.

## Make the recovery contract small enough to use

For each step, record its operation ID, target resource and expected configuration version. Store the observed result separately, with the time it was obtained. A delayed success event from an earlier attempt must not close the current order.

Then specify the recovery action and who owns it. For example:

- **Reservation fails before cutover:** release any confirmed reservation using its original identifier. The resource service owns the release; the workflow tracks whether it finishes.
- **Inventory fails after confirmed cutover:** retry the assignment update with the same operation ID. The inventory service must recognise the duplicate, rather than create another assignment.
- **Cutover outcome is unknown:** query the operation and reconcile observed state before issuing another write. Escalate if the available evidence cannot distinguish success from failure.
- **Recovery fails:** retain the order as recovery-required and assign it to a named operational queue with a deadline. Do not quietly close it because a ticket was created.

These are proposed contract rules, not guarantees supplied by the hosting platform. An Azure workflow cannot invent idempotency inside a legacy adapter. That behaviour has to exist at the boundary where the side effect happens.

The workflow should own the end-to-end recovery record. Each participating service still owns its local action. Otherwise every component can report that it handled its exception while the customer order remains stuck between them.

## Observed configuration is necessary, but not enough

A successful command response means the command interface returned success. Read-back can show that the expected configuration is present. Neither alone proves the service is usable or that fulfilment is complete.

In this example, close the order only when the expected configuration version is observed, the service acceptance check passes, and the required inventory record is confirmed. Define those checks for the actual product. A generic green status from the adapter is not a substitute.

If the feedback path is unavailable, keep the distinction visible. “Awaiting confirmation” is different from “configuration failed.” That is the same uncertainty behind [an API timeout that causes an agent to do the work twice](/posts/2026/2026-10-22-api-timeout-agent-did-it-twice), now spread across an entire order.

## Test the handoff nobody wants

Before calling this automated fulfilment, interrupt it after confirmed cutover but before inventory acknowledges the update. Restart the workflow. Deliver the confirmation event twice, then deliver an older event. Finally, make the recovery action fail.

The useful result is not a clean demo trace. It is an order that retains its identity, does not repeat the network change, and tells operations exactly what remains unresolved.

A recovery-required queue is not evidence that automation failed as an idea. It is where automation admits the limits of its authority and evidence. Design that handoff as carefully as the happy path.
