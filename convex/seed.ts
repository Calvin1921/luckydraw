import { mutation } from "./_generated/server"
import { v } from "convex/values"

// 60 Chinese (HK) participants: name = romanisation, nameZh = traditional Chinese
const CHINESE_PARTICIPANTS: { name: string; nameZh: string }[] = [
  { name: "Chan Tai Man", nameZh: "陳大文" },
  { name: "Lee Siu Ming", nameZh: "李小明" },
  { name: "Cheung Wai Kin", nameZh: "張偉健" },
  { name: "Wong Mei Ling", nameZh: "王美玲" },
  { name: "Lam Chi Keung", nameZh: "林志強" },
  { name: "Lau Ka Yan", nameZh: "劉嘉欣" },
  { name: "Wong Si Wai", nameZh: "黃思慧" },
  { name: "Chiu Chi Ming", nameZh: "趙志明" },
  { name: "Ng Lai Na", nameZh: "吳麗娜" },
  { name: "Cheng Kin Wah", nameZh: "鄭建華" },
  { name: "Hui Nga Kam", nameZh: "許雅琴" },
  { name: "Tsang Man Fai", nameZh: "曾文輝" },
  { name: "Choi Wai Ming", nameZh: "蔡偉明" },
  { name: "Ho Ka Lai", nameZh: "何嘉麗" },
  { name: "Yeung Kwok Keung", nameZh: "楊國強" },
  { name: "Tse Mei Kwan", nameZh: "謝美君" },
  { name: "Hung Chi Wai", nameZh: "洪志偉" },
  { name: "Fung Po Jan", nameZh: "馮寶珍" },
  { name: "Lo Man Kit", nameZh: "盧文傑" },
  { name: "Leung Ka Yi", nameZh: "梁嘉儀" },
  { name: "Mak Hoi Ting", nameZh: "麥凱婷" },
  { name: "Poon Siu Fong", nameZh: "潘小鳳" },
  { name: "Tang Wai Lun", nameZh: "鄧偉倫" },
  { name: "Kwok Yuk Shan", nameZh: "郭玉珊" },
  { name: "Yip Ching Hang", nameZh: "葉正恆" },
  { name: "Chow Pui Yee", nameZh: "周佩儀" },
  { name: "Ko Wai Keung", nameZh: "高偉強" },
  { name: "Luk Sau Lin", nameZh: "陸秀蓮" },
  { name: "Ip Kin Fai", nameZh: "葉健輝" },
  { name: "Shum Ho Yin", nameZh: "沈浩然" },
  { name: "Chan Pui Kwan", nameZh: "陳佩君" },
  { name: "Wong Hau Nam", nameZh: "王厚南" },
  { name: "Lee Wai Shan", nameZh: "李慧珊" },
  { name: "Cheung Ka Wai", nameZh: "張嘉慧" },
  { name: "Tam Siu Chung", nameZh: "譚兆聰" },
  { name: "Ng Mei Lan", nameZh: "吳美蘭" },
  { name: "Lam Hok Yin", nameZh: "林學賢" },
  { name: "Liu Chi Fong", nameZh: "廖志芳" },
  { name: "So Yuk Fung", nameZh: "蘇玉鳳" },
  { name: "Wan Man Ho", nameZh: "尹文豪" },
  { name: "Cheng Sau Ping", nameZh: "鄭秀萍" },
  { name: "Yuen Bik Yee", nameZh: "袁碧儀" },
  { name: "Ho Chi Hang", nameZh: "何志恆" },
  { name: "Chan Lai Yin", nameZh: "陳麗燕" },
  { name: "Tsui Kwok On", nameZh: "徐國安" },
  { name: "Leung Wai Fun", nameZh: "梁慧芬" },
  { name: "Au Yeung Siu Tung", nameZh: "歐陽小彤" },
  { name: "Kwong Hoi Man", nameZh: "鄺海文" },
  { name: "Cheuk Lai Har", nameZh: "卓麗霞" },
  { name: "Choi Sze Man", nameZh: "蔡詩敏" },
  { name: "Fok Kin Lun", nameZh: "霍建麟" },
  { name: "Mok Wai Yi", nameZh: "莫慧儀" },
  { name: "Siu Kam Fai", nameZh: "蕭錦輝" },
  { name: "Tong Yuen Shan", nameZh: "唐苑珊" },
  { name: "Lai Pak Hei", nameZh: "黎柏熙" },
  { name: "Pang Siu Bun", nameZh: "彭兆彬" },
  { name: "Chu Wai Ling", nameZh: "朱慧玲" },
  { name: "Fan Ho Yee", nameZh: "樊浩怡" },
  { name: "Ngan Wai Hung", nameZh: "顏偉雄" },
  { name: "Zhu Mei Fong", nameZh: "朱美芳" },
]

