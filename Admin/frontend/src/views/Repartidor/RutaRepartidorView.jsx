import { useEffect, useState } from "react";

export default function RutaRepartidorView() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    setPedidos([
      { id: 1, cliente: "Juan", direccion: "Col. Centro" },
      { id: 2, cliente: "Maria", direccion: "Col. Reforma" }
    ]);
  }, []);

  return (
    <div>
      <h1>🛵 Mis Entregas</h1>

      {pedidos.map(p => (
        <div key={p.id}>
          <h3>Pedido #{p.id}</h3>
          <p>{p.cliente}</p>
          <p>{p.direccion}</p>
        </div>
      ))}
    </div>
  );
}