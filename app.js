
/* App JS - Restaurante Web (actualizado)
   - Soporta ingredientes por tipo: 'peso' (g/ml) o 'unidad' (pieza)
   - Platillos libres: mantener comportamiento por porcentajes + nueva calculadora desde gramaje que convierte a %
   - Platillos de carta: agregar receta con cantidades fijas (piezas o g), calcular costo detalle y precio con margen
*/

const LS_ING = 'rest_ingredientes_v1';
const LS_PLAT = 'rest_platillos_v1';

// Data structures
let ingredientes = JSON.parse(localStorage.getItem(LS_ING) || '[]');
let platillos = JSON.parse(localStorage.getItem(LS_PLAT) || '[]');

// DOM elements
const formIngred = document.getElementById('formIngrediente');
const tablaIngredientes = document.getElementById('tablaIngredientes');
const countIngredientes = document.getElementById('countIngredientes');
const selIngrediente = document.getElementById('selIngrediente');
const selIngredCalc = document.getElementById('selIngredCalc');
const selIngredCarta = document.getElementById('selIngredCarta');

const chartIngredientesCtx = document.getElementById('chartIngredientes');
const chartCotizacionCtx = document.getElementById('chartCotizacion');

const platNombre = document.getElementById('platNombre');
const btnCrearPlatillo = document.getElementById('btnCrearPlatillo');
const btnAddReceta = document.getElementById('btnAddReceta');
const porcentajeInput = document.getElementById('porcentaje');
const tablaReceta = document.getElementById('tablaReceta');
const btnSaveRecipe = document.getElementById('btnSaveRecipe');
const btnClearRecipe = document.getElementById('btnClearRecipe');
const tablaPlatillos = document.getElementById('tablaPlatillos');
const selPlatillos = document.getElementById('selPlatillos');
const btnCotizar = document.getElementById('btnCotizar');
const cantidadPreparar = document.getElementById('cantidadPreparar');
const resultadoCotizacion = document.getElementById('resultadoCotizacion');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const btnClear = document.getElementById('btnClear');

const selPlatulosPlaceholder = null; // placeholder

// New for gram-based calculator (platillos libres)
const gramajeInput = document.getElementById('gramaje');
const btnAddGram = document.getElementById('btnAddGram');
const tablaRecetaGrams = document.getElementById('tablaRecetaGrams');
const btnCalcularPlatLibre = document.getElementById('btnCalcularPlatLibre');
const btnGuardarPlatLibre = document.getElementById('btnGuardarPlatLibre');

// New for platillos de carta
const platCartaNombre = document.getElementById('platCartaNombre');
const btnCrearPlatCarta = document.getElementById('btnCrearPlatCarta');
const cantidadCarta = document.getElementById('cantidadCarta');
const btnAddCarta = document.getElementById('btnAddCarta');
const tablaCarta = document.getElementById('tablaCarta');
const margenCarta = document.getElementById('margenCarta');
const btnCalcularCarta = document.getElementById('btnCalcularCarta');
const btnGuardarPlatCarta = document.getElementById('btnGuardarPlatCarta');
const resultadoCarta = document.getElementById('resultadoCarta');

let recetaTemp = []; // for percentage-based recipes [{id, porcentaje}]
let recetaGrams = []; // for gram-based temporary [{id, gramos}]
let recetaCarta = []; // for carta temporary [{id, cantidad}]
let editingPlatilloIndex = null;

let chartIng = null;
let chartCot = null;

// Utils
function saveAll(){
  localStorage.setItem(LS_ING, JSON.stringify(ingredientes));
  localStorage.setItem(LS_PLAT, JSON.stringify(platillos));
}

function uid(prefix='id'){
  return prefix + '_' + Math.random().toString(36).slice(2,9);
}

function calcularCostoUnitario(ing){
  if(!ing || !ing.cantidad) return 0;
  return ing.precio / ing.cantidad;
}

