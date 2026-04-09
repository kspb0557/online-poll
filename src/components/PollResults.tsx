import { Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface PollResultsProps {
  options: PollOption[];
  totalVotes: number;
  onBack: () => void;
}

const PIE_COLORS = [
  "hsl(250, 75%, 55%)",
  "hsl(160, 70%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(340, 75%, 55%)",
];

export function PollResults({ options, totalVotes, onBack }: PollResultsProps) {
  const sorted = [...options].sort((a, b) => b.vote_count - a.vote_count);
  const maxVotes = sorted[0]?.vote_count || 0;
  const winners = sorted.filter((o) => o.vote_count === maxVotes && maxVotes > 0);

  const barColors = ["bg-vote-a", "bg-vote-b", "bg-vote-c", "bg-vote-d"];
  const colorMap = new Map(options.map((o, i) => [o.id, barColors[i]]));

  const pieData = options.map((opt, i) => ({
    name: opt.label,
    value: opt.vote_count,
    color: PIE_COLORS[i],
  }));

  return (
    <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
      {winners.length > 0 && (
        <div className="text-center space-y-2">
          <Trophy className="w-10 h-10 text-timer-warn mx-auto" />
          <p className="text-lg font-bold text-foreground">
            🏆 {winners.length > 1 ? "It's a tie!" : `Winner: ${winners[0].label}`}
          </p>
        </div>
      )}

      {totalVotes === 0 && (
        <p className="text-center text-muted-foreground">No votes were cast.</p>
      )}

      {totalVotes > 0 && (
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} votes`, ""]}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const isWinner = opt.vote_count === maxVotes && maxVotes > 0;

          return (
            <div key={opt.id} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`font-medium ${isWinner ? "text-foreground" : "text-muted-foreground"}`}>
                  {isWinner && "👑 "}{opt.label}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {opt.vote_count} ({pct}%)
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full animate-bar-fill ${colorMap.get(opt.id) || barColors[0]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
      </p>

      <Button onClick={onBack} variant="outline" className="w-full">
        <ArrowLeft className="w-4 h-4 mr-2" /> Create New Poll
      </Button>
    </div>
  );
}
