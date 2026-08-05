import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal, api } from "./_generated/api"
import Stripe from "stripe"
import { Id } from "./_generated/dataModel"

const http = httpRouter()

// ── Stripe webhook ──────────────────────────────────────────────────────────

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) return new Response("Missing stripe-signature", { status: 400 })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      return new Response("Invalid signature", { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const eventId = session.metadata?.eventId as Id<"drawEvents"> | undefined
      if (eventId) {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1_000 // 30 days
        await ctx.runMutation(internal.events.activateLicense, { eventId, expiresAt })
      }
    }

    return new Response("ok")
  }),
})

// ── Winner CSV export ───────────────────────────────────────────────────────

http.route({
  path: "/export/winners",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // C4: require Clerk JWT in Authorization header
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return new Response("Unauthorized", { status: 401 })
    }

    const url = new URL(request.url)
    const eventId = url.searchParams.get("eventId") as Id<"drawEvents"> | null
    if (!eventId) return new Response("Missing eventId", { status: 400 })

    const event = await ctx.runQuery(api.events.get, { eventId })
    if (!event) return new Response("Event not found", { status: 404 })

    const logs = await ctx.runQuery(api.winnerLogs.listConfirmed, { eventId })

    const rows: string[][] = [
      ["No.", "Winner Name", "Winner Name (Chinese)", "Prize", "Drawn At (HKT)"],
      ...logs.map((log, i) => [
        String(i + 1),
        log.participantName,
        log.participantNameZh ?? "",
        log.prizeName,
        new Date(log._creationTime).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" }),
      ]),
    ]

    const csv = rows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\r\n")

    // REQ-08: sanitize event name before interpolating into Content-Disposition header
    const safeEventName = event.name.replace(/[^a-zA-Z0-9._-]/g, "_")

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeEventName}-winners.csv"`,
      },
    })
  }),
})

export default http
