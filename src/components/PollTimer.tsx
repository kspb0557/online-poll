import { useEffect, useState } from "react";
import { Clock, User, Globe } from "lucide-react";

interface PollTimerProps {
  endsAt: string;
  onExpire: () => void;
  label?: string;
  icon?: "poll" | "device";
}

export function PollTimer({ endsAt, onExpire, label, icon = "poll" }: PollTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const isWarning = remaining <= 30 && remaining > 10;
  const isDanger = remaining <= 10;

  const timerColor = isDanger
    ? "text-destructive"
    : isWarning
    ? "text-timer-warn"
    : "text-foreground";

  const IconComponent = icon === "device" ? User : Globe;

  return (
    <div className="flex flex-col items-center gap-0.5">
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      )}
      <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${timerColor} ${isDanger ? "animate-timer-pulse" : ""}`}>
        <IconComponent className="w-4 h-4" />
        <span>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
