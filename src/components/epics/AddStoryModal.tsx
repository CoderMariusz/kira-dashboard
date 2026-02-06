"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Epic {
  id: string;
  title: string;
  description: string;
}

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStory: (story: {
    title: string;
    acceptanceCriteria: string[];
    epicId: string;
  }) => void;
  epics: Epic[];
  defaultEpicId?: string;
}

export function AddStoryModal({
  isOpen,
  onClose,
  onAddStory,
  epics,
  defaultEpicId,
}: AddStoryModalProps) {
  const [title, setTitle] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [selectedEpicId, setSelectedEpicId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setAcceptanceCriteria("");
      setSelectedEpicId(defaultEpicId || "");
      setError(null);
      setIsSubmitting(false);
      // Focus title input after a short delay
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultEpicId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!selectedEpicId) {
      setError("Please select an epic");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Parse acceptance criteria by newlines
    const criteriaArray = acceptanceCriteria
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      await onAddStory({
        title: title.trim(),
        acceptanceCriteria: criteriaArray,
        epicId: selectedEpicId,
      });
      onClose();
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleEpicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEpicId(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isEpicDropdownDisabled = epics.length <= 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            data-testid="modal-backdrop"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-4"
          >
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
              <DialogContent
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-story-title"
                data-testid="modal-content"
                className="bg-background border shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <DialogHeader>
                  <DialogTitle id="add-story-title">Add Story</DialogTitle>
                  <DialogDescription>
                    Add a new story to an epic.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <Label htmlFor="story-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="story-title"
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Enter story title"
                      disabled={isSubmitting}
                      className="min-h-[44px]"
                      aria-invalid={!!error}
                      aria-describedby={error ? "story-error" : undefined}
                    />
                  </div>

                  {/* Epic Selection - Native Select */}
                  <div className="space-y-2">
                    <Label htmlFor="story-epic">
                      Epic <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="story-epic"
                      value={selectedEpicId}
                      onChange={handleEpicChange}
                      disabled={isSubmitting || isEpicDropdownDisabled}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                      aria-label="Epic"
                    >
                      <option value="">Select an epic</option>
                      {epics.map((epic) => (
                        <option key={epic.id} value={epic.id}>
                          {epic.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Acceptance Criteria Field */}
                  <div className="space-y-2">
                    <Label htmlFor="acceptance-criteria">
                      Acceptance Criteria
                    </Label>
                    <Textarea
                      id="acceptance-criteria"
                      value={acceptanceCriteria}
                      onChange={(e) => setAcceptanceCriteria(e.target.value)}
                      placeholder="Enter acceptance criteria (one per line)"
                      disabled={isSubmitting}
                      rows={5}
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter each criterion on a new line
                    </p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <p id="story-error" className="text-sm text-red-500">
                      {error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[44px] min-w-[100px]"
                    >
                      {isSubmitting ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
