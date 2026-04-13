import { useState } from "react";

export default function GastosView() {
  const [gasto, setGasto] = useState("");

  const guardar = () => {
    alert("Gasto registrado: $" + gasto);
  };

  return (
    <div>
      <h1>⛽ Gastos de Ruta</h1>

      <input
        type="number"
        placeholder="Monto"
        value={gasto}
        onChange={(e) => setGasto(e.target.value)}
      />

      <button onClick={guardar}>
        Guardar
      </button>
    </div>
  );
}