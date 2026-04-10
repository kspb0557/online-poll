import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface PollResultsProps {
  pollId: string;
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

export function PollResults({ pollId, options: initialOptions, totalVotes: initialTotalVotes, onBack }: PollResultsProps) {
  const [options, setOptions] = useState(initialOptions);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`poll-results-${pollId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "poll_options", filter: `poll_id=eq.${pollId}` },
        (payload) => {
          setOptions((prev) => {
            const updated = prev.map((opt) =>
              opt.id === payload.new.id
                ? { ...opt, vote_count: payload.new.vote_count }
                : opt
            );
            const newTotal = updated.reduce((sum, opt) => sum + opt.vote_count, 0);
            setTotalVotes(newTotal);
            return updated;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes", filter: `poll_id=eq.${pollId}` },
        () => {
          // When a new vote is inserted, refetch options to get accurate counts
          const fetchUpdatedOptions = async () => {
            const { data: updatedOpts } = await supabase
              .from("poll_options")
              .select("*")
              .eq("poll_id", pollId)
              .order("label");
            
            if (updatedOpts) {
              setOptions(updatedOpts);
              const newTotal = updatedOpts.reduce((sum, opt) => sum + opt.vote_count, 0);
              setTotalVotes(newTotal);
            }
          };
          fetchUpdatedOptions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [pollId]);

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
      <div className="flex items-center justify-between">
        <div className="flex-1">
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
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          📊 {totalVotes} votes
        </span>
      </div>

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
                animationDuration={300}
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
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColors[options.findIndex((o) => o.id === opt.id)]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={onBack} variant="outline" className="w-full">
        ← Back to Home
      </Button>
    </div>
  );
}