// 40 English-only participants
const ENGLISH_PARTICIPANTS: { name: string }[] = [
  { name: "Michael Chen" },
  { name: "Sarah Wong" },
  { name: "David Liu" },
  { name: "Jessica Tam" },
  { name: "Kevin Ng" },
  { name: "Rachel Chan" },
  { name: "Brian Ho" },
  { name: "Emily Yip" },
  { name: "Jason Lee" },
  { name: "Amanda Fung" },
  { name: "Chris Lam" },
  { name: "Megan Kwok" },
  { name: "Patrick Cheung" },
  { name: "Stephanie Ma" },
  { name: "Andrew Chow" },
  { name: "Vivian Tsang" },
  { name: "Timothy Poon" },
  { name: "Natalie Hui" },
  { name: "Raymond Leung" },
  { name: "Cindy Choi" },
  { name: "Alan Mak" },
  { name: "Tiffany Ko" },
  { name: "Eric Shum" },
  { name: "Gloria Wan" },
  { name: "Steven Tang" },
  { name: "Michelle Yuen" },
  { name: "Gary Ip" },
  { name: "Linda Tse" },
  { name: "Victor Hung" },
  { name: "Elaine Fok" },
  { name: "Norman Siu" },
  { name: "Peggy Au" },
  { name: "Kelvin Chu" },
  { name: "Irene Lai" },
  { name: "Desmond Pang" },
  { name: "Fiona Fan" },
  { name: "Alvin Ngan" },
  { name: "Bonnie Zhu" },
  { name: "Terry Lo" },
  { name: "Crystal Yeung" },
]