// Renderers
function renderIngredientes(){
  tablaIngredientes.innerHTML = '';
  selIngrediente.innerHTML = '<option value="">-- Selecciona ingrediente --</option>';
  selIngredCalc.innerHTML = '<option value="">-- Selecciona ingrediente --</option>';
  selIngredCarta.innerHTML = '<option value="">-- Selecciona ingrediente --</option>';
  ingredientes.forEach((ing, idx) => {
    const cu = calcularCostoUnitario(ing);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td>
      <td>${ing.nombre}</td>
      <td>${ing.cantidad}</td>
      <td>$${ing.precio.toFixed(2)}</td>
      <td>$${cu.toFixed(4)}</td>
      <td>${ing.tipo || 'peso'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${ing.id}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-action="del" data-id="${ing.id}"><i class="bi bi-trash"></i></button>
      </td>`;
    tablaIngredientes.appendChild(tr);

    const opt = document.createElement('option');
    opt.value = ing.id;
    opt.textContent = ing.nombre;
    selIngrediente.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    selIngredCalc.appendChild(opt2);

    const opt3 = opt.cloneNode(true);
    selIngredCarta.appendChild(opt3);
  });
  countIngredientes.textContent = ingredientes.length + ' ingredientes';
  renderChartIngredientes();
}

function renderChartIngredientes(){
  const labels = ingredientes.map(i=>i.nombre);
  const data = ingredientes.map(i => +(calcularCostoUnitario(i).toFixed(4)));
  if(chartIng) chartIng.destroy();
  chartIng = new Chart(chartIngredientesCtx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Costo unitario ($/g o pieza)', data, backgroundColor: labels.map(()=> 'rgba(13,110,253,0.7)') }]},
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
  });
}

function renderPlatillos(){
  tablaPlatillos.innerHTML = '';
  selPlatillos.innerHTML = '<option value="">-- Selecciona platillo --</option>';
  platillos.forEach((p, idx) => {
    const ingCount = p.receta ? p.receta.length : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td>
      <td>${p.nombre}</td>
      <td>${p.tipo || 'libre'}</td>
      <td>${ingCount} ingredientes</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-success me-1" data-action="view" data-index="${idx}"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-index="${idx}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-action="del" data-index="${idx}"><i class="bi bi-trash"></i></button>
      </td>`;
    tablaPlatillos.appendChild(tr);

    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = p.nombre + ' (' + (p.tipo||'libre') + ')';
    selPlatillos.appendChild(opt);
  });
}

// Events - Ingredients
formIngred.addEventListener('submit', (e)=>{
  e.preventDefault();
  const nombre = document.getElementById('ingNombre').value.trim();
  const cantidad = parseFloat(document.getElementById('ingCantidad').value) || 0;
  const precio = parseFloat(document.getElementById('ingPrecio').value) || 0;
  const tipo = document.getElementById('ingTipo').value || 'peso';
  if(!nombre || cantidad<=0 || precio<=0){ alert('Completa los datos correctamente'); return; }
  const ing = { id: uid('ing'), nombre, cantidad, precio, tipo };
  ingredientes.push(ing);
  saveAll();
  renderIngredientes();
  formIngred.reset();
});

// Delegation for edit/delete ingredient
tablaIngredientes.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if(action === 'edit'){
    const ing = ingredientes.find(x=>x.id===id);
    if(!ing) return;
    // fill modal
    document.getElementById('editId').value = ing.id;
    document.getElementById('editNombre').value = ing.nombre;
    document.getElementById('editCantidad').value = ing.cantidad;
    document.getElementById('editPrecio').value = ing.precio;
    document.getElementById('editTipo').value = ing.tipo || 'peso';
    const modal = new bootstrap.Modal(document.getElementById('modalEditIngred'));
    modal.show();
  } else if(action === 'del'){
    if(!confirm('Eliminar ingrediente?')) return;
    ingredientes = ingredientes.filter(x=>x.id!==id);
    // remove from platillos recipes
    platillos.forEach(p=>{
      if(Array.isArray(p.receta)){
        p.receta = p.receta.filter(r=> r.id !== id);
      }
    });
    saveAll();
    renderIngredientes();
    renderPlatillos();
  }
});

