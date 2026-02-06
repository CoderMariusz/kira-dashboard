"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { LayoutGrid, List, Plus, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EpicCard } from "./EpicCard";
import { StoryList } from "./StoryList";
import { CreateEpicModal } from "./CreateEpicModal";
import { AddStoryModal } from "./AddStoryModal";
import type { Epic, StandaloneTask, CreateEpicInput, AddStoryInput, Viewport } from "@/types/epic-types";

interface EpicBoardProps {
  epics: Epic[];
  standaloneTasks?: StandaloneTask[];
  groupByEpic?: boolean;
  showStandaloneInFlat?: boolean;
  viewport?: Viewport;
  isLoading?: boolean;
  onToggleGroup?: (groupByEpic: boolean) => void;
  onCreateEpic?: (epic: CreateEpicInput) => void;
  onAddStory?: (story: AddStoryInput) => void;
}

export const EpicBoard = memo(function EpicBoard({
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

  // Prepare epic summaries for the dropdown
  const epicSummaries = useMemo(
    () => epics.map((e) => ({ 
      id: e.id, 
      title: e.title, 
      description: e.description || "" 
    })),
    [epics]
  );

  // Handle add story click
  const handleAddStory = useCallback((epicId: string) => {
    setSelectedEpicId(epicId);
    setIsAddStoryModalOpen(true);
  }, []);

  // Handle create epic
  const handleCreateEpic = useCallback((epic: CreateEpicInput) => {
    onCreateEpic?.(epic);
    setIsCreateModalOpen(false);
  }, [onCreateEpic]);

  // Handle add story submit
  const handleAddStorySubmit = useCallback((story: AddStoryInput) => {
    onAddStory?.(story);
    setIsAddStoryModalOpen(false);
    setSelectedEpicId(null);
  }, [onAddStory]);

  // Handle toggle group view
  const handleToggleGroup = useCallback(() => {
    onToggleGroup?.(!groupByEpic);
  }, [groupByEpic, onToggleGroup]);

  // Render loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Render empty state
  if (epics.length === 0) {
    return (
      <EmptyState
        isCreateModalOpen={isCreateModalOpen}
        onCreateEpic={handleCreateEpic}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onCloseCreateModal={() => setIsCreateModalOpen(false)}
      />
    );
  }

  return (
    <div className={`p-4 ${isMobile ? "mobile-accordion" : ""}`} data-testid="epic-board">
      {/* Header with toggle and actions */}
      <BoardHeader
        groupByEpic={groupByEpic}
        onToggleGroup={handleToggleGroup}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenAddStoryModal={() => setIsAddStoryModalOpen(true)}
      />

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Epic Sidebar - Desktop only */}
        {!isMobile && (
          <EpicSidebar epics={epics} />
        )}

        {/* Main Area */}
        <main className="flex-1">
          {groupByEpic ? (
            <GroupedView
              epics={epics}
              standaloneTasks={standaloneTasks}
              onAddStory={handleAddStory}
            />
          ) : (
            <FlatView
              epics={epics}
              standaloneTasks={standaloneTasks}
              showStandaloneInFlat={showStandaloneInFlat}
            />
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
        epics={epicSummaries}
        defaultEpicId={selectedEpicId || undefined}
      />
    </div>
  );
});

/**
 * Loading state component
 */
const LoadingState = memo(function LoadingState() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
});

/**
 * Empty state component
 */
interface EmptyStateProps {
  isCreateModalOpen: boolean;
  onCreateEpic: (epic: CreateEpicInput) => void;
  onOpenCreateModal: () => void;
  onCloseCreateModal: () => void;
}

const EmptyState = memo(function EmptyState({
  isCreateModalOpen,
  onCreateEpic,
  onOpenCreateModal,
  onCloseCreateModal,
}: EmptyStateProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Epics</h2>
        <Button onClick={onOpenCreateModal} className="min-h-[44px]">
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
        onClose={onCloseCreateModal}
        onCreateEpic={onCreateEpic}
      />
    </div>
  );
});

/**
 * Board header component
 */
interface BoardHeaderProps {
  groupByEpic: boolean;
  onToggleGroup: () => void;
  onOpenCreateModal: () => void;
  onOpenAddStoryModal: () => void;
}

const BoardHeader = memo(function BoardHeader({
  groupByEpic,
  onToggleGroup,
  onOpenCreateModal,
  onOpenAddStoryModal,
}: BoardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h2 className="text-2xl font-bold">Epics</h2>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleGroup}
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
            onClick={onOpenAddStoryModal}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Story
          </Button>
        )}
        <Button
          onClick={onOpenCreateModal}
          className="min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Epic
        </Button>
      </div>
    </div>
  );
});

/**
 * Epic sidebar component - desktop only
 */
interface EpicSidebarProps {
  epics: Epic[];
}

const EpicSidebar = memo(function EpicSidebar({ epics }: EpicSidebarProps) {
  return (
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
  );
});

/**
 * Grouped view - epics with their stories
 */
interface GroupedViewProps {
  epics: Epic[];
  standaloneTasks: StandaloneTask[];
  onAddStory: (epicId: string) => void;
}

const GroupedView = memo(function GroupedView({
  epics,
  standaloneTasks,
  onAddStory,
}: GroupedViewProps) {
  return (
    <div className="space-y-6">
      {epics.map((epic) => (
        <EpicCard
          key={epic.id}
          epic={epic}
          onAddStory={onAddStory}
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
  );
});

/**
 * Flat view - all stories in sections
 */
interface FlatViewProps {
  epics: Epic[];
  standaloneTasks: StandaloneTask[];
  showStandaloneInFlat: boolean;
}

const FlatView = memo(function FlatView({
  epics,
  standaloneTasks,
  showStandaloneInFlat,
}: FlatViewProps) {
  return (
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
  );
});
