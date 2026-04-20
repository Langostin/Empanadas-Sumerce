// src/views/Vendedor/EntregasView.jsx
import { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Paper, Divider, 
  Tabs, Tab, Button, TextField, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Collapse, alpha
} from "@mui/material";
import PersonIcon         from "@mui/icons-material/PersonRounded";
import AccessTimeIcon     from "@mui/icons-material/AccessTimeRounded";
import StorefrontIcon     from "@mui/icons-material/StorefrontRounded";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDiningRounded";
import CheckCircleIcon    from "@mui/icons-material/CheckCircleRounded";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../services/authService";

export default function EntregasView() {
  const [tabIndex, setTabIndex] = useState(0);
  
  // Data lists
  const [locales, setLocales] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [domicilios, setDomicilios] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // For Tienda
  const [tiendaDialogOpen, setTiendaDialogOpen] = useState(false);
  const [currentTiendaPedido, setCurrentTiendaPedido] = useState(null);
  const [tiendaInputCode, setTiendaInputCode] = useState("");
  const [tiendaFeedback, setTiendaFeedback] = useState(null);
  
  useEffect(() => {
    cargarEntregas();
    const interval = setInterval(cargarEntregas, 20000);
    return () => clearInterval(interval);
  }, []);

  const cargarEntregas = async () => {
    try {
      const [rLoc, rTie, rDom] = await Promise.all([
        api.get("/vendedor/pedidos_locales"),
        api.get("/vendedor/pedidos_tienda"),
        api.get("/vendedor/pedidos_domicilio")
      ]);
      if(rLoc.data) setLocales(rLoc.data);
      if(rTie.data) setTiendas(rTie.data);
      if(rDom.data) setDomicilios(rDom.data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEntregarLocal = async (id) => {
    if(!window.confirm("¿Marcar este pedido local como entregado al cliente?")) return;
    try {
      const res = await api.post("/vendedor/confirmar_local", { pedido_id: id });
      if(res.data?.ok) {
        setLocales(prev => prev.filter(p => p.pedido_id !== id));
      } else {
        alert("Error al confirmar entrega local.");
      }
    } catch (e) { console.error(e); }
  };

  const handleConfirmarTienda = async () => {
    if (!currentTiendaPedido || !tiendaInputCode) return;
    setTiendaFeedback(null);
    try {
      const payload = { 
        codigo: tiendaInputCode 
      };
      
      const res = await api.post("/vendedor/confirmar_tienda", payload);
      const rdata = res.data;
      if(rdata?.ok) {
        setTiendaFeedback({ type: 'success', text: "¡Recolección Validada Correctamente!" });
        setTiendas(prev => prev.filter(p => p.pedido_id !== currentTiendaPedido.pedido_id));
        setTimeout(() => {
          setTiendaDialogOpen(false);
          setTiendaInputCode("");
          setTiendaFeedback(null);
        }, 1500);
      } else {
        setTiendaFeedback({ type: 'error', text: `Código o Error: ${rdata?.error || "Desconocido"}` });
      }
    } catch (e) {
      console.error(e); 
      setTiendaFeedback({ type: 'error', text: e.response?.data?.error || "Error al conectar con el servidor." });
    }
  };

  const a11yProps = (index) => {
    return {
      id: `entrega-tab-${index}`,
      'aria-controls': `entrega-tabpanel-${index}`,
    };
  };

  if(loading) return <Box p={4} textAlign="center"><CircularProgress/></Box>;

  return (
    <Box>
       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e,nv) => setTabIndex(nv)} aria-label="entregas tabs" sx={{
              "& .MuiTab-root": { fontWeight: "bold" },
              "& .Mui-selected": { color: "#023C81 !important" },
              "& .MuiTabs-indicator": { backgroundColor: "#023C81" }
            }}>
          <Tab label={`Local (${locales.length})`} {...a11yProps(0)} />
          <Tab label={`Recoger Tienda (${tiendas.length})`} {...a11yProps(1)} />
          <Tab label={`A Domicilio. (${domicilios.length})`} {...a11yProps(2)} />
        </Tabs>
      </Box>

      {/* ── TAB LOCAL ── */}
      {tabIndex === 0 && (
        <Grid container spacing={2}>
           {locales.length === 0 ? <Typography p={2} color="text.secondary">No hay órdenes locales pendientes.</Typography> :             locales.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.pedido_id}>
                <Paper sx={{ 
                  p:2, borderRadius: 3, 
                  border: `1.5px solid ${alpha('#023C81', 0.25)}`,
                  borderLeft: `4px solid #023C81`,
                  transition: "box-shadow 0.2s",
                  "&:hover": { boxShadow: `0 4px 20px ${alpha('#023C81', 0.15)}` }
                }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                     <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#023C81", fontSize: 14 }}>
                       {p.folio}
                     </Typography>
                     <Chip size="small" label={p.estado_pedido} color={p.estado_pedido==='creado'?'default':'warning'} sx={{fontWeight:700, fontSize:10}}/>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                     <PersonIcon sx={{ fontSize: 16, color: "#4A5B72" }} />
                     <Typography variant="body2" sx={{ color: "#4A5B72" }}>
                       Identificador: <b>{p.codigo_entrega_sistema}</b>
                     </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: "#9e9e9e" }} />
                      <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
                        {new Date(p.fecha_pedido).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 16, color: "#18A558" }}>
                      ${p.total.toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Button 
                    fullWidth variant="contained" 
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleEntregarLocal(p.pedido_id)}
                    sx={{ borderRadius: 2, background: "linear-gradient(135deg,#023C81,#1254A8)", fontWeight: 700 }}
                  >
                    Marcar Entregado
                  </Button>
                </Paper>
              </Grid>
           ))}
        </Grid>
      )}

      {/* ── TAB TIENDA ── */}
      {tabIndex === 1 && (
        <Grid container spacing={2}>
           {tiendas.length === 0 ? <Typography p={2} color="text.secondary">No hay de recolección pendientes.</Typography> :             tiendas.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.pedido_id}>
                <Paper sx={{ 
                  p:2, borderRadius: 3, 
                  background: alpha("#ffffffff", 0.7),
                  border: `1.5px solid ${alpha('#0048ffff', 0.25)}`,
                  borderLeft: `4px solid #0048ffff`,
                  transition: "box-shadow 0.2s",
                  "&:hover": { boxShadow: `0 4px 20px ${alpha('#0048ffff', 0.15)}` }
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                     <Box>
                       <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#0048ffff", fontSize: 13 }}>
                         {p.folio}
                       </Typography>
                       <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                         {new Date(p.fecha_pedido).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                       </Typography>
                     </Box>
                     <Chip size="small" label="Recoger en tienda" icon={<StorefrontIcon fontSize="small" color="#07028cff"/>} sx={{ fontWeight: 700, fontSize: 10, background: alpha('#07028cff', 0.1), color: '#07028cff' }} />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                     <PersonIcon sx={{ fontSize: 16, color: "#4A5B72" }} />
                     <Typography variant="body2" sx={{ color: "#4A5B72", fontWeight: 600 }}>
                       {p.cliente_nombre + ' ' + p.cliente_apellidos}
                     </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", mb: 2 }}>
                    <Typography sx={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 16, color: "#18A558" }}>
                      ${p.total.toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Button 
                    fullWidth variant="contained" 
                    startIcon={<CheckCircleIcon/>}
                    onClick={() => {
                       setCurrentTiendaPedido(p);
                       setTiendaDialogOpen(true);
                       setTiendaInputCode("");
                       setTiendaFeedback(null);
                    }}
                    sx={{ borderRadius: 2, background: "#05ad26ff", color: "#fff", fontWeight: 700, "&:hover":{background:"#00e626ff"} }}
                  >
                    Validar Entrega
                  </Button>
                </Paper>
              </Grid>
           ))}
        </Grid>
      )}

      {/* ── TAB DOMICILIO ── */}
      {tabIndex === 2 && (
        <Grid container spacing={2}>
           {domicilios.length === 0 ? <Typography p={2} color="text.secondary">No hay de domicilio.</Typography> : 
            domicilios.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.pedido_id}>
                <Paper sx={{ 
                  p:2, borderRadius: 3, 
                  border: `1.5px solid ${alpha('#18A558', 0.25)}`,
                  borderLeft: `4px solid #18A558`,
                  transition: "box-shadow 0.2s",
                  "&:hover": { boxShadow: `0 4px 20px ${alpha('#18A558', 0.15)}` }
                }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                       <Typography variant="subtitle2" sx={{ fontFamily: "sans-serif", fontWeight: 800, color: "#18A558", fontSize: 13 }}>
                         {p.folio}
                       </Typography>
                       <Typography variant="caption" sx={{ color: "#4A5B72", fontSize: 10 }}>
                         {new Date(p.fecha_pedido).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                       </Typography>
                    </Box>
                    <Chip size="small" label="Domicilio" icon={<DeliveryDiningIcon fontSize="small"/>} sx={{ fontWeight: 700, fontSize: 10, background: alpha('#18A558', 0.1), color: '#18A558' }} />
                  </Box>
                  
                  {p.qr_codigo ? (
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ p: 1, border: `1px dashed ${alpha('#18A558',0.3)}`, borderRadius: 2, background: "#fff" }}>
                        <QRCodeSVG value={p.qr_codigo} size={110} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" mt={1.5} sx={{ display: "block", textAlign:"center" }}>
                        Escanea el QR para asignar conductor
                      </Typography>
                    </Box>
                  ) : (
                    <Typography color="error" variant="body2" mt={2} textAlign="center">Generando QR...</Typography>
                  )}
                </Paper>
              </Grid>
           ))}
        </Grid>
      )}

      {/* DIALOGO TIENDA */}
      <Dialog open={tiendaDialogOpen} onClose={() => setTiendaDialogOpen(false)}>
         <DialogTitle>Validar Recolección Tienda</DialogTitle>
         <DialogContent dividers>
            <Typography mb={2}>Ingrese el código proporcionado por el cliente para el pedido <b>{currentTiendaPedido?.folio}</b>.</Typography>
            <TextField 
              fullWidth label="Código de Cliente (6 dígitos)"
              value={tiendaInputCode}
              onChange={e => { setTiendaInputCode(e.target.value); setTiendaFeedback(null); }}
              error={tiendaFeedback?.type === 'error'}
            />
            <Collapse in={!!tiendaFeedback}>
              {tiendaFeedback && (
                <Alert severity={tiendaFeedback.type} sx={{ mt: 2 }}>
                  {tiendaFeedback.text}
                </Alert>
              )}
            </Collapse>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setTiendaDialogOpen(false)}>Cerrar</Button>
           <Button variant="contained" onClick={handleConfirmarTienda} disabled={tiendaFeedback?.type === 'success'}>
             Confirmar Entrega
           </Button>
         </DialogActions>
      </Dialog>
    </Box>
  );
}
