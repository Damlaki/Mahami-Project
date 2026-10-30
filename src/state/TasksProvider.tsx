/**
 * App-wide task state. Same idea as the original web app — change the list,
 * save it, re-render — but with a reducer (predictable updates) and a repository
 * (storage can be swapped for a database later).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { applyTaskInput, createTask, toggleTaskDone } from "@/domain/task";
import type { Task, TaskInput } from "@/domain/task";
import { localTaskRepository } from "@/data/repositories";
import type { TaskRepository } from "@/data/repositories";

type Status = "loading" | "ready" | "error";

interface State {
  status: Status;
  tasks: Task[];
  saveFailed: boolean;
  /** bumps on every user change, so hydration alone never triggers a save */
  revision: number;
}

type Action =
  | { type: "loadStart" }
  | { type: "loaded"; tasks: Task[] }
  | { type: "loadFailed" }
  | { type: "add"; task: Task }
  | { type: "update"; id: string; input: TaskInput; now: Date }
  | { type: "toggle"; id: string; now: Date }
  | { type: "remove"; id: string }
  | { type: "restore"; task: Task; index: number }
  | { type: "addMany"; tasks: Task[] }
  | { type: "saveResult"; ok: boolean };

function reducer(state: State, action: Action): State {
  const changed = (tasks: Task[]): State => ({ ...state, tasks, revision: state.revision + 1 });
  switch (action.type) {
    case "loadStart":
      return { ...state, status: "loading" };
    case "loaded":
      return { ...state, status: "ready", tasks: action.tasks };
    case "loadFailed":
      return { ...state, status: "error" };
    case "add":
      return changed([...state.tasks, action.task]);
    case "update":
      return changed(
        state.tasks.map((t) => (t.id === action.id ? applyTaskInput(t, action.input, action.now) : t)),
      );
    case "toggle":
      return changed(state.tasks.map((t) => (t.id === action.id ? toggleTaskDone(t, action.now) : t)));
    case "remove":
      return changed(state.tasks.filter((t) => t.id !== action.id));
    case "restore": {
      if (state.tasks.some((t) => t.id === action.task.id)) return state;
      const tasks = [...state.tasks];
      tasks.splice(Math.min(action.index, tasks.length), 0, action.task);
      return changed(tasks);
    }
    case "addMany":
      return changed([...state.tasks, ...action.tasks]);
    case "saveResult":
      return { ...state, saveFailed: !action.ok };
  }
}

export interface RemovedTask {
  task: Task;
  index: number;
}

interface TasksContextValue {
  status: Status;
  tasks: Task[];
  saveFailed: boolean;
  reload: () => void;
  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, input: TaskInput) => void;
  toggleDone: (id: string) => void;
  /** Returns what's needed to undo the deletion. */
  removeTask: (id: string) => RemovedTask | null;
  restoreTask: (removed: RemovedTask) => void;
  addMany: (tasks: Task[]) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({
  children,
  repository = localTaskRepository,
}: {
  children: ReactNode;
  repository?: TaskRepository;
}) {
  const [state, dispatch] = useReducer(reducer, {
    status: "loading",
    tasks: [],
    saveFailed: false,
    revision: 0,
  });

  const tasksRef = useRef(state.tasks);
  tasksRef.current = state.tasks;

  const load = useCallback(() => {
    dispatch({ type: "loadStart" });
    repository
      .load()
      .then((tasks) => dispatch({ type: "loaded", tasks }))
      .catch((error: unknown) => {
        console.warn("Failed to load tasks", error);
        dispatch({ type: "loadFailed" });
      });
  }, [repository]);

  useEffect(load, [load]);

  // Persist after every user change (never right after loading).
  useEffect(() => {
    if (state.revision === 0 || state.status !== "ready") return;
    repository
      .save(state.tasks)
      .then(() => dispatch({ type: "saveResult", ok: true }))
      .catch((error: unknown) => {
        console.warn("Failed to save tasks", error);
        dispatch({ type: "saveResult", ok: false });
      });
  }, [state.revision, state.status, state.tasks, repository]);

  const addTask = useCallback((input: TaskInput) => {
    const task = createTask(input);
    dispatch({ type: "add", task });
    return task;
  }, []);

  // The reducer applies these to the latest state, so rapid taps never use stale data.
  const updateTask = useCallback((id: string, input: TaskInput) => {
    dispatch({ type: "update", id, input, now: new Date() });
  }, []);

  const toggleDone = useCallback((id: string) => {
    dispatch({ type: "toggle", id, now: new Date() });
  }, []);

  const removeTask = useCallback((id: string) => {
    const index = tasksRef.current.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const task = tasksRef.current[index];
    dispatch({ type: "remove", id });
    return { task, index };
  }, []);

  const restoreTask = useCallback((removed: RemovedTask) => {
    dispatch({ type: "restore", task: removed.task, index: removed.index });
  }, []);

  const addMany = useCallback((tasks: Task[]) => {
    if (tasks.length) dispatch({ type: "addMany", tasks });
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({
      status: state.status,
      tasks: state.tasks,
      saveFailed: state.saveFailed,
      reload: load,
      addTask,
      updateTask,
      toggleDone,
      removeTask,
      restoreTask,
      addMany,
    }),
    [state.status, state.tasks, state.saveFailed, load, addTask, updateTask, toggleDone, removeTask, restoreTask, addMany],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider>");
  return ctx;
}
