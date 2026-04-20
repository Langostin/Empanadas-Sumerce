// src/views/Vendedor/VentaView.jsx
import { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Paper, Divider, 
  Select, MenuItem, FormControl, InputLabel, 
  TextField, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Switch, CircularProgress,
  RadioGroup, Radio, FormLabel
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import { alpha } from "@mui/material/styles";
import { api } from "../../services/authService";

export default function VentaView() {
  
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Formulario Venta Libre
  const [selProducto, setSelProducto] = useState("");
  const [cantidad, setCantidad]       = useState(1);
  const [clienteNombre, setClienteNombre] = useState("");

  // Carrito
  const [carrito, setCarrito] = useState([]);

  // Modal Pago
  const [pagoOpen, setPagoOpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState(1); // 1 Efectivo, 2 Tarjeta
  const [requiereFactura, setRequiereFactura] = useState(false);
  
  // Datos Efectivo
  const [efectivoRecibido, setEfectivoRecibido] = useState("");

  // Datos Fiscales
  const [datosFiscales, setDatosFiscales] = useState({
    whatsapp: "",
    rfc: "",
    razonSocial: "",
    codigoPostal: "",
    regimenClave: "616"
  });

  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
       const res = await api.get("/vendedor/productos");
       if (res.data) {
         setProductos(res.data);
       }
    } catch (e) {
       console.error("Error cargando productos", e);
    } finally {
       setLoading(false);
    }
  };

  const agregarAlCarrito = () => {
    if (!selProducto || cantidad <= 0 || !clienteNombre.trim()) {
      alert("Comprueba que haya un cliente, un producto y una cantidad válida.");
      return;
    }
    
    const prodRef = productos.find(p => p.producto_id === selProducto);
    if (!prodRef) return;

    setCarrito(prev => {
      const idx = prev.findIndex(item => item.producto_id === selProducto);
      if (idx >= 0) {
        const nc = [...prev];
        nc[idx].cantidad += cantidad;
        nc[idx].subtotal = nc[idx].cantidad * nc[idx].precio_unitario;
        return nc;
      } else {
        return [...prev, {
          producto_id: prodRef.producto_id,
          nombre: prodRef.nombre,
          precio_unitario: prodRef.precio_actual,
          cantidad: cantidad,
          subtotal: prodRef.precio_actual * cantidad
        }];
      }
    });

    setCantidad(1);
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(c => c.producto_id !== id));
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿Seguro que deseas vaciar el carrito actual?")) {
      setCarrito([]);
      setClienteNombre("");
    }
  };

  const totalCarrito = carrito.reduce((acc, obj) => acc + obj.subtotal, 0);

  const cambioEfectivo = Math.max(0, (parseFloat(efectivoRecibido) || 0) - totalCarrito);

  const handeProcesarVenta = async () => {
    if (metodoPago === 1 && efectivoRecibido < totalCarrito) {
      return alert("El cobro en efectivo es menor al total de la cuenta.");
    }
    if (requiereFactura && (!datosFiscales.whatsapp || !datosFiscales.rfc)) {
      return alert("Debe proporcionar teléfono y RFC para la factura.");
    }

    setProcesando(true);
    try {
      const payload = {
        clienteNombre,
        items: carrito,
        metodo_pago_id: metodoPago,
        requiere_factura: requiereFactura,
        efectivo_recibido: efectivoRecibido,
        datos_fiscales: requiereFactura ? datosFiscales : null
      };

      const res = await api.post("/vendedor/crear_venta", payload);
      const data = res.data;
      
      if (data && data.ok) {
        alert(`¡Venta cerrada! Folio: ${data.folio}`);
        setCarrito([]);
        setClienteNombre("");
        setPagoOpen(false);
      } else {
        alert(`Error al cobrar: ${data.error}`);
      }

    } catch (e) {
      console.error(e);
      alert("Error procesando pago.");
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress/></Box>;

  return (
    <Grid container spacing={3}>
      
      {/* ── PANEL DE SELECCION ── */}
      <Grid item xs={12} md={4}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(0,0,0,0.08)" }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>Nueva Venta</Typography>
          
          <TextField 
            fullWidth size="small" label="Nombre (Identificador/Ticket)" 
            value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Producto / Empanada</InputLabel>
            <Select
              label="Producto / Empanada"
              value={selProducto}
              onChange={e => setSelProducto(e.target.value)}
            >
              {productos.map(p => (
                <MenuItem key={p.producto_id} value={p.producto_id}>
                  {p.nombre} - ${p.precio_actual.toFixed(2)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField 
            fullWidth size="small" type="number" label="Cantidad" 
            value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))}
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ mb: 2 }}
          />

          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<AddShoppingCartIcon/>}
            onClick={agregarAlCarrito}
            disabled={!selProducto || !cantidad || !clienteNombre.trim()}
            sx={{
              background: "#023C81",
              "&:hover": { background: "#012459" },
              borderRadius: 2, py: 1
            }}
          >
            Agregar a la Orden
          </Button>

        </Paper>
      </Grid>


      {/* ── PANEL DE CARRITO ── */}
      <Grid item xs={12} md={8}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(0,0,0,0.08)", minHeight: 400, display: 'flex', flexDirection: 'column' }}>
           <Typography variant="subtitle1" fontWeight="bold" mb={2}>Detalle del Pedido</Typography>
           
           <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ background: "rgba(0,0,0,0.02)" }}>
                  <TableRow>
                    <TableCell><b>Producto</b></TableCell>
                    <TableCell align="center"><b>Cant</b></TableCell>
                    <TableCell align="right"><b>P. Unitario</b></TableCell>
                    <TableCell align="right"><b>Subtotal</b></TableCell>
                    <TableCell align="center"><b>Quitar</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrito.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{py:4, color:"text.secondary"}}>No hay productos en la orden</TableCell></TableRow>
                  ) : (
                    carrito.map((c) => (
                      <TableRow key={c.producto_id} hover>
                        <TableCell>{c.nombre}</TableCell>
                        <TableCell align="center">{c.cantidad}</TableCell>
                        <TableCell align="right">${c.precio_unitario.toFixed(2)}</TableCell>
                        <TableCell align="right"><b>${c.subtotal.toFixed(2)}</b></TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => eliminarDelCarrito(c.producto_id)}>
                            <DeleteIcon fontSize="small"/>
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
           </Box>

           <Divider sx={{ my: 2 }} />
           
           <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <Box>
                <Button color="error" disabled={carrito.length === 0} onClick={vaciarCarrito}>Cancelar Orden</Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#023C81">
                  Total: ${totalCarrito.toFixed(2)}
                </Typography>
                <Button 
                  variant="contained" color="success" size="large"
                  disabled={carrito.length === 0}
                  onClick={() => setPagoOpen(true)}
                  startIcon={<LocalPrintshopIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Cobrar
                </Button>
              </Box>
           </Box>
        </Paper>
      </Grid>


      {/* ── DIALOGO DE PAGO ── */}
      <Dialog open={pagoOpen} onClose={() => !procesando && setPagoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 }}}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Procesar Pago — ${totalCarrito.toFixed(2)}</DialogTitle>
        <DialogContent dividers>
            
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend" sx={{ fontWeight: 'bold' }}>Método de Pago</FormLabel>
            <RadioGroup row value={metodoPago} onChange={e => setMetodoPago(parseInt(e.target.value))}>
              <FormControlLabel value={1} control={<Radio />} label="Efectivo" />
              <FormControlLabel value={2} control={<Radio />} label="Terminal Punto de Venta (Tarjeta)" />
            </RadioGroup>
          </FormControl>

          {metodoPago === 1 && (
            <Box mb={2} p={2} sx={{ background: alpha("#18A558", 0.05), borderRadius: 2, border: "1px solid rgba(24,165,88,0.2)"}}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField 
                    fullWidth label="Efectivo Recibido ($)" type="number" 
                    value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sx={{ display:'flex', alignItems:'center' }}>
                  <Typography variant="h6" color={cambioEfectivo > 0 ? "success.main" : "text.secondary"}>
                    Cambio: ${cambioEfectivo.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 2 }}/>

          <FormControlLabel 
            control={<Switch checked={requiereFactura} onChange={e => setRequiereFactura(e.target.checked)} color="primary" />}
            label={<Typography fontWeight="bold">Requerir Factura (CFDI 4.0)</Typography>}
          />
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Se le mandará ticket y la factura oficial por WhatsApp tras confirmar.
          </Typography>

          {requiereFactura && (
            <Box p={2} sx={{ background: alpha("#023C81", 0.05), border: "1px solid rgba(2,60,129,0.1)", borderRadius: 2 }}>
               <Grid container spacing={2}>
                 <Grid item xs={12}>
                   <TextField 
                     fullWidth size="small" label="WhatsApp del Cliente" 
                     placeholder="Ej: 526561112233"
                     value={datosFiscales.whatsapp}
                     onChange={e => setDatosFiscales({...datosFiscales, whatsapp: e.target.value})}
                     helperText="Número para enviar PDF y XML."
                   />
                 </Grid>
                 <Grid item xs={12} sm={6}>
                   <TextField 
                     fullWidth size="small" label="RFC" 
                     value={datosFiscales.rfc}
                     onChange={e => setDatosFiscales({...datosFiscales, rfc: e.target.value.toUpperCase()})}
                   />
                 </Grid>
                 <Grid item xs={12} sm={6}>
                   <TextField 
                     fullWidth size="small" label="C.P." 
                     value={datosFiscales.codigoPostal}
                     onChange={e => setDatosFiscales({...datosFiscales, codigoPostal: e.target.value})}
                   />
                 </Grid>
                 <Grid item xs={12}>
                   <TextField 
                     fullWidth size="small" label="Razón Social / Nombre" 
                     value={datosFiscales.razonSocial}
                     onChange={e => setDatosFiscales({...datosFiscales, razonSocial: e.target.value})}
                   />
                 </Grid>
                 <Grid item xs={12}>
                    <TextField 
                     fullWidth size="small" label="Clave Régimen (opcional, ej. 616)" 
                     value={datosFiscales.regimenClave}
                     onChange={e => setDatosFiscales({...datosFiscales, regimenClave: e.target.value})}
                   />
                 </Grid>
               </Grid>
            </Box>
          )}

          {metodoPago === 2 && !requiereFactura && (
             <Box mt={2}>
               <Typography color="error.main" variant="body2">
                 * Asegúrese de cobrar en la terminal física antes de cerrar esta operación en el sistema.
               </Typography>
             </Box>
          )}

        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPagoOpen(false)} disabled={procesando}>Atrás</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handeProcesarVenta}
            disabled={procesando || (metodoPago === 1 && efectivoRecibido < totalCarrito)}
            sx={{ px: 4, borderRadius: 2 }}
          >
            {procesando ? "Procesando..." : "Confirmar Compra"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
