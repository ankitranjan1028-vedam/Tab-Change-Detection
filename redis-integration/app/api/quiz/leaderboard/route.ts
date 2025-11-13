import { NextResponse } from "next/server";
import { connectRedis } from "./../../../lib/redis"; 

export async function POST(req: Request) {
  const redis = await connectRedis(); 
  const { userId, score } = await req.json();

  if (!userId || typeof score !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await redis.zIncrBy("leaderboard", score, userId);

  return NextResponse.json({ message: "Score updated", userId, score });
}

export async function GET() {
  const redis = await connectRedis();
  const leaderboard = await redis.zRangeWithScores("leaderboard", -10, -1, {
    REV: true,
  });

  return NextResponse.json({
    leaderboard: leaderboard.map((entry, i) => ({
      rank: i + 1,
      userId: entry.value,
      score: entry.score,
    })),
  });
}
