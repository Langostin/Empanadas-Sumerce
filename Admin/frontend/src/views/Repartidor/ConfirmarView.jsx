import { useState } from "react";

export default function ConfirmarView() {
  const [codigo, setCodigo] = useState("");

  const confirmar = () => {
    alert("Entrega confirmada: " + codigo);
  };

  return (
    <div>
      <h1>✅ Confirmar Entrega</h1>

      <input
        placeholder="Código del cliente"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />

      <button onClick={confirmar}>
        Confirmar
      </button>
    </div>
  );
}