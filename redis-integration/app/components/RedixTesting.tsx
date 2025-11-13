"use client";

import { useEffect, useState } from "react";

interface Player {
  rank: number;
  userId: string;
  score: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/quiz/leaderboard");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // refresh every 3s

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🏆 Live Leaderboard</h1>
      <table border={1} cellPadding={8} style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>User ID</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player) => (
            <tr key={player.userId}>
              <td>{player.rank}</td>
              <td>{player.userId}</td>
              <td>{player.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
