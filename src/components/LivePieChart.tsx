import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

const PIE_COLORS = [
  "hsl(250, 75%, 55%)",
  "hsl(160, 70%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(340, 75%, 55%)",
];

interface LivePieChartProps {
  options: PollOption[];
  totalVotes: number;
}

export function LivePieChart({ options, totalVotes }: LivePieChartProps) {
  const pieData = options.map((opt, i) => ({
    name: opt.label,
    value: opt.vote_count,
    color: PIE_COLORS[i],
    pct: totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0,
  }));

  return (
    <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
      <p className="text-center text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
        Live Results
      </p>
      <div className="w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              animationDuration={400}
              label={({ name, pct }) => `${name} ${pct}%`}
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
                fontSize: "0.875rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
