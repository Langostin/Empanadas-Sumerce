// src/controllers/useEmpleados.js
import { useState, useEffect, useCallback } from "react";
import { empleadosService } from "../services/api";

export function useEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emp, rol] = await Promise.all([
        empleadosService.getAll({ search }),
        empleadosService.getRoles(),
      ]);
      setEmpleados(emp);
      setRoles(rol);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const create = async (data) => { await empleadosService.create(data); load();};
  const update = async (id, data) => { await empleadosService.update(id, data); load(); };
  const remove = async (id) => { await empleadosService.delete(id); load(); };

  return { empleados, roles, loading, error, search, setSearch, create, update, remove, reload: load };
}

export function useEmpleadoMetricas(id) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    empleadosService.getMetricas(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading };
}