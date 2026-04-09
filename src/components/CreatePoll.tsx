import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";

interface CreatePollProps {
  onCreated: (pollId: string) => void;
}

export function CreatePoll({ onCreated }: CreatePollProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [voteTimeLimit, setVoteTimeLimit] = useState(30);
  const [creating, setCreating] = useState(false);

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const handleCreate = async () => {
    const trimmedQ = question.trim();
    const trimmedOpts = options.map((o) => o.trim()).filter(Boolean);

    if (!trimmedQ) {
      toast.error("Enter a question");
      return;
    }
    if (trimmedOpts.length < 2) {
      toast.error("Add at least 2 options");
      return;
    }
    const durationSeconds = durationMinutes * 60;
    if (voteTimeLimit >= durationSeconds) {
      toast.error("Per-device time must be less than poll duration");
      return;
    }

    setCreating(true);
    try {
      const endsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({
          question: trimmedQ,
          duration_seconds: durationSeconds,
          ends_at: endsAt,
          vote_time_limit: voteTimeLimit,
        })
        .select()
        .single();

      if (pollErr || !poll) throw pollErr;

      const { error: optErr } = await supabase
        .from("poll_options")
        .insert(trimmedOpts.map((label) => ({ poll_id: poll.id, label })));

      if (optErr) throw optErr;

      toast.success("Poll created!");
      onCreated(poll.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  const optionColors = ["bg-vote-a", "bg-vote-b", "bg-vote-c", "bg-vote-d"];

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Zap className="w-4 h-4" />
          Create a Poll
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          What do you want to ask?
        </h1>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            Your question
          </label>
          <Input
            placeholder="e.g. What's your favorite framework?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="text-base h-12"
            maxLength={200}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${optionColors[i]} shrink-0`} />
              <Input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                maxLength={100}
                className="h-11"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Add option
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              🌐 Poll duration (min)
            </label>
            <Input
              type="number"
              min={1}
              max={60}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, Math.min(60, Number(e.target.value))))}
              className="h-11 font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Total time poll stays open</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              👤 Per-device limit (sec)
            </label>
            <Input
              type="number"
              min={5}
              max={600}
              value={voteTimeLimit}
              onChange={(e) => setVoteTimeLimit(Math.max(5, Math.min(600, Number(e.target.value))))}
              className="h-11 font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Time each voter gets to decide</p>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={creating}
          className="w-full h-12 text-base font-semibold animate-pulse-glow"
          size="lg"
        >
          {creating ? "Creating..." : "Launch Poll 🚀"}
        </Button>
      </div>
    </div>
  );
}
