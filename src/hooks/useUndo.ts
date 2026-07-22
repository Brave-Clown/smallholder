import { useState, useCallback, useRef } from "react";

interface UndoAction {
  label: string;
  undo: () => void;
}

export function useUndo() {
  const [stack, setStack] = useState<UndoAction[]>([]);
  // The stack is mirrored in a ref so undo() can read the current top without
  // taking `stack` as a dependency: the Ctrl+Z listener registers once and
  // would otherwise close over a stale, empty stack forever.
  const stackRef = useRef<UndoAction[]>([]);

  const pushUndo = useCallback((action: UndoAction) => {
    stackRef.current = [...stackRef.current.slice(-19), action]; // keep max 20
    setStack(stackRef.current);
  }, []);

  const undo = useCallback(() => {
    const current = stackRef.current;
    if (current.length === 0) return;
    const last = current[current.length - 1];
    stackRef.current = current.slice(0, -1);
    setStack(stackRef.current);
    // Run the action outside the state updater. React calls updaters during the
    // render phase, so a store write in there updates other components mid-render.
    last.undo();
  }, []);

  const canUndo = stack.length > 0;
  const lastLabel = stack.length > 0 ? stack[stack.length - 1].label : "";

  return { pushUndo, undo, canUndo, lastLabel };
}
