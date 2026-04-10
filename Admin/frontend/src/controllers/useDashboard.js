// src/controllers/useDashboard.js
import { useState, useEffect, useCallback } from "react";
import { dashboardService } from "../services/api";

export function useDashboard() {
  const [metricas,      setMetricas]      = useState(null);
  const [estadosPedido, setEstadosPedido] = useState([]);
  const [hoy,           setHoy]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, e, h] = await Promise.all([
        dashboardService.getMetricas(),
        dashboardService.getEstadosPedido(),
        dashboardService.getHoy(),
      ]);
      setMetricas(m);
      setEstadosPedido(e);
      setHoy(h);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { metricas, estadosPedido, hoy, loading, error, reload: load };
}