// Edit ingredient modal submit
document.getElementById('formEditIngred').addEventListener('submit', (e)=>{
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const nombre = document.getElementById('editNombre').value.trim();
  const cantidad = parseFloat(document.getElementById('editCantidad').value) || 0;
  const precio = parseFloat(document.getElementById('editPrecio').value) || 0;
  const tipo = document.getElementById('editTipo').value || 'peso';
  const idx = ingredientes.findIndex(i=>i.id===id);
  if(idx===-1) return;
  ingredientes[idx].nombre = nombre;
  ingredientes[idx].cantidad = cantidad;
  ingredientes[idx].precio = precio;
  ingredientes[idx].tipo = tipo;
  saveAll();
  renderIngredientes();
  bootstrap.Modal.getInstance(document.getElementById('modalEditIngred')).hide();
});

// Recipe creation (percentage)
btnAddReceta.addEventListener('click', ()=>{
  const sel = selIngrediente.value;
  const porc = parseFloat(porcentajeInput.value);
  if(!sel){ alert('Selecciona un ingrediente'); return; }
  if(isNaN(porc) || porc<=0 || porc>1){ alert('El porcentaje debe ser entre 0 y 1'); return; }
  const ingObj = ingredientes.find(i=>i.id===sel);
  if(!ingObj){ alert('Ingrediente no encontrado'); return; }
  const existing = recetaTemp.find(r=>r.id===sel);
  if(existing){
    existing.porcentaje = porc;
  } else {
    recetaTemp.push({ id: sel, porcentaje: porc });
  }
  renderRecetaTemp();
  porcentajeInput.value = '';
});

