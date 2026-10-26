import { useState, useCallback } from "react";
import { invoke } from "@/lib/invoke";
import type { ConnectionConfig } from "@/lib/types";

export function useConnection() {
  const [connectedDb, setConnectedDb] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (config: ConnectionConfig) => {
    setIsConnecting(true);
    setError(null);
    try {
      await invoke.connectToDb(config);
      setConnectedDb(config.database);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await invoke.disconnect();
    setConnectedDb(null);
  }, []);

  return { connectedDb, isConnecting, error, connect, disconnect };
}
