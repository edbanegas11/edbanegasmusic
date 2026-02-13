import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, 
    addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyD1TTVRTLRucgeDlr1Y_4u9wgliwCN394w",
    authDomain: "transportehub.firebaseapp.com",
    projectId: "transportehub",
    storageBucket: "transportehub.firebasestorage.app",
    messagingSenderId: "808325379323",
    appId: "1:808325379323:web:24df80a708e7b9bc396c5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const USER_ID = "usuario_principal";

// --- ESTADO LOCAL ---
let localTransactions = [];
let reportSubView = 'income';
let unidadesConfig = ['Hyundai County', 'Toyota Hiace'];
let catEgresos = ['Combustible', 'Sueldos y Viáticos', 'Repuestos', 'Mantenimiento', 'Gastos de Operaciones'];

// Abrir el modal con los datos actuales
window.editTransaction = (id, amount, category, unit, type) => {
    const modal = document.getElementById('modal-edit');
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-amount').value = amount;
    
    // Llenar select de unidades del modal
    const editUnitSel = document.getElementById('edit-unit');
    editUnitSel.innerHTML = unidadesConfig.map(u => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('');

    // Preparar el campo de categoría (Select para gastos, Textarea para ingresos)
    const catContainer = document.getElementById('edit-cat-container');
    if (type === 'expense') {
        catContainer.innerHTML = `<select id="edit-category" class="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none">
            ${catEgresos.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>`;
    } else {
        catContainer.innerHTML = `<textarea id="edit-category" class="w-full p-4 bg-slate-50 rounded-2xl text-sm h-24 outline-none">${category}</textarea>`;
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
            
            alert("Movimiento eliminado correctamente. 🗑️");
        } catch (e) {
            console.error("Error al eliminar:", e);
            alert("No se pudo eliminar el registro: " + e.message);
        }
    }
};
// Guardar los cambios en Firebase
window.updateTransactionFirebase = async () => {
    const id = document.getElementById('edit-id').value;
    const amount = document.getElementById('edit-amount').value;
    const unit = document.getElementById('edit-unit').value;
    const category = document.getElementById('edit-category').value;

    if (!amount || !category) return alert("Completa todos los campos");

    try {
        const docRef = doc(db, 'usuarios', USER_ID, 'movimientos', id);
        await updateDoc(docRef, {
            amount: parseFloat(amount),
            unit: unit,
            category: category
        });
        
        closeEditModal();
        alert("¡Actualizado con éxito! ✅");
    } catch (e) {
        alert("Error al guardar cambios: " + e.message);
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
    
    // CONFIGURACIÓN DINÁMICA
    titleElem.innerText = isIncome ? 'Distribución por Unidad' : 'Distribución por Categoría';
    iconElem.innerText = isIncome ? '🏢' : '🏷️';
    const barColor = isIncome ? 'bg-green-500' : 'bg-red-500';
    const textColor = isIncome ? 'text-green-600' : 'text-red-600';

    const totals = {};
    let totalGeneral = 0;

    data.forEach(t => {
        // AQUÍ ESTÁ EL TRUCO:
        // Si es ingreso usa 'unit', si es gasto usa 'category'
        const clave = isIncome ? (t.unit || 'Sin Unidad') : (t.category || 'Sin Categoría');
        
        const monto = parseFloat(t.amount) || 0;
        totals[clave] = (totals[clave] || 0) + monto;
        totalGeneral += monto;
    });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    let html = '';
    sorted.forEach(([label, monto]) => {
        const porcentaje = totalGeneral > 0 ? (monto / totalGeneral) * 100 : 0;
        
        html += `
            <div class="space-y-1">
                <div class="flex justify-between text-[10px] font-black uppercase italic tracking-tighter">
                    <span class="text-slate-700">${label}</span>
                    <span class="${textColor}">L ${monto.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full ${barColor} rounded-full transition-all duration-1000" 
                         style="width: ${porcentaje}%"></div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
};

function updateSelects() {
    const selUnitIn = document.getElementById('in-unit');
    const selUnitEx = document.getElementById('ex-unit');
    const selCatEx = document.getElementById('ex-category');

    // Llenar selectores de Unidades (Ingresos y Gastos)
    const opcionesUnidades = '<option value="">Seleccionar Unidad...</option>' + 
        unidadesConfig.map(u => `<option value="${u}">${u}</option>`).join('');

    if (selUnitIn) selUnitIn.innerHTML = opcionesUnidades;
    if (selUnitEx) selUnitEx.innerHTML = opcionesUnidades;

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
            catEgresos: catEgresos 
        });
    } catch (e) {
        console.error("Error al guardar configuración:", e);
        alert("No se pudo guardar en la nube.");
    }
}
// --- 5. ACCIONES DE FIREBASE ---
window.saveIncome = async () => {
    // 1. Referencias a los elementos del DOM
    const elAmount = document.getElementById('in-amount');
    const elUnit = document.getElementById('in-unit');
    // Si tienes un campo de "Detalles" o "Notas", agrégalo aquí:
    const elDetails = document.getElementById('in-details'); 

    if (!elAmount.value || !elUnit.value) return alert("Faltan datos");

    try {
        await addDoc(collection(db, 'usuarios', USER_ID, 'movimientos'), {
            type: 'income',
            amount: parseFloat(elAmount.value),
            category: 'Viaje/Servicio',
            unit: elUnit.value,
            // Guardamos detalles si existen, si no, vacío
            details: elDetails ? elDetails.value : '', 
            createdAt: serverTimestamp()
        });

        // --- LIMPIEZA TOTAL PARA EL PRÓXIMO VIAJE ---
        elAmount.value = '';        
        elUnit.selectedIndex = 0;   
        
        if (elDetails) elDetails.value = ''; // ¡Limpiamos los detalles!

        alert("Ingreso guardado con éxito");
        
        // Refrescamos los datos locales para que el desglose sea real
        if (typeof fetchTransactions === 'function') {
            await fetchTransactions(); 
        }

        showView('history'); 
    } catch (e) { 
        console.error(e); 
        alert("Error al guardar");
    }
};
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
        
        alert("Gastos registrados!");
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
window.addEventListener('beforeunload', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
});

// --- 7. LISTENERS TIEMPO REAL ---
const q = query(collection(db, 'usuarios', USER_ID, 'movimientos'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
    localTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderHistory();
});

// Inicializar
loadConfig();
