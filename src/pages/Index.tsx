import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoginPage } from "@/components/LoginPage";
import { CreatePoll } from "@/components/CreatePoll";
import { VotingPoll } from "@/components/VotingPoll";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePollId, setActivePollId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActivePollId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <span className="font-bold text-foreground text-lg">Online Poll</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <main className="flex items-center justify-center p-4 min-h-[calc(100vh-57px)]">
        {activePollId ? (
          <VotingPoll pollId={activePollId} onBack={() => setActivePollId(null)} />
        ) : (
          <CreatePoll onCreated={(id) => setActivePollId(id)} />
        )}
      </main>
    </div>
  );
};

export default Index;
