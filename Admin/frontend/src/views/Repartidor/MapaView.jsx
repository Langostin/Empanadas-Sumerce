// src/views/Repartidor/MapaView.jsx
import { useEffect, useRef, useState } from "react";
import {
  Box, Typography, Paper, Skeleton, Chip, Alert, alpha,
} from "@mui/material";
import MapIcon           from "@mui/icons-material/Map";
import LocationOnIcon    from "@mui/icons-material/LocationOnRounded";
import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import { useMapaRepartidor } from "../../controllers/useRepartidor";

// ── Estado → color del marcador ────────────────────────────────
const ESTADO_COLOR = {
  listo:     "#FED817",
  en_camino: "#023C81",
};

// ── Icono SVG del pin ──────────────────────────────────────────
const pinSVG = (color) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26S32 27 32 16C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="7" fill="#fff" opacity="0.9"/>
    </svg>
  `)}`;

export default function MapaView() {
  const { puntos, loading } = useMapaRepartidor();
  const mapRef     = useRef(null); // referencia al div del mapa
  const mapInstance = useRef(null); // instancia Leaflet
  const markersRef  = useRef([]);   // marcadores activos
  const deviceMarkerRef = useRef(null); // marcador de ubicación del dispositivo
  const [deviceLocation, setDeviceLocation] = useState({ lat: null, lng: null });
  const watchIdRef = useRef(null); // para detener el watch position

  // Obtener ubicación del dispositivo
  const startLocationTracking = () => {
    if (!navigator.geolocation) return;

    // Obtener posición inicial una sola vez
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDeviceLocation({ lat: latitude, lng: longitude });
        
        if (mapInstance.current) {
          // Centrar mapa en ubicación del dispositivo si no hay puntos
          if (puntos.length === 0) {
            mapInstance.current.setView([latitude, longitude], 15);
          }
          addDeviceMarker(latitude, longitude);
        }
      },
      (error) => {
        console.warn("Error al obtener ubicación:", error);
        // Usar ubicación por defecto si falla
        if (mapInstance.current && puntos.length === 0) {
          mapInstance.current.setView([19.4326, -99.1332], 13);
        }
      }
    );

    // Monitoreo continuo de ubicación (menos preciso pero más eficiente)
    if (navigator.geolocation.watchPosition) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDeviceLocation({ lat: latitude, lng: longitude });
          updateDeviceMarker(latitude, longitude);
        },
        (error) => {
          console.warn("Error en watchPosition:", error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    }
  };

  const addDeviceMarker = (lat, lng) => {
    import("leaflet").then((L) => {
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.remove();
      }

      // SVG simplificado sin espacios para evitar problemas de encoding
      const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#4A90E2" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff" opacity="0.8"/><circle cx="14" cy="14" r="2" fill="#4A90E2"/><circle cx="14" cy="14" r="16" fill="none" stroke="#4A90E2" stroke-width="1.5" opacity="0.3"/></svg>';
      const encoded = btoa(svgString);

      const deviceIcon = L.icon({
        iconUrl: `data:image/svg+xml;base64,${encoded}`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

deviceMarkerRef.current = L.marker([lat, lng], { icon: deviceIcon })        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="font-family:sans-serif;text-align:center;">
            <div style="font-weight:800;font-size:14px;color:#0D1B2E;margin-bottom:4px;">
              📍 Tu ubicación
            </div>
            <div style="font-size:11px;color:#4A5B72;">
              Lat: ${lat.toFixed(4)}<br/>
              Lng: ${lng.toFixed(4)}
            </div>
          </div>
        `, { maxWidth: 200 });
    });
  };

  const updateDeviceMarker = (lat, lng) => {
    if (deviceMarkerRef.current) {
      deviceMarkerRef.current.setLatLng([lat, lng]);
    }
  };

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (mapInstance.current) return; // ya inicializado

    // Importación dinámica para evitar errores de SSR
    import("leaflet").then((L) => {
      // Arreglo de ícono por defecto roto en webpack/vite
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current, {
        center: [19.4326, -99.1332], // Ciudad de México por defecto
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;

      // Iniciar tracking de ubicación después de que el mapa esté listo
      startLocationTracking();
    });

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Actualizar marcadores cuando cambian los puntos
  useEffect(() => {
    if (!mapInstance.current) return;

    import("leaflet").then((L) => {
      // Limpiar marcadores de pedidos anteriores
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = [];

      // Si hay ubicación del dispositivo, añadirla a los bounds
      if (deviceLocation.lat && deviceLocation.lng) {
        bounds.push([deviceLocation.lat, deviceLocation.lng]);
      }

      // Agregar todos los puntos de entrega
      puntos.forEach((p) => {
        const lat = parseFloat(p.latitud);
        const lng = parseFloat(p.longitud);
        if (!lat || !lng) return;

        const color = ESTADO_COLOR[p.estado_pedido] || "#4A5B72";

        const icon = L.icon({
          iconUrl:    pinSVG(color),
          iconSize:   [32, 42],
          iconAnchor: [16, 42],
          popupAnchor:[0, -42],
        });

        const popup = `
          <div style="font-family:sans-serif;min-width:200px;">
            <div style="font-weight:800;font-size:14px;color:#0D1B2E;margin-bottom:6px;">
              📦 ${p.folio}
            </div>
            <div style="font-size:12px;color:#4A5B72;margin-bottom:4px;">
              <strong>Cliente:</strong> ${p.cliente}
            </div>
            <div style="font-size:12px;color:#4A5B72;margin-bottom:4px;">
              <strong>Dirección:</strong> ${p.direccion_texto}
            </div>
            <div style="font-size:12px;color:#4A5B72;margin-bottom:4px;">
              <strong>Total:</strong> $${Number(p.total).toFixed(2)}
            </div>
            <span style="
              display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;
              background:${alpha_hex(color, 0.18)};color:${color};
            ">
              ${p.estado_pedido === "listo" ? "⏳ Listo" : "🛵 En camino"}
            </span>
          </div>
        `;

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current)
          .bindPopup(popup, { maxWidth: 280 });

        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      });

      // Ajustar vista para mostrar todos los marcadores y la ubicación del dispositivo
      if (bounds.length > 0) {
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      } else if (deviceLocation.lat && deviceLocation.lng) {
        // Si no hay puntos pero sí hay ubicación del dispositivo, mostrar solo esa
        mapInstance.current.setView([deviceLocation.lat, deviceLocation.lng], 15);
      }
    });
  }, [puntos, deviceLocation]);

  // Pequeña util para alpha en hex (para el popup HTML)
  function alpha_hex(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, height: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5,
              background: "linear-gradient(135deg, #0288D1, #01579B)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(2,136,209,0.3)",
            }}
          >
            <MapIcon sx={{ color: "#fff", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 20, color: "#0D1B2E", lineHeight: 1.2 }}>
              Mapa de Entregas
            </Typography>
            <Typography variant="caption" sx={{ color: "#4A5B72" }}>
              Tus puntos de entrega activos
            </Typography>
          </Box>
        </Box>

        {/* Leyenda */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            icon={<LocationOnIcon sx={{ fontSize: "14px !important", color: "#FED817 !important" }} />}
            label="Listo"
            size="small"
            sx={{ background: alpha("#FED817", 0.1), color: "#9A8400", fontWeight: 600, fontSize: 11 }}
          />
          <Chip
            icon={<LocalShippingIcon sx={{ fontSize: "14px !important", color: "#023C81 !important" }} />}
            label="En camino"
            size="small"
            sx={{ background: alpha("#023C81", 0.1), color: "#023C81", fontWeight: 600, fontSize: 11 }}
          />
        </Box>
      </Box>

      {/* Sin puntos */}
      {!loading && puntos.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          No hay puntos de entrega activos con coordenadas registradas.
        </Alert>
      )}

      {/* Contador */}
      {puntos.length > 0 && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            icon={<LocationOnIcon />}
            label={`${puntos.length} punto${puntos.length !== 1 ? "s" : ""} activo${puntos.length !== 1 ? "s" : ""}`}
            size="small"
            sx={{ background: alpha("#0288D1", 0.1), color: "#0288D1", fontWeight: 700 }}
          />
        </Box>
      )}

      {/* Mapa */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1.5px solid rgba(2,60,129,0.1)",
          boxShadow: "0 2px 20px rgba(2,60,129,0.06)",
          flex: 1,
          minHeight: 460,
          position: "relative",
        }}
      >
        {loading && (
          <Skeleton
            variant="rectangular"
            sx={{ position: "absolute", inset: 0, zIndex: 10, borderRadius: 4 }}
          />
        )}
        {/* Importar CSS de Leaflet */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <Box
          ref={mapRef}
          sx={{ width: "100%", height: "100%", minHeight: 460 }}
        />
      </Paper>
    </Box>
  );
}