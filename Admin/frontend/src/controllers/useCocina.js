// src/controllers/useCocina.js
import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { cocinaService } from "../services/cocinaService";

// ── Hook principal: cola de pedidos con polling automático ─────
export function useColaCocina(intervaloMs = 15000) {
  const [cola,     setCola]     = useState({ pedidos: [], resumen: {} });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [lastSync, setLastSync] = useState(null);
  const intervalRef = useRef(null);

  const fetchCola = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await cocinaService.getCola();
      setCola(data);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  // Carga inicial + polling automático + WebSockets
  useEffect(() => {
    fetchCola(false);
    
    // WebSockets listener
    const socket = io("/", { path: "/socket.io" });
    
    socket.on("pedido_nuevo", (data) => {
      console.log("🔥 Nuevo pedido recibido via Socket:", data);
      fetchCola(false);
    });

    intervalRef.current = setInterval(() => fetchCola(true), intervaloMs);
    
    return () => {
      socket.disconnect();
      clearInterval(intervalRef.current);
    };
  }, [fetchCola, intervaloMs]);

  return { cola, loading, error, lastSync, reload: () => fetchCola(false) };
}

// ── Hook: métricas del día ─────────────────────────────────────
export function useMetricasCocina() {
  const [metricas, setMetricas] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await cocinaService.getMetricasHoy();
      setMetricas(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [fetch]);

  return { metricas, loading, reload: fetch };
}

// ── Hook: insumos críticos ────────────────────────────────────
export function useInsumosCriticosCocina() {
  const [insumos,  setInsumos]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    cocinaService
      .getInsumosCriticos()
      .then(setInsumos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { insumos, loading };
}

// ── Hook: historial del día ────────────────────────────────────
export function useHistorialCocina() {
  const [historial, setHistorial] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await cocinaService.getHistorialHoy();
      setHistorial(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 20000);
    return () => clearInterval(t);
  }, [fetch]);

  return { historial, loading, reload: fetch };
}

// ── Hook: acción sobre un pedido ──────────────────────────────
export function useAccionPedido(onSuccess) {
  const [procesando, setProcesando] = useState({}); // { [pedidoId]: true }
  const [error,      setError]      = useState("");

  const ejecutar = useCallback(
    async (pedidoId, accion, observaciones = null) => {
      setProcesando((p) => ({ ...p, [pedidoId]: true }));
      setError("");
      try {
        await cocinaService.cambiarEstado(pedidoId, accion, observaciones);
        onSuccess?.();
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setProcesando((p) => ({ ...p, [pedidoId]: false }));
      }
    },
    [onSuccess]
  );

  return { ejecutar, procesando, error, setError };
}