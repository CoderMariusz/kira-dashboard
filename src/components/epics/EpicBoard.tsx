"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Plus, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EpicCard } from "./EpicCard";
import { StoryList } from "./StoryList";
import { CreateEpicModal } from "./CreateEpicModal";
import { AddStoryModal } from "./AddStoryModal";

interface Story {
  id: string;
  title: string;
  description?: string;
  status: "idea" | "in_progress" | "done";
}

interface Epic {
  id: string;
  title: string;
  description?: string;
  stories: Story[];
}

interface StandaloneTask {
  id: string;
  title: string;
  status: "idea" | "in_progress" | "done";
  epicId: null;
}

interface EpicBoardProps {
  epics: Epic[];
  standaloneTasks?: StandaloneTask[];
  groupByEpic?: boolean;
  showStandaloneInFlat?: boolean;
  viewport?: "desktop" | "mobile";
  isLoading?: boolean;
  onToggleGroup?: (groupByEpic: boolean) => void;
  onCreateEpic?: (epic: { title: string; description: string }) => void;
  onAddStory?: (story: {
    title: string;
    acceptanceCriteria: string[];
    epicId: string;
  }) => void;
}

export function EpicBoard({
  epics,
  standaloneTasks = [],
  groupByEpic = true,
  showStandaloneInFlat = true,
  viewport = "desktop",
  isLoading = false,
  onToggleGroup,
  onCreateEpic,
  onAddStory,
}: EpicBoardProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);

  const isMobile = viewport === "mobile";

  const handleAddStory = (epicId: string) => {
    setSelectedEpicId(epicId);
    setIsAddStoryModalOpen(true);
  };

  const handleCreateEpic = (epic: { title: string; description: string }) => {
    onCreateEpic?.(epic);
    setIsCreateModalOpen(false);
  };

  const handleAddStorySubmit = (story: {
    title: string;
    acceptanceCriteria: string[];
    epicId: string;
  }) => {
    onAddStory?.(story);
    setIsAddStoryModalOpen(false);
    setSelectedEpicId(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" role="status" aria-label="Loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Epics</h2>
          <Button onClick={() => setIsCreateModalOpen(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            New Epic
          </Button>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No epics yet. Create your first epic to get started!
          </p>
        </Card>
        <CreateEpicModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateEpic={handleCreateEpic}
        />
      </div>
    );
  }

  return (
    <div className={`p-4 ${isMobile ? "mobile-accordion" : ""}`} data-testid="epic-board">
      {/* Header with toggle and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Epics</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleGroup?.(!groupByEpic)}
            className="min-h-[44px]"
            aria-label={groupByEpic ? "Flat View" : "Group by Epic"}
          >
            {groupByEpic ? (
              <>
                <List className="h-4 w-4 mr-2" />
                Flat View
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Group by Epic
              </>
            )}
          </Button>
          {!groupByEpic && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddStoryModalOpen(true)}
              className="min-h-[44px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Story
            </Button>
          )}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Epic
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Epic Sidebar - Desktop only */}
        {!isMobile && (
          <aside
            data-testid="epic-sidebar"
            className="w-64 flex-shrink-0 desktop-sidebar hidden lg:block"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Epics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {epics.map((epic) => (
                  <div
                    key={epic.id}
                    className="p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium truncate sidebar-epic-title">{epic.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {epic.stories.length} {epic.stories.length === 1 ? "story" : "stories"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Main Area */}
        <main className="flex-1">
          {groupByEpic ? (
            <div className="space-y-6">
              {epics.map((epic) => (
                <EpicCard
                  key={epic.id}
                  epic={epic}
                  onAddStory={handleAddStory}
                />
              ))}

              {/* Standalone Tasks Section */}
              {standaloneTasks.length > 0 && (
                <Card data-testid="standalone-section">
                  <CardHeader>
                    <CardTitle className="text-lg">Standalone Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StoryList stories={standaloneTasks} />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Flat View - All Stories */}
              {epics.map((epic) => (
                <div key={epic.id} data-testid={`flat-epic-${epic.id}`}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 epic-section-title">
                    <Grid3X3 className="h-4 w-4" />
                    {epic.title}
                  </h3>
                  <StoryList stories={epic.stories} />
                </div>
              ))}

              {/* Standalone Tasks in Flat View */}
              {showStandaloneInFlat && standaloneTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Standalone Tasks</h3>
                  <StoryList stories={standaloneTasks} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateEpicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateEpic={handleCreateEpic}
      />

      <AddStoryModal
        isOpen={isAddStoryModalOpen}
        onClose={() => {
          setIsAddStoryModalOpen(false);
          setSelectedEpicId(null);
        }}
        onAddStory={handleAddStorySubmit}
        epics={epics.map((e) => ({ id: e.id, title: e.title, description: e.description || "" }))}
        defaultEpicId={selectedEpicId || undefined}
      />
    </div>
  );
}
