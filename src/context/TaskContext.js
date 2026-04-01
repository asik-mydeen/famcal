import { createContext, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { useFamilyController } from "./FamilyContext";

const TaskContext = createContext(null);
TaskContext.displayName = "TaskContext";

function TaskProvider({ children }) {
  const [state, dispatch] = useFamilyController();

  const value = useMemo(() => {
    const tasks = state.tasks || [];
    return {
      tasks,
      dispatch,
      pendingTasks: tasks.filter((t) => !t.completed),
      completedTasks: tasks.filter((t) => t.completed),
    };
  }, [state.tasks, dispatch]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

TaskProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}

export { TaskContext, TaskProvider, useTaskContext };
