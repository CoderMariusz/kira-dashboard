"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Story {
  id: string;
  title: string;
  status: "idea" | "in_progress" | "done";
}

interface Epic {
  id: string;
  title: string;
  description?: string;
  stories: Story[];
}

interface EpicCardProps {
  epic: Epic;
  defaultExpanded?: boolean;
  onAddStory?: (epicId: string) => void;
}

export function EpicCard({ epic, defaultExpanded = true, onAddStory }: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const doneCount = epic.stories.filter((s) => s.status === "done").length;
  const totalCount = epic.stories.length;
  const progressPercentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const storyCountText = totalCount === 1 ? "1 story" : `${totalCount} stories`;

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
            <Badge variant="secondary">{storyCountText}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {onAddStory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddStory(epic.id)}
                className="min-h-[44px]"
              >
                Add Story
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
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
            value={progressPercentage}
            className="flex-1"
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: `${progressPercentage}%` }}
          />
          <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
            {progressPercentage}%
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
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm">{story.title}</span>
                      <StatusBadge status={story.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    idea: "bg-slate-500",
    in_progress: "bg-amber-500",
    done: "bg-green-500",
  };

  const statusLabels = {
    idea: "Idea",
    in_progress: "In Progress",
    done: "Done",
  };

  return (
    <div className="flex items-center gap-1">
      <span
        className={`w-2 h-2 rounded-full ${statusStyles[status as keyof typeof statusStyles] || "bg-slate-500"}`}
      />
      <span className="text-xs text-muted-foreground">
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    </div>
  );
}
