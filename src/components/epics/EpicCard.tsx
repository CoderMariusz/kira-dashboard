"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateEpicProgress, getStatusConfig } from "@/lib/utils/epic-helpers";
import type { Epic, Story } from "@/types/epic-types";

interface EpicCardProps {
  epic: Epic;
  defaultExpanded?: boolean;
  onAddStory?: (epicId: string) => void;
}

export const EpicCard = memo(function EpicCard({ 
  epic, 
  defaultExpanded = true, 
  onAddStory 
}: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate progress statistics
  const progress = useMemo(
    () => calculateEpicProgress(epic.stories),
    [epic.stories]
  );

  // Toggle expansion
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle add story click
  const handleAddStoryClick = useCallback(() => {
    onAddStory?.(epic.id);
  }, [epic.id, onAddStory]);

  return (
    <Card
      role="region"
      aria-label={epic.title}
      data-testid={`epic-${epic.id}`}
      className="mb-4"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{epic.title}</h3>
            <Badge variant="secondary">{progress.storyCountText}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {onAddStory && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddStoryClick}
                className="min-h-[44px]"
              >
                Add Story
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpanded}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="min-h-[44px] min-w-[44px] p-2"
              tabIndex={0}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {epic.description && (
          <p className="text-sm text-muted-foreground">{epic.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Progress
            value={progress.progressPercentage}
            className="flex-1"
            role="progressbar"
            aria-valuenow={progress.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: `${progress.progressPercentage}%` }}
          />
          <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
            {progress.progressPercentage}%
          </span>
        </div>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent>
              {epic.stories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stories
                </p>
              ) : (
                <div className="space-y-2">
                  {epic.stories.map((story) => (
                    <StoryItem key={story.id} story={story} />
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});

/**
 * Story item component - memoized for performance
 */
const StoryItem = memo(function StoryItem({ story }: { story: Story }) {
  return (
    <div
      key={story.id}
      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
    >
      <span className="text-sm">{story.title}</span>
      <StatusBadge status={story.status} />
    </div>
  );
});

/**
 * Status badge component - memoized for performance
 */
const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const config = useMemo(() => getStatusConfig(status), [status]);

  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${config.bgClass}`} />
      <span className="text-xs text-muted-foreground">
        {config.label}
      </span>
    </div>
  );
});
