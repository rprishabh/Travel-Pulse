// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — Daily Travel Fact API
// GET /api/travel/daily-fact
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Curated pool of highly engaging, verified, and obscure travel/cultural facts
const OBSCURE_FACT_POOL = [
  {
    title: "Gol Gumbaz Whispering Gallery",
    fact: "The dome of Gol Gumbaz in Karnataka features a whispering gallery where the softest sound is magnified and echoes exactly 11 times across a 40-meter chamber.",
    detailedFact: "Completed in 1656, Gol Gumbaz is the mausoleum of King Muhammad Adil Shah. Its circular dome is one of the largest ever built. The acoustics are so precise that a single clap can produce multiple distinct echoes, and whispers carry clearly from one side of the vast gallery to the other, 40 meters away.",
    category: "ARCHITECTURE",
    region: "South India",
    state: "Karnataka",
    funEmoji: "🕌",
    sourceUrl: "https://www.karnatakatourism.org/",
  },
  {
    title: "Living Root Bridges of Meghalaya",
    fact: "Hand-woven from the aerial roots of Ficus elastica trees by the Khasi people, these living root bridges grow stronger over centuries instead of decaying.",
    detailedFact: "Unlike traditional timber or concrete structures, living root bridges in Cherrapunji can withstand torrential monsoon floods by constantly growing. They take 10 to 15 years to become fully functional and can support the weight of over 50 people at once, lasting for up to 500 years.",
    category: "HERITAGE",
    region: "East India",
    state: "Meghalaya",
    funEmoji: "🌳",
    sourceUrl: "https://www.meghalayatourism.in/",
  },
  {
    title: "Shivapur's Levitating Stone",
    fact: "In a shrine near Pune, a 70kg basalt boulder can only be lifted off the ground when 11 people touch it with their index fingers and chant a specific name.",
    detailedFact: "Located at the Hazrat Qamar Ali Darvesh shrine, this stone defies normal lifting attempts. Standard physical strength fails to lift it, yet when exactly 11 individuals place their tips of index fingers under the stone and call out the saint's name in unison, the stone lifts effortlessly above their heads.",
    category: "SPIRITUAL",
    region: "West India",
    state: "Maharashtra",
    funEmoji: "🪨",
    sourceUrl: "https://www.maharashtratourism.gov.in/",
  },
  {
    title: "Loktak's Floating Islands",
    fact: "Loktak Lake in Manipur is famous for its Phumdis—massive floating islands of vegetation and organic matter that support the world's only floating national park.",
    detailedFact: "The Keibul Lamjao National Park floats entirely on these Phumdis. It is the last natural refuge of the endangered Sangai, or brow-antlered deer, which has adapted to live on the soft, spongy floating soil. The locals also construct floating huts, called Phumshangs, on these unique islands.",
    category: "WILDLIFE",
    region: "Northeast India",
    state: "Manipur",
    funEmoji: "🦌",
    sourceUrl: "https://manipurtourism.gov.in/",
  },
  {
    title: "Shani Shingnapur: The Doorless Village",
    fact: "The village of Shani Shingnapur has houses and shops with no doors—only open frames—due to an ancient belief that the deity Shani guards them from theft.",
    detailedFact: "Even the local commercial bank branch in the village has no front lock. For centuries, no thefts were reported. According to legend, anyone who attempts to steal is instantly struck with blindness or bad luck by Lord Shani, the god of Saturn, whose open-air black stone shrine stands at the center of the village.",
    category: "CULTURE",
    region: "West India",
    state: "Maharashtra",
    funEmoji: "🏠",
    sourceUrl: "https://www.maharashtratourism.gov.in/",
  },
  {
    title: "The Magnetic Hill of Ladakh",
    fact: "On the Leh-Kargil highway, an optical illusion makes vehicles appear to roll uphill against gravity when placed in neutral gear.",
    detailedFact: "The layout of the surrounding slopes creates a powerful optical illusion, making a slight downhill slope look like an uphill incline. When you park your car in the marked box on the road and put it in neutral, the vehicle appears to move forward at speeds of up to 20 km/h, seemingly pulled by magnetic forces.",
    category: "GEOGRAPHY",
    region: "North India",
    state: "Ladakh",
    funEmoji: "⛰️",
    sourceUrl: "https://www.ladakhtourism.travel/",
  },
  {
    title: "Lepakshi's Hanging Pillar",
    fact: "Out of the 70 massive stone pillars in the Veerabhadra Temple, one pillar does not touch the temple floor and hangs completely suspended in the air.",
    detailedFact: "Built in the 16th century during the Vijayanagara Empire, the temple's hanging pillar is an architectural mystery. Tourists frequently pass thin sheets of paper or cloth completely underneath the base of the pillar to confirm that it is indeed detached from the ground, supported only by the ceiling structure.",
    category: "ARCHITECTURE",
    region: "South India",
    state: "Andhra Pradesh",
    funEmoji: "🏛️",
    sourceUrl: "https://aptourism.gov.in/",
  },
  {
    title: "The Magic Clay Pots of Jagannath",
    fact: "In the giant kitchen of the Jagannath Temple, food is cooked in seven clay pots stacked vertically over a wood fire. The top-most pot always cooks first.",
    detailedFact: "This massive temple kitchen prepares meals for tens of thousands of pilgrims daily. Cooks stack 7 clay pots directly on top of each other over a single hearth. Despite the heat source being at the very bottom, steam somehow cooks the ingredients in the highest pot first, descending one by one until the bottom-most pot finishes last.",
    category: "CUISINE",
    region: "East India",
    state: "Odisha",
    funEmoji: "🍲",
    sourceUrl: "https://www.odishatourism.gov.in/",
  },
  {
    title: "The Lonar Meteorite Crater Lake",
    fact: "Lonar Lake in Maharashtra is a highly alkaline and saline lake formed by a high-velocity basaltic meteorite impact over 52,000 years ago.",
    detailedFact: "Lonar is one of only four known hyper-velocity impact craters in basaltic rock worldwide. The lake's water chemistry is unique, hosting specialized alkaline-loving bacteria and microorganisms found nowhere else. In 2020, the lake mysteriously turned pink overnight due to Halophilic archaea blooms.",
    category: "GEOGRAPHY",
    region: "West India",
    state: "Maharashtra",
    funEmoji: "🪐",
    sourceUrl: "https://www.maharashtratourism.gov.in/",
  },
  {
    title: "Edible Gold Foil Vark of Ahmedabad",
    fact: "Ahmedabad's traditional metalsmiths hammer pure gold and silver for hours between layers of leather until they become micro-thin edible foils.",
    detailedFact: "Called Vark, this micro-thin foil is used to decorate Indian sweets and cardamoms. The foil is beaten so thin (under 0.2 micrometers) that it disintegrates upon touch and remains suspended on food items without altering flavor or texture, and is fully safe for human consumption.",
    category: "CUISINE",
    region: "West India",
    state: "Gujarat",
    funEmoji: "✨",
    sourceUrl: "https://www.gujarattourism.com/",
  }
];

