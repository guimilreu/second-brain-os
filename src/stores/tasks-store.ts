"use client";

import { startOfWeek } from "date-fns";
import { create } from "zustand";

type TaskStatusFilter = "all" | "todo" | "doing" | "done" | "blocked";

type TasksStore = {
  selectedWeekStart: string;
  statusFilter: TaskStatusFilter;
  selectedProjectId: string | null;
  setSelectedWeekStart: (weekStart: string) => void;
  setStatusFilter: (statusFilter: TaskStatusFilter) => void;
  setSelectedProjectId: (projectId: string | null) => void;
};

export const useTasksStore = create<TasksStore>((set) => ({
  selectedWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
  statusFilter: "all",
  selectedProjectId: null,
  setSelectedWeekStart: (selectedWeekStart) => set({ selectedWeekStart }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
}));
