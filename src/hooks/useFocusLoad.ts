import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";

// Loads a screen's data each time it comes into view (so it's fresh after
// going back from another screen) and on pull-to-refresh. Keeps the last
// data while reloading, so the screen doesn't flash empty.
export function useFocusLoad<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setData(await loadRef.current());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run(false);
    }, [run]),
  );

  const refresh = useCallback(() => run(true), [run]);
  return { data, setData, loading, refreshing, error, refresh };
}