function renderRecetaTemp(){
  tablaReceta.innerHTML = '';
  recetaTemp.forEach(r=>{
    const ingObj = ingredientes.find(i=>i.id===r.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${ingObj ? ingObj.nombre : '---'}</td>
      <td>${(r.porcentaje*100).toFixed(2)}%</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-id="${r.id}">Eliminar</button></td>`;
    tablaReceta.appendChild(tr);
  });
}

// delete from temp recipe
tablaReceta.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  recetaTemp = recetaTemp.filter(r=>r.id!==id);
  renderRecetaTemp();
});

// Save recipe to a new platillo (works for percentage-based platillos libres)
btnSaveRecipe.addEventListener('click', ()=>{
  const name = (platNombre.value || '').trim();
  if(!name){ alert('Dale un nombre al platillo'); return; }
  if(recetaTemp.length===0){ alert('Agrega al menos un ingrediente'); return; }
  const suma = recetaTemp.reduce((s,r)=>s+r.porcentaje,0);
  if(Math.abs(suma-1) > 0.01){ if(!confirm('La suma de porcentajes no es 1. Continuar?')) return; }
  const plat = { id: uid('plat'), nombre: name, receta: JSON.parse(JSON.stringify(recetaTemp)), tipo: 'libre' };
  platillos.push(plat);
  saveAll();
  recetaTemp = [];
  platNombre.value = '';
  renderRecetaTemp();
  renderPlatillos();
});

// Clear recipe temp
btnClearRecipe.addEventListener('click', ()=>{ recetaTemp = []; renderRecetaTemp(); });

// Create platillo button creates empty recipe to fill
btnCrearPlatillo.addEventListener('click', ()=>{
  platNombre.focus();
});

// Platillos table actions (view, edit, delete)
tablaPlatillos.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const idx = parseInt(btn.dataset.index);
  if(action === 'view'){
    viewPlatillo(idx);
  } else if(action === 'edit'){
    editPlatillo(idx);
  } else if(action === 'del'){
    if(!confirm('Eliminar platillo?')) return;
    platillos.splice(idx,1);
    saveAll();
    renderPlatillos();
  }
});

function viewPlatillo(idx){
  const p = platillos[idx];
  if(!p) return;
  if(p.tipo === 'libre'){
    // fill temporary recipe for viewing
    recetaTemp = JSON.parse(JSON.stringify(p.receta));
    platNombre.value = p.nombre;
    renderRecetaTemp();
  } else if(p.tipo === 'carta'){
    recetaCarta = JSON.parse(JSON.stringify(p.receta));
    platCartaNombre.value = p.nombre;
    renderRecetaCarta();
  }
  editingPlatilloIndex = null;
}

function editPlatillo(idx){
  const p = platillos[idx];
  if(!p) return;
  if(p.tipo === 'libre'){
    recetaTemp = JSON.parse(JSON.stringify(p.receta));
    platNombre.value = p.nombre;
    editingPlatilloIndex = idx;
    renderRecetaTemp();
  } else if(p.tipo === 'carta'){
    recetaCarta = JSON.parse(JSON.stringify(p.receta));
    platCartaNombre.value = p.nombre;
    editingPlatilloIndex = idx;
    renderRecetaCarta();
  }
}

// Save editing (if editingPlatilloIndex not null, update, else new)
// For percentage-based save is handled earlier; override that to allow updating when editingPlatilloIndex != null
btnSaveRecipe.addEventListener('click', ()=>{
  if(editingPlatilloIndex !== null){
    const p = platillos[editingPlatilloIndex];
    if(p.tipo === 'libre'){
      p.nombre = platNombre.value.trim();
      p.receta = JSON.parse(JSON.stringify(recetaTemp));
      saveAll();
      editingPlatilloIndex = null;
      renderPlatillos();
      recetaTemp = [];
      platNombre.value = '';
      renderRecetaTemp();
    }
  }
});

// Cotizar
btnCotizar.addEventListener('click', ()=>{
  const pIdx = parseInt(selPlatillos.value);
  if(isNaN(pIdx)){ alert('Selecciona un platillo a cotizar'); return; }
  const p = platillos[pIdx];
  if(!p) return;
  const cantidad = parseFloat(cantidadPreparar.value) || 0;
  const margenPct = parseFloat(document.getElementById('margen').value) || 0;
  let detalle = [];
  let totalCosto = 0;

  if(p.tipo === 'libre'){
    if(cantidad <= 0){ alert('Ingresa una cantidad valida (total g/ml) para platillos libres'); return; }
    p.receta.forEach(r=>{
      const ing = ingredientes.find(i=>i.id===r.id);
      const cantidadIng = cantidad * r.porcentaje;
      const costoIng = calcularCostoUnitario(ing) * cantidadIng;
      detalle.push({ nombre: ing ? ing.nombre : '---', cantidad: cantidadIng, costo: costoIng });
      totalCosto += costoIng;
    });
  } else if(p.tipo === 'carta'){
    if(!Number.isInteger(cantidad) || cantidad <= 0){ alert('Para platillos de carta, ingresa un numero entero mayor a 0 de platillos a preparar'); return; }
    p.receta.forEach(r=>{
      const ing = ingredientes.find(i=>i.id===r.id);
      const cantidadIng = (r.cantidad || 0) * cantidad; // multiplicar por número de platillos
      const costoIng = calcularCostoUnitario(ing) * cantidadIng;
      detalle.push({ nombre: ing ? ing.nombre : '---', cantidad: cantidadIng, tipo: ing ? ing.tipo : 'peso', costo: costoIng });
      totalCosto += costoIng;
    });
  }

  const ganancia = totalCosto * (margenPct/100);
  const precioVenta = totalCosto + ganancia;

  // render detalle
  let html = `<h6>Detalle de cotizacion - ${p.nombre}</h6>`;
  html += `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Costo</th></tr></thead><tbody>`;
  detalle.forEach(d=>{
    html += `<tr><td>${d.nombre}</td><td>${d.cantidad.toFixed(2)} ${d.tipo && d.tipo==='unidad' ? 'piezas' : ''}</td><td>$${d.costo.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  html += `<p><strong>Costo real:</strong> $${totalCosto.toFixed(2)} &nbsp;&nbsp; <strong>Ganancia:</strong> $${ganancia.toFixed(2)} &nbsp;&nbsp; <strong>Precio venta:</strong> $${precioVenta.toFixed(2)}</p>`;
  resultadoCotizacion.innerHTML = html;

  // chart pie for cost distribution
  const labels = detalle.map(d=>d.nombre);
  const data = detalle.map(d=>+d.costo.toFixed(2));
  if(chartCot) chartCot.destroy();
  chartCot = new Chart(chartCotizacionCtx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: labels.map((_,i)=>`hsl(${i*40 % 360} 70% 50%)`)}] },
    options: { plugins:{legend:{position:'bottom'}} }
  });
});

