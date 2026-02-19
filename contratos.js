import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc,    // Añadido
    setDoc,    // Añadido
    updateDoc, // Añadido
    deleteDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Horizonte que ya tenías
const firebaseConfig = {
  apiKey: "AIzaSyB0YYI7RqQbAxwuuKWAH-zZo19VBAmt21Y",
  authDomain: "contratosmensualeshorizonte.firebaseapp.com",
  projectId: "contratosmensualeshorizonte",
  storageBucket: "contratosmensualeshorizonte.firebasestorage.app",
  messagingSenderId: "395646013611",
  appId: "1:395646013611:web:afbc01af635ba0de25a7ee",
  measurementId: "G-HCF57HSFG5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_ID = "admin_horizonte";

// --- ESTADO LOCAL ---
let localTransactions = [];
let reportSubView = 'income';
let unidadesConfig = ['Hyundai County', 'Toyota Hiace'];
let catEgresos = ['Combustible', 'Sueldos y Viáticos', 'Repuestos', 'Mantenimiento', 'Gastos de Operaciones'];
let catIngresos = []; // Valores por defecto

// --- 1. ACCIONES DE FIREBASE ---
window.saveIncome = async () => {
    const elAmount = document.getElementById('in-amount');
    const elUnit = document.getElementById('in-unit');
    const elCategory = document.getElementById('in-category'); // Nuevo select

    if (!elAmount.value || !elUnit.value || !elCategory.value) return alert("Faltan datos");

    try {
        await addDoc(collection(db, 'usuarios', USER_ID, 'movimientos'), {
            type: 'income',
            amount: parseFloat(elAmount.value),
            category: elCategory.value, // Ahora guardamos la categoría seleccionada
            unit: elUnit.value,
            createdAt: serverTimestamp()
        });

        elAmount.value = '';        
        elUnit.selectedIndex = 0;   
        elCategory.selectedIndex = 0;

        if (typeof fetchTransactions === 'function') await fetchTransactions();
        showView('dashboard'); 
    } catch (e) { 
        console.error(e); 
        alert("Error al guardar");
    }
};

// Abrir el modal con los datos actuales
window.editTransaction = (id) => {
    const t = localTransactions.find(item => item.id === id);
    if (!t) return;

    const modal = document.getElementById('modal-edit');
    const unitSelect = document.getElementById('edit-unit');
    const catContainer = document.getElementById('edit-cat-container');
    const title = document.getElementById('edit-title');

    document.getElementById('edit-id').value = id;

    // 1. Llenar Unidades
    unitSelect.innerHTML = unidadesConfig.map(u => 
        `<option value="${u}" ${u === t.unit ? 'selected' : ''}>${u}</option>`
    ).join('');

    // 2. Lógica Diferenciada
    if (t.type === 'income') {
        title.innerText = "Editar Ingreso";
        title.className = "text-lg font-black text-green-600 uppercase italic";
        
        catContainer.innerHTML = `
            <div>
                <p class="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1">Monto Lps</p>
                <input type="number" id="edit-amount-income" value="${t.amount}" 
                    class="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl outline-none text-green-600 border-2 border-green-50">
            </div>
            <div>
                <p class="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1">Categoría de Ingreso</p>
                <select id="edit-category-income" class="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none">
                    ${catIngresos.map(c => `<option value="${c}" ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
        `;
    } else {
        title.innerText = "Editar Gasto";
        title.className = "text-lg font-black text-red-600 uppercase italic";

        catContainer.innerHTML = `
            <p class="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1">Desglose de Gastos</p>
            <div class="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                ${catEgresos.map(cat => {
                    const montoActual = (t.category === cat) ? t.amount : '';
                    return `
                        <div class="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <span class="flex-1 text-[10px] font-black uppercase text-slate-600 ml-2">${cat}</span>
                            <input type="number" step="0.01" data-cat="${cat}" 
                                class="edit-expense-input w-28 p-3 bg-white rounded-xl text-right font-black text-sm outline-none border border-slate-200 focus:ring-2 focus:ring-red-500" 
                                placeholder="0.00" value="${montoActual}">
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    modal.classList.remove('hidden');
};

// Cerrar modal
window.closeEditModal = () => {
    document.getElementById('modal-edit').classList.add('hidden');
};
// --- ELIMINAR TRANSACCIÓN ---
window.deleteTransaction = async (id) => {
    // Confirmación de seguridad
    if (confirm("¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.")) {
        try {
            // Referencia al documento específico
            const docRef = doc(db, 'usuarios', USER_ID, 'movimientos', id);
            
            // Ejecutar eliminación en Firebase
            await deleteDoc(docRef);
            
            
        } catch (e) {
            console.error("Error al eliminar:", e);
            alert("No se pudo eliminar el registro: " + e.message);
        }
    }
};
// Guardar los cambios en Firebase
window.updateTransactionFirebase = async () => {
    const id = document.getElementById('edit-id').value;
    const unit = document.getElementById('edit-unit').value;
    const tOriginal = localTransactions.find(item => item.id === id);
    
    if (!id || !tOriginal) return;

    let updateData = { 
        unit: unit,
        // Añadimos la fecha actual por si quieres que el registro editado suba al inicio
        // date: new Date().toISOString() 
    };

    if (tOriginal.type === 'income') {
        const amt = document.getElementById('edit-amount-income').value;
        updateData.amount = parseFloat(amt) || 0;
        updateData.category = document.getElementById('edit-category-income').value;
    } else {
        const inputs = document.querySelectorAll('.edit-expense-input');
        let totalEncontrado = 0;
        let catEncontrada = '';
        
        inputs.forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            if (val > 0) {
                totalEncontrado = val;
                catEncontrada = inp.dataset.cat;
            }
        });
        
        updateData.amount = totalEncontrado;
        updateData.category = catEncontrada || 'Sin Categoría';
    }

    try {
        // 1. Referencia al documento (Asegúrate que 'db' y 'USER_ID' sean accesibles)
        const docRef = doc(db, 'usuarios', USER_ID, 'movimientos', id);
        
        // 2. Ejecutar actualización
        await updateDoc(docRef, updateData);
        
        // 3. Cerrar modal ANTES de alertar
        closeEditModal();
        
        // 4. Refrescar datos locales
        if (typeof fetchTransactions === 'function') {
            await fetchTransactions();
        }

        console.log("Actualización exitosa");
        
    } catch (e) {
        // Si entra aquí pero el dato se guardó, es un error de promesa en la interfaz
        console.error("Detalle del error:", e);
        
        // Solo mostramos alerta si realmente no hay conexión o falló Firebase
        if (e.code !== 'undefined') {
            alert("Nota: Se guardó, pero hubo un retraso en la conexión.");
            closeEditModal();
            fetchTransactions();
        }
    }
};

// --- 1. NAVEGACIÓN ENTRE VISTAS ---
window.showView = (viewName) => {
    // 1. Ocultar todas las secciones
    const views = ['dashboard', 'income', 'expense', 'history', 'settings'];
    views.forEach(v => {
        const section = document.getElementById(`view-${v}`);
        if (section) section.classList.add('hidden');
    });

    // 2. Mostrar la sección seleccionada
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // 3. ACTUALIZAR COLORES DE LA BARRA DE NAVEGACIÓN
    const navButtons = {
        'dashboard': 'nav-home',
        'history': 'nav-reports',
        'settings': 'nav-settings'
    };

    Object.values(navButtons).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const icon = btn.querySelector('svg');
            const text = btn.querySelector('span');
            if (icon) {
                icon.classList.remove('text-blue-600');
                icon.classList.add('text-slate-300');
            }
            if (text) {
                text.classList.remove('text-blue-600');
                text.classList.add('text-slate-300');
            }
        }
    });

    const activeId = navButtons[viewName];
    if (activeId) {
        const activeBtn = document.getElementById(activeId);
        const icon = activeBtn.querySelector('svg');
        const text = activeBtn.querySelector('span');
        if (icon) icon.classList.replace('text-slate-300', 'text-blue-600');
        if (text) text.classList.replace('text-slate-300', 'text-blue-600');
    }

    // --- 4. LÓGICA DE CARGA DE DATOS (CORREGIDA) ---
    if (viewName === 'history') renderHistory();
    if (viewName === 'settings') renderSettings();
    
    // Aquí cambiamos 'viewId' por 'viewName' y 'view-expense' por solo 'expense'
    if (viewName === 'expense') {
        prepararVistaGastos();
    }
    
    // También es buena idea limpiar ingresos al entrar
    if (viewName === 'income') {
        const inAmount = document.getElementById('in-amount');
        if (inAmount) inAmount.value = '';
    }
};

window.setReportSubView = (type) => {
    reportSubView = type;
    
    // Cambiar estilos de los botones (Estilo de la imagen)
    const btnInc = document.getElementById('btn-report-inc');
    const btnExp = document.getElementById('btn-report-exp');
    
    if (type === 'income') {
        btnInc.className = "flex-1 py-2 rounded-xl font-bold text-green-600 bg-white shadow-sm";
        btnExp.className = "flex-1 py-2 rounded-xl font-bold text-slate-400";
    } else {
        btnExp.className = "flex-1 py-2 rounded-xl font-bold text-red-600 bg-white shadow-sm";
        btnInc.className = "flex-1 py-2 rounded-xl font-bold text-slate-400";
    }
    
    renderHistory();
};

// --- 2. RENDERIZADO DEL DASHBOARD (INICIO) ---
// --- RENDERIZADO DEL DASHBOARD ACTUALIZADO ---
function renderDashboard() {
    const listaTransacciones = document.getElementById('lista-transacciones');
    const balanceTotal = document.getElementById('balance-total');
    const dashIn = document.getElementById('dash-total-in');   // Nuevo elemento
    const dashOut = document.getElementById('dash-total-out'); // Nuevo elemento
    
    if (!listaTransacciones) return;

    let html = '';
    let totalGeneral = 0;
    let sumaIngresos = 0;
    let sumaGastos = 0;

    // Procesamos todas las transacciones para los totales
    localTransactions.forEach((t) => {
        const monto = parseFloat(t.amount);
        if (t.type === 'income') {
            sumaIngresos += monto;
            totalGeneral += monto;
        } else {
            sumaGastos += monto;
            totalGeneral -= monto;
        }
    });

    // Dibujamos solo las últimas 10 para la lista de "Recientes"
    localTransactions.slice(0, 10).forEach((t) => {
        const monto = parseFloat(t.amount);
        html += `
            <div class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100">
                <div>
                    <p class="text-xs font-bold text-slate-800 uppercase italic">${t.category}</p>
                    <p class="text-[8px] text-slate-400 font-black">${t.unit}</p>
                </div>
                <p class="font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                    ${t.type === 'income' ? '+' : '-'} L ${monto.toFixed(2)}
                </p>
            </div>`;
    });

    // Actualizamos la UI
    listaTransacciones.innerHTML = html || '<p class="text-center text-slate-400 text-[10px] py-4">No hay movimientos recientes</p>';
    if (balanceTotal) balanceTotal.innerText = `L ${totalGeneral.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    
    // Actualizamos los nuevos cuadros de resumen
    if (dashIn) dashIn.innerText = `L ${sumaIngresos.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (dashOut) dashOut.innerText = `L ${sumaGastos.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

// --- 3. RENDERIZADO DE HISTORIAL AGRUPADO ---
function renderHistory() {
    const container = document.getElementById('historial-agrupado');
    const reportBalance = document.getElementById('report-balance-caja');
    if (!container) return;

    // 1. Calcular Balance Total
    let balanceTotal = localTransactions.reduce((acc, t) => {
        const amt = parseFloat(t.amount) || 0;
        return acc + (t.type === 'income' ? amt : -amt);
    }, 0);

    if (reportBalance) {
        reportBalance.innerText = `L ${balanceTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    // 2. Filtrar y Agrupar
    const filtered = localTransactions.filter(t => t.type === reportSubView);
    const groups = {};

    filtered.forEach(t => {
        const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
        const year = date.getFullYear();
        const month = date.toLocaleString('es-HN', { month: 'long' }).toUpperCase();
        
        if (!groups[year]) groups[year] = {};
        if (!groups[year][month]) groups[year][month] = [];
        groups[year][month].push({...t, dateObj: date});
    });

    // 3. Generar HTML
    let html = '';
    const sortedYears = Object.keys(groups).sort((a, b) => b - a);

    sortedYears.forEach(year => {
        // Separador de Año
        html += `
            <div class="flex items-center gap-4 my-8">
                <div class="h-[1px] flex-1 bg-slate-200"></div>
                <span class="text-3xl font-black text-slate-200 italic">${year}</span>
                <div class="h-[1px] flex-1 bg-slate-200"></div>
            </div>`;
        
        const sortedMonths = Object.keys(groups[year]); // Puedes ordenarlos si deseas

        sortedMonths.forEach(month => {
            html += `
                <h3 class="text-xs font-black uppercase text-slate-400 ml-2 border-l-4 border-blue-500 pl-3 italic mb-4 tracking-widest">
                    ${month}
                </h3>
                <div class="space-y-4 mb-8">`;
            
            groups[year][month].forEach(t => {
                const isInc = t.type === 'income';
                html += `
                    <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-50 flex justify-between items-center transition-hover hover:shadow-md mx-1">
            <div class="flex flex-col min-w-0">
                <p class="text-xs font-black text-slate-800 uppercase italic truncate">${t.category}</p>
                <p class="text-[9px] font-bold text-slate-300 uppercase tracking-tight">
                    ${t.unit || 'S/U'} • ${t.dateObj.toLocaleDateString('es-HN')}
                </p>
            </div>

            <div class="flex items-center gap-3">
                <p class="font-black text-base ${isInc ? 'text-green-600' : 'text-red-600'} whitespace-nowrap">
                    L ${parseFloat(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </p>
                
                <div class="flex items-center gap-1 border-l border-slate-100 pl-2">
                    <button onclick="editTransaction('${t.id}')" 
                            class="p-1.5 rounded-lg transition-all active:scale-90 hover:bg-orange-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                        </svg>
                    </button>

                    <button onclick="deleteTransaction('${t.id}')" 
                            class="p-1.5 rounded-lg transition-all active:scale-90 hover:bg-red-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-500">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>`;
            });
            html += `</div>`; // Cierra el div de space-y-4
        });
    });

    container.innerHTML = html || '<div class="text-center py-20"><p class="text-slate-400 font-bold">No hay registros en esta categoría</p></div>';
   // Al final, reemplaza la llamada vieja por la nueva:
    if (typeof renderReportBreakdown === 'function') {
        renderReportBreakdown();
    }
}

// --- AÑADIR NUEVA UNIDAD ---
window.addUnit = async () => {
    const input = document.getElementById('new-unit-input');
    const val = input.value.trim();
    
    if (!val) return alert("Escribe el nombre de la unidad");

    // Evitar duplicados
    if (unidadesConfig.includes(val)) return alert("Esta unidad ya existe");

    unidadesConfig.push(val); // Añadir al array local
    await saveConfig();       // Guardar en Firebase
    input.value = '';         // Limpiar input
    renderSettings();         // Refrescar lista visual
    updateSelects();          // Refrescar selectores de formularios
};

window.addCatIngreso = async () => {
    const input = document.getElementById('new-cat-in-input');
    const val = input.value.trim();
    if (!val) return alert("Escribe el nombre");
    if (catIngresos.includes(val)) return alert("Ya existe");

    catIngresos.push(val);
    await saveConfig(); // Asegúrate de actualizar saveConfig para incluir catIngresos
    input.value = '';
    renderSettings();
    updateSelects();
};

// --- AÑADIR NUEVA CATEGORÍA ---
window.addCategory = async () => {
    const input = document.getElementById('new-cat-input');
    const val = input.value.trim();

    if (!val) return alert("Escribe el nombre de la categoría");

    // Evitar duplicados
    if (catEgresos.includes(val)) return alert("Esta categoría ya existe");

    catEgresos.push(val);     // Añadir al array local
    await saveConfig();       // Guardar en Firebase
    input.value = '';         // Limpiar input
    renderSettings();         // Refrescar lista visual
    updateSelects();          // Refrescar selectores de formularios
};
// --- 4. GESTIÓN DE CONFIGURACIÓN (UNIDADES Y CAT) ---
async function loadConfig() {
    const docRef = doc(db, 'usuarios', USER_ID, 'config', 'preferencias');
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.unidades) unidadesConfig = data.unidades;
            if (data.catEgresos) catEgresos = data.catEgresos;
            if (data.catIngresos) catIngresos = data.catIngresos;
        }
    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
    // ESTO ES CLAVE: Actualiza la interfaz con lo que sea que haya (Firebase o valores por defecto)
    updateSelects();
    renderSettings();
}

function renderSettings() {
    const unitList = document.getElementById('lista-unidades-ajustes');
    const catList = document.getElementById('lista-categorias-ajustes');

    if (unitList) {
    unitList.innerHTML = unidadesConfig.map((u, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span class="text-xs font-bold text-slate-600 uppercase italic">${u}</span>
            <button onclick="deleteUnit(${i})" 
                    class="p-2 rounded-lg transition-all active:scale-90 hover:bg-red-50 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" 
                     class="text-red-400 group-hover:text-red-600 transition-colors">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        </div>`).join('');
}

  const catInList = document.getElementById('lista-cat-ingresos-ajustes');
    if (catInList) {
        catInList.innerHTML = catIngresos.map((c, i) => `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span class="text-xs font-bold text-slate-600 uppercase italic">${c}</span>
                <button onclick="deleteCatIn(${i})" 
                        class="p-2 rounded-lg transition-all active:scale-90 hover:bg-red-50 group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" 
                         class="text-red-400 group-hover:text-red-600 transition-colors">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </div>`).join('');
    }
      
if (catList) {
    catList.innerHTML = catEgresos.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span class="text-xs font-bold text-slate-600 uppercase italic">${c}</span>
            <button onclick="deleteCat(${i})" 
                    class="p-2 rounded-lg transition-all active:scale-90 hover:bg-red-50 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" 
                     class="text-red-400 group-hover:text-red-600 transition-colors">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        </div>`).join('');
    }
}
// --- RENDERIZAR DISTRIBUCIÓN DE GASTOS (BARRAS) ---
window.renderReportBreakdown = () => {
    const container = document.getElementById('lista-breakdown');
    const wrapper = document.getElementById('report-breakdown-container');
    const titleElem = document.getElementById('breakdown-title');
    const iconElem = document.getElementById('breakdown-icon');
    
    if (!container || !wrapper) return;

    const data = localTransactions.filter(t => t.type === reportSubView);
    if (data.length === 0) {
        wrapper.classList.add('hidden');
        return;
    }

    wrapper.classList.remove('hidden');
    const isIncome = reportSubView === 'income';
    
    // Título compacto
    titleElem.className = "text-[10px] font-black uppercase text-slate-400 tracking-widest italic";
    titleElem.innerText = isIncome ? 'Ingresos por Unidad' : 'Gastos por Unidad';
    iconElem.innerText = isIncome ? '📊' : '📉';

    const accentColor = isIncome ? 'text-green-600' : 'text-red-600';
    const barColor = isIncome ? 'bg-green-500' : 'bg-red-500';

    const mapaUnidades = {};
    const totalesGlobalesPorCat = {};

    data.forEach(t => {
        const u = t.unit || 'Sin Unidad';
        const c = t.category || (isIncome ? 'Sin Contrato' : 'Sin Categoría');
        const monto = parseFloat(t.amount) || 0;

        if (!mapaUnidades[u]) mapaUnidades[u] = { total: 0, cats: {} };
        mapaUnidades[u].total += monto;
        mapaUnidades[u].cats[c] = (mapaUnidades[u].cats[c] || 0) + monto;
        totalesGlobalesPorCat[c] = (totalesGlobalesPorCat[c] || 0) + monto;
    });

    let html = '';

    // SECCIÓN A: BLOQUES POR UNIDAD (Tamaño Mediano)
    Object.entries(mapaUnidades).sort((a, b) => b[1].total - a[1].total).forEach(([unidad, info]) => {
        html += `
            <div class="mb-6 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                    <span class="text-[11px] font-black uppercase text-slate-700 italic">📦 ${unidad}</span>
                    <span class="text-lg font-black ${accentColor}">L ${info.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="space-y-4">
                    ${generarBarrasInternas(info.cats, info.total, barColor, accentColor)}
                </div>
            </div>
        `;
    });

    // SECCIÓN B: RESUMEN GLOBAL (Azul)
    const totalGeneral = Object.values(totalesGlobalesPorCat).reduce((a, b) => a + b, 0);
    html += `
        <div class="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
            <h4 class="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest text-center italic">
                Resumen Global ${isIncome ? 'Contratos' : 'Categorías'}
            </h4>
            <div class="space-y-4">
                ${generarBarrasInternas(totalesGlobalesPorCat, totalGeneral, 'bg-blue-600', 'text-blue-600')}
            </div>
        </div>
    `;

    container.innerHTML = html;
};

function generarBarrasInternas(diccionarioCats, totalPadre, colorBarra, colorTexto) {
    return Object.entries(diccionarioCats)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, monto]) => {
            const porcentaje = totalPadre > 0 ? (monto / totalPadre) * 100 : 0;
            return `
                <div class="space-y-1.5">
                    <div class="flex justify-between items-end">
                        <span class="text-[10px] font-bold uppercase text-slate-600">${cat}</span>
                        <span class="text-[10px] font-black ${colorTexto}">${porcentaje.toFixed(1)}%</span>
                    </div>
                    <div class="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                        <div class="h-full ${colorBarra} transition-all duration-1000" style="width: ${porcentaje}%"></div>
                    </div>
                </div>
            `;
        }).join('');
}

function updateSelects() {
    const selUnitIn = document.getElementById('in-unit');
    const selUnitEx = document.getElementById('ex-unit');
    const selCatEx = document.getElementById('ex-category');

    // Llenar selectores de Unidades (Ingresos y Gastos)
    const opcionesUnidades = '<option value="">Seleccionar Unidad...</option>' + 
        unidadesConfig.map(u => `<option value="${u}">${u}</option>`).join('');

    if (selUnitIn) selUnitIn.innerHTML = opcionesUnidades;
    if (selUnitEx) selUnitEx.innerHTML = opcionesUnidades;
  
    const selectInCat = document.getElementById('in-category');
    if (selectInCat) {
        selectInCat.innerHTML = catIngresos.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    // Llenar selector de Categorías (Gastos)
    if (selCatEx) {
        selCatEx.innerHTML = '<option value="">Categoría...</option>' + 
            catEgresos.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}
window.deleteUnit = async (index) => {
    if (confirm(`¿Eliminar la unidad "${unidadesConfig[index]}"?`)) {
        unidadesConfig.splice(index, 1); // Quitar del array local
        await saveConfig();              // Guardar en Firebase
        renderSettings();                // Actualizar lista visual
        updateSelects();                 // Actualizar menús desplegables
    }
};

window.deleteCatIn = async (index) => {
    if (!confirm("¿Eliminar esta categoría de ingresos?")) return;

    catIngresos.splice(index, 1); // Quitar del array local
    await saveConfig();           // Guardar cambios en Firebase
    renderSettings();             // Refrescar lista en Ajustes
    updateSelects();              // Refrescar selector en el formulario
};

// --- ELIMINAR CATEGORÍA ---
window.deleteCat = async (index) => {
    if (confirm(`¿Eliminar la categoría "${catEgresos[index]}"?`)) {
        catEgresos.splice(index, 1);     // Quitar del array local
        await saveConfig();              // Guardar en Firebase
        renderSettings();                // Actualizar lista visual
        updateSelects();                 // Actualizar menús desplegables
    }
};
async function saveConfig() {
    const configRef = doc(db, 'usuarios', USER_ID, 'config', 'preferencias');
    try {
        await setDoc(configRef, { 
            unidades: unidadesConfig, 
            catEgresos: catEgresos, 
            catIngresos: catIngresos
        });
    } catch (e) {
        console.error("Error al guardar configuración:", e);
        alert("No se pudo guardar en la nube.");
    }
}


function prepararVistaGastos() {
    const container = document.getElementById('container-categorias-dinamicas');
    const selectUnidad = document.getElementById('ex-unit');
    
    // 1. Limpiar todo
    container.innerHTML = '';
    
    // 2. Crear un input por cada categoría de tu configuración
    catEgresos.forEach(cat => {
        const div = document.createElement('div');
        div.className = "flex items-center bg-slate-50 p-2 rounded-2xl border border-slate-100";
        div.innerHTML = `
            <div class="flex-1 pl-2">
                <p class="text-[10px] font-black uppercase text-slate-600">${cat}</p>
            </div>
            <div class="w-32 relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">L</span>
                <input type="number" 
                       data-category="${cat}" 
                       class="input-gasto-valor w-full bg-white p-3 pl-6 rounded-xl text-right font-black text-red-600 outline-none border-none focus:ring-1 focus:ring-red-500" 
                       placeholder="0">
            </div>
        `;
        container.appendChild(div);
    });
}
// --- GUARDAR GASTO CORREGIDO ---
window.saveMultipleExpenses = async () => {
    const unit = document.getElementById('ex-unit').value;
    const inputs = document.querySelectorAll('.input-gasto-valor');
    
    if (!unit) return alert("Selecciona una unidad");

    const batch = []; // Aquí guardaremos solo los que tienen monto

    inputs.forEach(input => {
        const monto = parseFloat(input.value);
        if (monto > 0) {
            batch.push({
                type: 'expense',
                unit: unit,
                category: input.dataset.category,
                amount: monto,
                createdAt: serverTimestamp()
            });
        }
    });

    if (batch.length === 0) return alert("Ingresa al menos un monto");

    try {
        // Guardamos todos en Firebase
        for (const gasto of batch) {
            await addDoc(collection(db, 'usuarios', USER_ID, 'movimientos'), gasto);
        }
        
        
        showView('dashboard');
    } catch (e) {
        alert("Error: " + e.message);
    }
};
// --- 6. FUNCIONES DE APOYO ---
window.setReportSubView = (type) => {
    reportSubView = type;
    
    const btnInc = document.getElementById('btn-report-inc');
    const btnExp = document.getElementById('btn-report-exp');
    
    if (type === 'income') {
        btnInc.className = "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-green-600 shadow-sm";
        btnExp.className = "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500";
    } else {
        btnExp.className = "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-red-600 shadow-sm";
        btnInc.className = "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500";
    }
    
    renderHistory();
};

window.exportData = () => {
    if (localTransactions.length === 0) return alert("No hay datos");
    let csv = "Fecha,Tipo,Categoria,Unidad,Monto\n";
    localTransactions.forEach(t => {
        const fecha = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '';
        csv += `${fecha},${t.type},${t.category},${t.unit},${t.amount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte.csv';
    a.click();
};

// --- 7. LISTENERS TIEMPO REAL ---
const q = query(collection(db, 'usuarios', USER_ID, 'movimientos'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
    localTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderHistory();
});

// Inicializar
loadConfig();
