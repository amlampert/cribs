import { ListingWithStats, useToggleReaction } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReactionType = 'fire' | 'gross' | 'wtf' | 'flex' | 'gem';

export function ReactionBar({ listing }: { listing: ListingWithStats }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const toggleReaction = useToggleReaction();
  const { toast } = useToast();

  const [localReactions, setLocalReactions] = useState({
    userReactions: listing.userReactions || [],
    fireCount: listing.fireCount || 0,
    grossCount: listing.grossCount || 0,
    wtfCount: listing.wtfCount || 0,
    flexCount: listing.flexCount || 0,
    gemCount: listing.gemCount || 0,
  });

  const handleReaction = (e: React.MouseEvent, type: ReactionType) => {
    e.preventDefault(); // Prevent navigating if wrapped in a link
    e.stopPropagation();
    
    if (!user) {
      setLocation('/auth');
      return;
    }

    const hasReacted = localReactions.userReactions.includes(type);
    
    setLocalReactions(prev => {
      const newReactions = hasReacted 
        ? prev.userReactions.filter(r => r !== type)
        : [...prev.userReactions, type];
        
      return {
        ...prev,
        userReactions: newReactions,
        [`${type}Count`]: prev[`${type}Count` as keyof typeof prev] as number + (hasReacted ? -1 : 1)
      };
    });

    toggleReaction.mutate({
      id: listing.id,
      data: {
        reactionType: type,
        userId: user.id
      }
    }, {
      onError: () => {
        // revert on error
        setLocalReactions(prev => {
          const newReactions = hasReacted 
            ? [...prev.userReactions, type]
            : prev.userReactions.filter(r => r !== type);
            
          return {
            ...prev,
            userReactions: newReactions,
            [`${type}Count`]: prev[`${type}Count` as keyof typeof prev] as number + (hasReacted ? 1 : -1)
          };
        });
      }
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/listing/${listing.id}`);
    toast({ description: "Link copied to clipboard!" });
  };

  const reactions = [
    { type: 'fire' as const, emoji: '🔥', count: localReactions.fireCount },
    { type: 'gross' as const, emoji: '🤮', count: localReactions.grossCount },
    { type: 'wtf' as const, emoji: '💀', count: localReactions.wtfCount },
    { type: 'flex' as const, emoji: '💰', count: localReactions.flexCount },
    { type: 'gem' as const, emoji: '💎', count: localReactions.gemCount },
  ];

  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex gap-4">
        {reactions.map((r) => {
          const isActive = localReactions.userReactions.includes(r.type);
          return (
            <button
              key={r.type}
              onClick={(e) => handleReaction(e, r.type)}
              className="flex flex-col items-center gap-1 active:scale-125 transition-transform"
              data-testid={`btn-react-${r.type}`}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors",
                isActive ? "bg-surface" : "bg-transparent"
              )}>
                {r.emoji}
              </div>
              <span className={cn(
                "text-[10px] font-bold",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {r.count > 0 ? r.count : ''}
              </span>
            </button>
          );
        })}
      </div>
      
      <button 
        onClick={handleShare}
        className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-muted-foreground"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}