export async function GET() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    // Standard date string comparison
    const isoDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const targetDate = new Date(isoDateStr);

    // 1. Try to fetch from persistent cache (database)
    let fact = await prisma.dailyFact.findFirst({
      where: {
        factDate: {
          equals: targetDate,
        },
        isPublished: true,
      },
    });

    // 2. If not found in DB, select one deterministically from the pool and insert it
    if (!fact) {
      // Calculate day of year to ensure daily rotation
      const startOfYear = new Date(today.getFullYear(), 0, 0);
      const diff = today.getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const selectedItem = OBSCURE_FACT_POOL[dayOfYear % OBSCURE_FACT_POOL.length];

      try {
        // Upsert/Create cache record in database
        fact = await prisma.dailyFact.upsert({
          where: {
            factDate: targetDate,
          },
          update: {
            title: selectedItem.title,
            fact: selectedItem.fact,
            detailedFact: selectedItem.detailedFact,
            category: selectedItem.category as any,
            region: selectedItem.region,
            state: selectedItem.state,
            funEmoji: selectedItem.funEmoji,
            sourceUrl: selectedItem.sourceUrl,
            isPublished: true,
          },
          create: {
            factDate: targetDate,
            title: selectedItem.title,
            fact: selectedItem.fact,
            detailedFact: selectedItem.detailedFact,
            category: selectedItem.category as any,
            region: selectedItem.region,
            state: selectedItem.state,
            funEmoji: selectedItem.funEmoji,
            sourceUrl: selectedItem.sourceUrl,
            isPublished: true,
          },
        });
      } catch (dbErr) {
        console.error("Failed to write daily fact cache to DB, returning in-memory:", dbErr);
        // Fallback: construct ephemeral response if DB write fails
        return NextResponse.json({
          success: true,
          data: {
            id: `temp-${dayOfYear}`,
            factDate: targetDate.toISOString(),
            title: selectedItem.title,
            fact: selectedItem.fact,
            detailedFact: selectedItem.detailedFact,
            category: selectedItem.category,
            region: selectedItem.region,
            state: selectedItem.state,
            funEmoji: selectedItem.funEmoji,
            sourceUrl: selectedItem.sourceUrl,
            tone: "CASUAL_ENGAGING",
            isPublished: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: fact,
    });
  } catch (error) {
    console.error("[API /api/travel/daily-fact] Error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    }, { status: 500 });
  }
}
