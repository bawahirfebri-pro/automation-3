import { useEffect, useRef, useState } from "react";

export type SaveFeedbackStatus = "idle" | "success" | "error";

export function useSaveFeedback() {
  const [saveFeedback, setSaveFeedback] = useState<Record<string, SaveFeedbackStatus>>({});
  const timersRef = useRef<Record<string, number>>({});

  const setTemporarySaveFeedback = (studentId: string, status: SaveFeedbackStatus) => {
    const currentTimer = timersRef.current[studentId];
    if (currentTimer) window.clearTimeout(currentTimer);
    setSaveFeedback((previous) => ({ ...previous, [studentId]: status }));
    timersRef.current[studentId] = window.setTimeout(() => {
      setSaveFeedback((previous) => ({ ...previous, [studentId]: "idle" }));
      delete timersRef.current[studentId];
    }, 2000);
  };

  useEffect(() => {
    const timers = timersRef.current;
    return () => { Object.values(timers).forEach((timer) => window.clearTimeout(timer)); };
  }, []);

  return { saveFeedback, setTemporarySaveFeedback };
}