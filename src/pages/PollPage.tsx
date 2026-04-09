import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VotingPoll } from "@/components/VotingPoll";

const PollPage = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();

  if (!pollId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground">Invalid poll link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <VotingPoll pollId={pollId} onBack={() => navigate("/")} />
    </div>
  );
};

export default PollPage;
