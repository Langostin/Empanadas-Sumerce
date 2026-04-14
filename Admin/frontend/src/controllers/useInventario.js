// src/controllers/useInventario.js
import { useState, useEffect, useCallback } from "react";
import { inventarioService } from "../services/inventarioService";

// ── Insumos ───────────────────────────────────────────────────
export function useInsumos() {
  const [data,    setData]    = useState({ insumos: [], resumen: null });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await inventarioService.getInsumos({ search })); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const create = async (body) => { await inventarioService.createInsumo(body);     load(); };
  const update = async (id, body) => { await inventarioService.updateInsumo(id, body); load(); };

  return { ...data, loading, error, search, setSearch, create, update, reload: load };
}

// ── Stock crítico ─────────────────────────────────────────────
export function useStockCritico() {
  const [criticos, setCriticos] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCriticos(await inventarioService.getStockCritico()); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { criticos, loading, reload: load };
}

// ── Gastos generales ──────────────────────────────────────────
export function useGastos(filtroInicial = {}) {
  const [data,    setData]    = useState({ gastos: [], porTipo: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filtros, setFiltros] = useState(filtroInicial);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await inventarioService.getGastos(filtros)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { load(); }, [load]);

  const create = async (body) => { await inventarioService.createGasto(body); load(); };
  const remove = async (id)   => { await inventarioService.deleteGasto(id);   load(); };

  return { ...data, loading, error, filtros, setFiltros, create, remove, reload: load };
}

// ── Gasolina ──────────────────────────────────────────────────
export function useGasolina(filtroInicial = {}) {
  const [data,    setData]    = useState({ gastos: [], porRepartidor: [] });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState(filtroInicial);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await inventarioService.getGasolina(filtros)); }
    catch {}
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { load(); }, [load]);
  return { ...data, loading, filtros, setFiltros, reload: load };
}

// ── Corte diario ──────────────────────────────────────────────
export function useCorteDiario() {
  const [corte,     setCorte]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [ejecutando,setEjecutando]= useState(false);
  const [mensaje,   setMensaje]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCorte(await inventarioService.getCorteDiario()); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ejecutar = async (observaciones) => {
    setEjecutando(true);
    setMensaje(null);
    try {
      await inventarioService.ejecutarCorte({ observaciones });
      setMensaje({ tipo: "success", texto: "Corte diario realizado correctamente." });
      load();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e.response?.data?.error || e.message });
    } finally { setEjecutando(false); }
  };

  return { corte, loading, ejecutando, mensaje, setMensaje, ejecutar, reload: load };
}

// ── Histórico de cortes ───────────────────────────────────────
export function useHistoricoCortes() {
  const [data,    setData]    = useState({ cortes: [], acumulado: null, mensual: [] });
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ anio: new Date().getFullYear() });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await inventarioService.getHistoricoCortes(filtros)); }
    catch {}
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { load(); }, [load]);
  return { ...data, loading, filtros, setFiltros, reload: load };
}