// EXPORT / IMPORT / RESET (unchanged)
btnExport.addEventListener('click', ()=>{
  const data = { ingredientes, platillos };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'restaurante_data.json'; a.click();
  URL.revokeObjectURL(url);
});

btnImport.addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = e=>{
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev=>{
      try{
        const obj = JSON.parse(ev.target.result);
        if(Array.isArray(obj.ingredientes) && Array.isArray(obj.platillos)){
          ingredientes = obj.ingredientes;
          platillos = obj.platillos;
          saveAll();
          renderIngredientes(); renderPlatillos(); alert('Importado correctamente');
        } else alert('Archivo invalido');
      }catch(err){ alert('Error leyendo archivo'); }
    };
    reader.readAsText(f);
  };
  inp.click();
});

btnClear.addEventListener('click', ()=>{
  if(!confirm('Borrar todos los datos?')) return;
  localStorage.removeItem(LS_ING);
  localStorage.removeItem(LS_PLAT);
  ingredientes = []; platillos = [];
  recetaTemp = []; recetaGrams = []; recetaCarta = []; editingPlatilloIndex = null;
  saveAll();
  renderIngredientes(); renderPlatillos(); resultadoCotizacion.innerHTML=''; if(chartCot) chartCot.destroy();
});

// ----------------- New: Gram-based recipe (platillos libres) -----------------
btnAddGram.addEventListener('click', ()=>{
  const sel = selIngredCalc.value;
  const gramos = parseFloat(gramajeInput.value) || 0;
  if(!sel){ alert('Selecciona un ingrediente'); return; }
  if(gramos <= 0){ alert('Ingresa un gramaje valido'); return; }
  const existing = recetaGrams.find(r=>r.id===sel);
  if(existing){
    existing.gramos = gramos;
  } else {
    recetaGrams.push({ id: sel, gramos });
  }
  renderRecetaGrams();
  gramajeInput.value = '';
});

function renderRecetaGrams(){
  tablaRecetaGrams.innerHTML = '';
  recetaGrams.forEach(r=>{
    const ingObj = ingredientes.find(i=>i.id===r.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${ingObj ? ingObj.nombre : '---'}</td>
      <td>${r.gramos.toFixed(2)}</td>
      <td>${( (r.gramos) ).toFixed(2)}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-id="${r.id}">Eliminar</button></td>`;
    tablaRecetaGrams.appendChild(tr);
  });
}

tablaRecetaGrams.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  recetaGrams = recetaGrams.filter(r=>r.id!==id);
  renderRecetaGrams();
});

// Calculate percentages from gramos
btnCalcularPlatLibre.addEventListener('click', ()=>{
  if(recetaGrams.length===0){ alert('Agrega al menos un ingrediente con gramaje'); return; }
  const total = recetaGrams.reduce((s,r)=>s+r.gramos,0);
  if(total <= 0){ alert('Total de gramos invalido'); return; }
  recetaTemp = recetaGrams.map(r=>({ id: r.id, porcentaje: r.gramos / total }));
  renderRecetaTemp();
  alert('Se calcularon los porcentajes y se cargaron en la sección de receta actual. Puedes revisar y guardar.');
});

// Save calculated gram-based recipe as platillo libre
btnGuardarPlatLibre.addEventListener('click', ()=>{
  if(recetaTemp.length===0){ alert('No hay receta calculada para guardar'); return; }
  const name = prompt('Nombre para el platillo libre (calculado)') || '';
  if(!name.trim()) { alert('Nombre requerido'); return; }
  const plat = { id: uid('plat'), nombre: name.trim(), receta: JSON.parse(JSON.stringify(recetaTemp)), tipo: 'libre' };
  platillos.push(plat);
  saveAll();
  recetaTemp = []; recetaGrams = [];
  renderRecetaTemp(); renderRecetaGrams(); renderPlatillos();
  alert('Platillo libre guardado correctamente.');
});

// ----------------- Platillos de carta (cantidades fijas) -----------------
btnAddCarta.addEventListener('click', ()=>{
  const sel = selIngredCarta.value;
  const cantidad = parseFloat(cantidadCarta.value) || 0;
  if(!sel){ alert('Selecciona un ingrediente'); return; }
  if(cantidad <= 0){ alert('Ingresa una cantidad valida'); return; }
  const existing = recetaCarta.find(r=>r.id===sel);
  if(existing){
    existing.cantidad = cantidad;
  } else {
    recetaCarta.push({ id: sel, cantidad });
  }
  renderRecetaCarta();
  cantidadCarta.value = '';
});

function renderRecetaCarta(){
  tablaCarta.innerHTML = '';
  recetaCarta.forEach(r=>{
    const ingObj = ingredientes.find(i=>i.id===r.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${ingObj ? ingObj.nombre : '---'}</td>
      <td>${r.cantidad}</td>
      <td>${ingObj ? ingObj.tipo : ''}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-id="${r.id}">Eliminar</button></td>`;
    tablaCarta.appendChild(tr);
  });
}

tablaCarta.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  recetaCarta = recetaCarta.filter(r=>r.id!==id);
  renderRecetaCarta();
});