export const seedDemoData = mutation({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    // Verify the event exists (no auth check — seed is dev-only)
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error(`Event not found: ${args.eventId}`)

    // --- Participants (idempotent: skip if >50 already exist) ---
    const existingParticipants = await ctx.db
      .query("participants")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .take(51)

    let participantsCreated = 0

    if (existingParticipants.length <= 50) {
      await Promise.all(
        CHINESE_PARTICIPANTS.map(p =>
          ctx.db.insert("participants", {
            eventId: args.eventId,
            name: p.name,
            nameZh: p.nameZh,
            isEligible: true,
            importSource: "manual",
          })
        )
      )

      await Promise.all(
        ENGLISH_PARTICIPANTS.map(p =>
          ctx.db.insert("participants", {
            eventId: args.eventId,
            name: p.name,
            isEligible: true,
            importSource: "manual",
          })
        )
      )

      participantsCreated = CHINESE_PARTICIPANTS.length + ENGLISH_PARTICIPANTS.length
    }

    // --- Prize tiers + prizes (always recreate: delete existing first) ---

    // Delete existing prizes for this event
    const existingPrizes = await ctx.db
      .query("prizes")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()
    await Promise.all(existingPrizes.map(p => ctx.db.delete(p._id)))

    // Delete existing tiers for this event
    const existingTiers = await ctx.db
      .query("prizeTiers")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()
    await Promise.all(existingTiers.map(t => ctx.db.delete(t._id)))

    // Tier 1 — Consolation Prize (10 x Gift Voucher HK$200)
    const tier1Id = await ctx.db.insert("prizeTiers", {
      eventId: args.eventId,
      name: "Consolation Prize",
      nameZh: "安慰獎",
      drawOrder: 1,
      allowRepeat: false,
    })
    await Promise.all(
      Array.from({ length: 10 }, () =>
        ctx.db.insert("prizes", {
          tierId: tier1Id,
          eventId: args.eventId,
          name: "Gift Voucher HK$200",
          nameZh: "禮品券 HK$200",
          isAwarded: false,
        })
      )
    )

    // Tier 2 — Second Prize (3 x Wireless Earbuds)
    const tier2Id = await ctx.db.insert("prizeTiers", {
      eventId: args.eventId,
      name: "Second Prize",
      nameZh: "二等獎",
      drawOrder: 2,
      allowRepeat: false,
    })
    await Promise.all(
      Array.from({ length: 3 }, () =>
        ctx.db.insert("prizes", {
          tierId: tier2Id,
          eventId: args.eventId,
          name: "Wireless Earbuds",
          nameZh: "無線耳機",
          isAwarded: false,
        })
      )
    )

    // Tier 3 — Grand Prize (1 x iPhone 16 Pro)
    const tier3Id = await ctx.db.insert("prizeTiers", {
      eventId: args.eventId,
      name: "Grand Prize",
      nameZh: "大獎",
      drawOrder: 3,
      allowRepeat: false,
    })
    await ctx.db.insert("prizes", {
      tierId: tier3Id,
      eventId: args.eventId,
      name: "iPhone 16 Pro",
      nameZh: "iPhone 16 Pro",
      isAwarded: false,
    })

    const tiersCreated = 3
    const prizesCreated = 10 + 3 + 1

    return { participantsCreated, tiersCreated, prizesCreated }
  },
})

/** One-time migration: clear legacy drawTheme values so schema validation passes.
 *  Maps old → new where obvious; clears the rest (user re-selects from new options).
 *  Run once: npx convex run seed:migrateDrawThemes
 */
export const migrateDrawThemes = mutation({
  args: {},
  handler: async (ctx) => {
    const MAP: Record<string, string> = {
      classic:   "luckyballs",
      galaxy:    "luckyballs",
      neon:      "cyber",
      elegant:   "crystal",
      explosive: "luckyballs",
    }
    const events = await ctx.db.query("drawEvents").collect()
    let migrated = 0
    for (const event of events) {
      const theme = event.drawTheme as string | undefined
      if (!theme) continue
      if (["luckyballs","crystal","cyber"].includes(theme)) continue
      const mapped = MAP[theme] ?? "luckyballs"
      await ctx.db.patch(event._id, { drawTheme: mapped as "luckyballs" | "crystal" | "cyber" | undefined })
      migrated++
    }
    return { migrated }
  },
})

/** Create a test event with a dummy org — dev use only.
 *  npx convex run seed:createTestEvent
 */
export const createTestEvent = mutation({
  args: {},
  handler: async (ctx) => {
    // Create or reuse a dummy org
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", "test-org-dev"))
      .first()

    const orgId = existingOrg?._id ?? await ctx.db.insert("organizations", {
      clerkOrgId: "test-org-dev",
      name: "Test Organization",
      slug: "test-org",
      plan: "agency",
    })

    const eventId = await ctx.db.insert("drawEvents", {
      orgId,
      name: "Annual Gala 2026",
      nameZh: "2026年度盛典",
      status: "active",
      primaryColor: "#e2a84b",
      locale: "both",
      drawTheme: "nova",
    })

    return { orgId, eventId }
  },
})

/** Wipe all data — run before seeding fresh. Dev use only.
 *  npx convex run seed:clearAll
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["winnerLogs", "drawSessions", "prizes", "prizeTiers", "participants", "drawEvents"] as const
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect()
      for (const doc of docs) await ctx.db.delete(doc._id)
      counts[table] = docs.length
    }
    return counts
  },
})
