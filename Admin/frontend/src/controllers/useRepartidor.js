// src/controllers/useRepartidor.js
import { useState, useEffect, useCallback, useRef } from "react";
import { repartidorService } from "../services/repartidorService";

// ── Mis pedidos activos (polling 20s) ─────────────────────────
export function useMisPedidos(intervaloMs = 20000) {
  const [pedidos,  setPedidos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [lastSync, setLastSync] = useState(null);
  const intervalRef = useRef(null);

  const fetch = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await repartidorService.getMisPedidos();
      setPedidos(data);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(false);
    intervalRef.current = setInterval(() => fetch(true), intervaloMs);
    return () => clearInterval(intervalRef.current);
  }, [fetch, intervaloMs]);

  return { pedidos, loading, error, lastSync, reload: () => fetch(false) };
}

// ── Mapa: puntos de entrega ────────────────────────────────────
export function useMapaRepartidor() {
  const [puntos,  setPuntos]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await repartidorService.getMapa();
      setPuntos(data);
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

  return { puntos, loading, reload: fetch };
}

// ── Historial ─────────────────────────────────────────────────
export function useHistorialRepartidor(params = {}) {
  const [historial, setHistorial] = useState({ data: [], total: 0, metricas: {} });
  const [loading,   setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repartidorService.getHistorial(params);
      setHistorial(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { historial, loading, reload: fetch };
}

// ── Gastos ────────────────────────────────────────────────────
export function useGastosRepartidor(mes) {
  const [data,    setData]    = useState({ gastos: [], tipos: [], resumen: {} });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await repartidorService.getGastos(mes ? { mes } : {});
      setData(result);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, reload: fetch };
}
