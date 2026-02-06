"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Story {
  id: string;
  title: string;
  description?: string;
  status: "idea" | "in_progress" | "done";
}

interface StoryListProps {
  stories: Story[];
  filterStatus?: string;
  sortBy?: string;
  draggable?: boolean;
  onStoryClick?: (story: Story) => void;
  onDragStart?: (e: React.DragEvent, story: Story) => void;
  onDrop?: (e: React.DragEvent, story: Story) => void;
}

export function StoryList({
  stories,
  filterStatus,
  sortBy,
  draggable,
  onStoryClick,
  onDragStart,
  onDrop,
}: StoryListProps) {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Filter stories
  let filteredStories = stories;
  if (filterStatus) {
    filteredStories = stories.filter((s) => s.status === filterStatus);
  }

  // Sort stories
  if (sortBy === "status") {
    const statusOrder = { idea: 0, in_progress: 1, done: 2 };
    filteredStories = [...filteredStories].sort(
      (a, b) => statusOrder[a.status] - statusOrder[b.status]
    );
  }

  const handleStoryClick = (story: Story) => {
    if (onStoryClick) {
      onStoryClick(story);
    }
    setSelectedStory(story);
  };

  if (stories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stories
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {filteredStories.map((story) => (
          <motion.div
            key={story.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              role="article"
              aria-label={story.title}
              data-testid={`story-card-${story.id}`}
              tabIndex={0}
              className="cursor-pointer hover:shadow-md transition-shadow min-h-[44px]"
              draggable={draggable}
              onClick={() => handleStoryClick(story)}
              onDragStart={(e) => onDragStart?.(e as unknown as React.DragEvent, story)}
              onDrop={(e) => onDrop?.(e as unknown as React.DragEvent, story)}
              onDragOver={(e) => e.preventDefault()}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{story.title}</h4>
                  {story.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {story.description}
                    </p>
                  )}
                </div>
                <StatusIndicator storyId={story.id} status={story.status} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStory?.title}</DialogTitle>
            {selectedStory?.description && (
              <DialogDescription>{selectedStory.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <StatusIndicator storyId={selectedStory?.id || ""} status={selectedStory?.status || "idea"} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusIndicator({
  storyId,
  status,
}: {
  storyId: string;
  status: string;
}) {
  const statusColors = {
    idea: "#64748b",
    in_progress: "#f59e0b",
    done: "#22c55e",
  };

  const statusLabels = {
    idea: "Idea",
    in_progress: "In Progress",
    done: "Done",
  };

  const statusClasses = {
    idea: "status-idea",
    in_progress: "status-in-progress",
    done: "status-done",
  };

  return (
    <div
      data-testid={`status-indicator-${storyId}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusClasses[status as keyof typeof statusClasses] || ""}`}
      aria-label={`Status: ${statusLabels[status as keyof typeof statusLabels] || status}`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: statusColors[status as keyof typeof statusColors] || "#64748b" }}
      />
      <span className="text-xs font-medium capitalize">
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    </div>
  );
}
