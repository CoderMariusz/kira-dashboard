"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getStatusConfig, sortStoriesByStatus } from "@/lib/utils/epic-helpers";
import type { Story } from "@/types/epic-types";

interface StoryListProps {
  stories: Story[];
  filterStatus?: string;
  sortBy?: string;
  draggable?: boolean;
  onStoryClick?: (story: Story) => void;
  onDragStart?: (e: React.DragEvent, story: Story) => void;
  onDrop?: (e: React.DragEvent, story: Story) => void;
}

export const StoryList = memo(function StoryList({
  stories,
  filterStatus,
  sortBy,
  draggable,
  onStoryClick,
  onDragStart,
  onDrop,
}: StoryListProps) {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Filter and sort stories
  const processedStories = useMemo(() => {
    let filtered = stories;
    
    // Apply filter
    if (filterStatus) {
      filtered = stories.filter((s) => s.status === filterStatus);
    }
    
    // Apply sort
    if (sortBy === "status") {
      filtered = sortStoriesByStatus(filtered);
    }
    
    return filtered;
  }, [stories, filterStatus, sortBy]);

  // Handle story click
  const handleStoryClick = useCallback(
    (story: Story) => {
      if (onStoryClick) {
        onStoryClick(story);
      }
      setSelectedStory(story);
    },
    [onStoryClick]
  );

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setSelectedStory(null);
  }, []);

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
        {processedStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            draggable={draggable}
            onClick={handleStoryClick}
            onDragStart={onDragStart}
            onDrop={onDrop}
          />
        ))}
      </div>

      <StoryDetailDialog
        story={selectedStory}
        isOpen={!!selectedStory}
        onClose={handleCloseModal}
      />
    </>
  );
});

/**
 * Individual story card - memoized for performance
 */
interface StoryCardProps {
  story: Story;
  draggable?: boolean;
  onClick: (story: Story) => void;
  onDragStart?: (e: React.DragEvent, story: Story) => void;
  onDrop?: (e: React.DragEvent, story: Story) => void;
}

const StoryCard = memo(function StoryCard({
  story,
  draggable,
  onClick,
  onDragStart,
  onDrop,
}: StoryCardProps) {
  const handleClick = useCallback(() => {
    onClick(story);
  }, [story, onClick]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      onDragStart?.(e, story);
    },
    [story, onDragStart]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      onDrop?.(e, story);
    },
    [story, onDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <motion.div
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
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
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
  );
});

/**
 * Status indicator - memoized for performance
 */
interface StatusIndicatorProps {
  storyId: string;
  status: string;
}

const StatusIndicator = memo(function StatusIndicator({
  storyId,
  status,
}: StatusIndicatorProps) {
  const config = useMemo(() => getStatusConfig(status), [status]);

  return (
    <div
      data-testid={`status-indicator-${storyId}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.class}`}
      aria-label={`Status: ${config.label}`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-xs font-medium capitalize">
        {config.label}
      </span>
    </div>
  );
});

/**
 * Story detail dialog - memoized for performance
 */
interface StoryDetailDialogProps {
  story: Story | null;
  isOpen: boolean;
  onClose: () => void;
}

const StoryDetailDialog = memo(function StoryDetailDialog({
  story,
  isOpen,
  onClose,
}: StoryDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{story?.title}</DialogTitle>
          {story?.description && (
            <DialogDescription>{story.description}</DialogDescription>
          )}
        </DialogHeader>
        {story && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <StatusIndicator storyId={story.id} status={story.status} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});
