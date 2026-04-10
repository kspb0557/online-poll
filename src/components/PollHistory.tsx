import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { History, ArrowRight } from "lucide-react";

interface HistoryPoll {
  id: string;
  question: string;
  ends_at: string;
  is_active: boolean;
  vote_count: number;
  created_at: string;
}

interface PollHistoryProps {
  onSelectPoll: (pollId: string) => void;
}

export function PollHistory({ onSelectPoll }: PollHistoryProps) {
  const [polls, setPolls] = useState<HistoryPoll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const { data } = await supabase
          .from("polls")
          .select("*, poll_options(vote_count)")
          .order("created_at", { ascending: false });

        if (data) {
          const enriched = data.map((poll: any) => ({
            ...poll,
            vote_count: (poll.poll_options || []).reduce(
              (sum: number, opt: any) => sum + (opt.vote_count || 0),
              0
            ),
          }));
          setPolls(enriched);
        }
      } catch (err) {
        console.error("Error fetching polls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-20">
        <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">No polls yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <History className="w-6 h-6" />
        Poll History
      </h2>

      <div className="space-y-3">
        {polls.map((poll) => {
          const isActive = poll.is_active && new Date(poll.ends_at) > new Date();
          
          return (
            <div
              key={poll.id}
              className="bg-card rounded-xl p-4 shadow border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">
                    {poll.question}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {poll.vote_count} vote{poll.vote_count !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {isActive
                        ? "🔴 Active"
                        : "⏹️ Closed"}
                    </span>
                    <span>
                      {new Date(poll.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onSelectPoll(poll.id)}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  View
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
