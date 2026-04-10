import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PollTimer } from "./PollTimer";
import { PollResults } from "./PollResults";
import { LivePieChart } from "./LivePieChart";
import { toast } from "sonner";
import { CheckCircle2, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface Poll {
  id: string;
  question: string;
  ends_at: string;
  is_active: boolean;
  vote_time_limit: number;
}

interface VotingPollProps {
  pollId: string;
  onBack: () => void;
}

const DEVICE_OPEN_KEY = "poll_opened_at_";

export function VotingPoll({ pollId, onBack }: VotingPollProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [deviceExpired, setDeviceExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const [voterId, setVoterId] = useState<string | null>(null);

  // Track when this device opened the poll
  const deviceDeadline = useMemo(() => {
    const key = DEVICE_OPEN_KEY + pollId;
    let openedAt = localStorage.getItem(key);
    if (!openedAt) {
      openedAt = new Date().toISOString();
      localStorage.setItem(key, openedAt);
    }
    return openedAt;
  }, [pollId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setVoterId(data.user.id);
    });
  }, []);

  const fetchPoll = useCallback(async () => {
    if (!voterId) return;

    const { data: pollData } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollData) {
      setPoll(pollData);
      if (!pollData.is_active || new Date(pollData.ends_at) <= new Date()) {
        setExpired(true);
      }
    }

    const { data: optData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("label");

    if (optData) setOptions(optData);

    const { data: voteData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId)
      .eq("voter_id", voterId)
      .maybeSingle();

    if (voteData) {
      setHasVoted(true);
      setVotedOptionId(voteData.option_id);
    }

    setLoading(false);
  }, [pollId, voterId]);

  useEffect(() => {
    if (voterId) fetchPoll();
  }, [fetchPoll, voterId]);

  useEffect(() => {
    const channel = supabase
      .channel(`poll-options-${pollId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "poll_options", filter: `poll_id=eq.${pollId}` },
        (payload) => {
          setOptions((prev) =>
            prev.map((opt) => (opt.id === payload.new.id ? { ...opt, vote_count: payload.new.vote_count } : opt))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes", filter: `poll_id=eq.${pollId}` },
        () => {
          // Refetch all options when a new vote is inserted to ensure accurate counts
          const refreshOptions = async () => {
            const { data: updatedOpts } = await supabase
              .from("poll_options")
              .select("*")
              .eq("poll_id", pollId)
              .order("label");
            
            if (updatedOpts) {
              setOptions(updatedOpts);
            }
          };
          refreshOptions();
        }
      )
      .subscribe((status) => {
        console.log("Poll options subscription status:", status);
      });
    
    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [pollId]);

  useEffect(() => {
    const channel = supabase
      .channel(`poll-status-${pollId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "polls", filter: `id=eq.${pollId}` },
        (payload) => {
          if (!payload.new.is_active) {
            setExpired(true);
            setPoll((prev) => (prev ? { ...prev, is_active: false } : prev));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pollId]);

  const handleVote = async (optionId: string) => {
    if (hasVoted || expired || deviceExpired || voting || !voterId) return;
    setVoting(true);

    try {
      const { error: voteErr } = await supabase
        .from("votes")
        .insert({ poll_id: pollId, option_id: optionId, voter_id: voterId });

      if (voteErr) {
        if (voteErr.code === "23505") {
          toast.error("You already voted!");
          setHasVoted(true);
          return;
        }
        throw voteErr;
      }

      // Refetch all options to get accurate vote counts
      const { data: updatedOptions } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollId)
        .order("label");

      if (updatedOptions) {
        setOptions(updatedOptions);
      }

      setHasVoted(true);
      setVotedOptionId(optionId);
      toast.success("Vote cast!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  const handlePollExpire = useCallback(async () => {
    setExpired(true);
    await supabase.from("polls").update({ is_active: false }).eq("id", pollId);
  }, [pollId]);

  const handleDeviceExpire = useCallback(() => {
    if (!hasVoted) {
      setDeviceExpired(true);
      toast.error("Your voting time ran out!");
    }
  }, [hasVoted]);

  const handleShare = () => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    toast.success("Poll link copied!");
  };

  // Compute device deadline ISO string
  const deviceEndsAt = useMemo(() => {
    if (!poll) return "";
    const opened = new Date(deviceDeadline).getTime();
    return new Date(opened + poll.vote_time_limit * 1000).toISOString();
  }, [poll, deviceDeadline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Poll not found.
        <button onClick={onBack} className="block mx-auto mt-4 text-primary hover:underline">
          ← Create a new poll
        </button>
      </div>
    );
  }

  const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);
  const optionColors = ["bg-vote-a", "bg-vote-b", "bg-vote-c", "bg-vote-d"];
  const optionHoverColors = [
    "hover:border-vote-a hover:shadow-[0_0_20px_hsl(var(--vote-a)/0.3)]",
    "hover:border-vote-b hover:shadow-[0_0_20px_hsl(var(--vote-b)/0.3)]",
    "hover:border-vote-c hover:shadow-[0_0_20px_hsl(var(--vote-c)/0.3)]",
    "hover:border-vote-d hover:shadow-[0_0_20px_hsl(var(--vote-d)/0.3)]",
  ];

  const canVote = !hasVoted && !expired && !deviceExpired && !voting;

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {poll.question}
        </h1>

        {/* Dual timers */}
        {!expired && (
          <div className="flex items-center justify-center gap-6">
            <PollTimer
              endsAt={poll.ends_at}
              onExpire={handlePollExpire}
              label="Poll closes"
              icon="poll"
            />
            {!hasVoted && !deviceExpired && (
              <div className="w-px h-8 bg-border" />
            )}
            {!hasVoted && !deviceExpired && (
              <PollTimer
                endsAt={deviceEndsAt}
                onExpire={handleDeviceExpire}
                label="Your time"
                icon="device"
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground">
            <Share2 className="w-4 h-4 mr-1" />
            <Copy className="w-3 h-3" />
          </Button>
        </div>

        {expired && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive font-semibold text-sm">
            ⏱ Voting Closed
          </div>
        )}
        {deviceExpired && !expired && !hasVoted && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-timer-warn/10 text-timer-warn font-semibold text-sm">
            ⏰ Your voting time expired — waiting for poll results
          </div>
        )}
      </div>

      {/* Live pie chart */}
      {!expired && totalVotes > 0 && (
        <LivePieChart options={options} totalVotes={totalVotes} />
      )}

      {expired ? (
        <PollResults pollId={pollId} options={options} totalVotes={totalVotes} onBack={onBack} />
      ) : (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-3">
          {hasVoted && (
            <div className="flex items-center gap-2 text-accent font-medium text-sm mb-2">
              <CheckCircle2 className="w-4 h-4" /> You voted! Waiting for results...
            </div>
          )}

          {options.map((opt, i) => {
            const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
            const isSelected = votedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={!canVote}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : !canVote
                    ? "border-border opacity-60 cursor-default"
                    : `border-border ${optionHoverColors[i]} cursor-pointer`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${optionColors[i]} shrink-0`} />
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="ml-auto font-mono text-sm text-muted-foreground">
                    {hasVoted || totalVotes > 0
                      ? `${opt.vote_count} (${pct}%)`
                      : ""}
                  </span>
                </div>
                {totalVotes > 0 && (
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${optionColors[i]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}

          <p className="text-center text-sm text-muted-foreground pt-2">
            {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
