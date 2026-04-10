// src/controllers/useClientes.js
import { useState, useEffect, useCallback } from "react";
import { clientesService } from "../services/api";

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await clientesService.getAll({ search, page: page + 1, limit: PAGE_SIZE });
      setClientes(r.data);
      setTotal(r.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const toggleActivo = async (wa, activo) => {
    await clientesService.patchEstado(wa, { activo });
    load();
  };

  const toggleBloqueoSordo = async (wa, bloqueo_sordo) => {
    await clientesService.patchEstado(wa, { bloqueo_sordo });
    load();
  };

  const toggleBloqueoIA = async (wa, bloqueo_ia) => {
    await clientesService.patchEstado(wa, { bloqueo_ia });
    load();
  };

  return {
    clientes, total, loading, error,
    search, setSearch,
    page, setPage, PAGE_SIZE,
    toggleActivo, toggleBloqueoSordo, toggleBloqueoIA,
    reload: load,
  };
}

export function useClienteMetricas(whatsapp) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!whatsapp) return;
    setLoading(true);
    clientesService.getMetricas(whatsapp)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [whatsapp]);

  return { data, loading, error };
}