// Calculate cost for platillo de carta and show breakdown (but not saving)
btnCalcularCarta.addEventListener('click', ()=>{
  if(recetaCarta.length===0){ alert('Agrega ingredientes al platillo de carta'); return; }
  const margen = parseFloat(margenCarta.value) || 0;
  let detalle = [];
  let total = 0;
  recetaCarta.forEach(r=>{
    const ing = ingredientes.find(i=>i.id===r.id);
    const cantidadIng = r.cantidad;
    const costoIng = calcularCostoUnitario(ing) * cantidadIng;
    detalle.push({ nombre: ing ? ing.nombre : '---', cantidad: cantidadIng, tipo: ing ? ing.tipo : 'peso', costo: costoIng });
    total += costoIng;
  });
  const ganancia = total * (margen/100);
  const precioVenta = total + ganancia;

  let html = `<h6>Detalle platillo de carta</h6>`;
  html += `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Tipo</th><th>Costo</th></tr></thead><tbody>`;
  detalle.forEach(d=>{
    html += `<tr><td>${d.nombre}</td><td>${d.cantidad}</td><td>${d.tipo}</td><td>$${d.costo.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  html += `<p><strong>Costo total:</strong> $${total.toFixed(2)} &nbsp;&nbsp; <strong>Precio con margen (${margen}%)</strong>: $${precioVenta.toFixed(2)}</p>`;
  resultadoCarta.innerHTML = html;
});

// Save platillo de carta (recetaCarta) as platillo tipo 'carta'
btnGuardarPlatCarta.addEventListener('click', ()=>{
  if(recetaCarta.length===0){ alert('Agrega ingredientes al platillo de carta'); return; }
  const name = (platCartaNombre.value || '').trim();
  if(!name){ alert('Dale un nombre al platillo de carta'); return; }
  const plat = { id: uid('plat'), nombre: name, receta: JSON.parse(JSON.stringify(recetaCarta)), tipo: 'carta' };
  if(editingPlatilloIndex !== null){
    platillos[editingPlatilloIndex] = plat;
    editingPlatilloIndex = null;
  } else {
    platillos.push(plat);
  }
  saveAll();
  recetaCarta = [];
  platCartaNombre.value = '';
  renderRecetaCarta();
  renderPlatillos();
  alert('Platillo de carta guardado.');
});

// Create platillo de carta button helper
btnCrearPlatCarta.addEventListener('click', ()=>{
  platCartaNombre.focus();
});

// If editing a carta platillo, update handler
btnGuardarPlatCarta.addEventListener('click', ()=>{ /* handled above */ });

// Initial render
renderIngredientes();
renderPlatillos();
renderRecetaTemp = renderRecetaTemp || (function(){ tablaReceta.innerHTML=''; });
renderRecetaGrams = renderRecetaGrams || (function(){ tablaRecetaGrams.innerHTML=''; });
renderRecetaCarta = renderRecetaCarta || (function(){ tablaCarta.innerHTML=''; });
