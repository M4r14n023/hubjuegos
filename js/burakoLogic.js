// js/burakoLogic.js

const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

let mazo = []; let manoJugador1 = []; let pozo = []; let descarte = []; 
let mesaMia = []; let mesaRival = []; let muertoMio = [];
let estadoMuertos = { host: false, guest: false };
let diccionarioFichas = {}; 

let roomCode = null; let myRole = null; let myName = ""; let rivalName = "";
let turnoActual = null; let faseTurno = 'robar'; 

// ========================================================
// 1. FABRICAR Y MEZCLAR FICHAS
// ========================================================
function generarFichas() {
    let nuevasFichas = []; let idCounter = 0; 
    for (let i = 0; i < 2; i++) {
        COLORES.forEach(color => {
            NUMEROS.forEach(numero => {
                let ficha = { id: `ficha-${idCounter++}`, numero: numero, color: color, esComodinReal: false };
                nuevasFichas.push(ficha); diccionarioFichas[ficha.id] = ficha; 
            });
        });
    }
    let comodin1 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    let comodin2 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    nuevasFichas.push(comodin1, comodin2);
    diccionarioFichas[comodin1.id] = comodin1; diccionarioFichas[comodin2.id] = comodin2; 
    return nuevasFichas;
}

function mezclar(array) {
    let arrayMezclado = [...array];
    for (let i = arrayMezclado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayMezclado[i], arrayMezclado[j]] = [arrayMezclado[j], arrayMezclado[i]];
    }
    return arrayMezclado;
}

// ========================================================
// 2. RENDERIZADO VISUAL Y ARRASTRE UNIFICADO
// ========================================================
let fichasSeleccionadas = [];

function renderizarAtril() {
    const atrilUI = document.getElementById('mi-atril');
    if (!atrilUI) return; 
    atrilUI.innerHTML = ""; 
    
    manoJugador1.forEach(ficha => {
        const fichaDiv = document.createElement('div');
        fichaDiv.className = `ficha color-${ficha.color}`; fichaDiv.id = ficha.id;
        fichaDiv.innerText = ficha.esComodinReal ? "★" : ficha.numero;
        if (fichasSeleccionadas.some(f => f.id === ficha.id)) fichaDiv.classList.add('seleccionada');
        
        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));
        aplicarArrastre(fichaDiv, ficha, 'mano', null); // Habilitamos mover en mano
        atrilUI.appendChild(fichaDiv);
    });
}

function renderizarDescarte() {
    const descarteDiv = document.getElementById('descarte');
    if (!descarteDiv) return;
    descarteDiv.innerHTML = '';
    
    if (descarte.length === 0) {
        descarteDiv.classList.add('espacio-vacio'); descarteDiv.innerText = "Descarte";
    } else {
        descarteDiv.classList.remove('espacio-vacio');
        const ultimaFicha = descarte[descarte.length - 1]; 
        const fichaDOM = document.createElement('div');
        fichaDOM.className = `ficha color-${ultimaFicha.color}`;
        fichaDOM.innerText = ultimaFicha.esComodinReal ? "★" : ultimaFicha.numero;
        descarteDiv.appendChild(fichaDOM);
    }
}

function renderizarMesas() {
    const divMisJuegos = document.getElementById('mis-juegos');
    if (divMisJuegos) {
        divMisJuegos.innerHTML = '<p style="color: var(--neon-green); text-align: center; font-size: 0.8rem; margin-bottom: 10px;">[ MIS JUEGOS ]</p>';
        mesaMia.forEach((grupo, index) => {
            const nuevoJuego = document.createElement('div'); nuevoJuego.className = 'juego-en-mesa';
            nuevoJuego.addEventListener('click', (e) => {
                // Si tocamos el contenedor (y no una ficha para arrastrar), intentamos agregar
                if(e.target === nuevoJuego) intentarAgregarFichas(index);
            }); 
            
            grupo.forEach(fichaObj => {
                const fichaDOM = document.createElement('div');
                fichaDOM.className = `ficha color-${fichaObj.color}`; fichaDOM.id = fichaObj.id;
                fichaDOM.innerText = fichaObj.esComodinReal ? "★" : fichaObj.numero;
                
                // Habilitamos mover fichas DENTRO de mis juegos bajados
                aplicarArrastre(fichaDOM, fichaObj, 'mesa', index);
                
                nuevoJuego.appendChild(fichaDOM);
            });
            divMisJuegos.appendChild(nuevoJuego);
        });
    }

    const divRival = document.getElementById('juegos-rival');
    if (divRival) {
        divRival.innerHTML = '<p style="color: #ff3333; text-align: center; font-size: 0.8rem; margin-bottom: 10px;">[ JUEGOS RIVAL ]</p>';
        mesaRival.forEach((grupo) => {
            const nuevoJuego = document.createElement('div'); nuevoJuego.className = 'juego-en-mesa';
            grupo.forEach(fichaObj => {
                const fichaDOM = document.createElement('div');
                fichaDOM.className = `ficha color-${fichaObj.color}`;
                fichaDOM.innerText = fichaObj.esComodinReal ? "★" : fichaObj.numero;
                nuevoJuego.appendChild(fichaDOM);
            });
            divRival.appendChild(nuevoJuego);
        });
    }
}

function toggleSeleccion(fichaObj, elementoFicha) {
    const estaEnMano = manoJugador1.some(f => f.id === fichaObj.id);
    if (!estaEnMano) return; 
    const index = fichasSeleccionadas.findIndex(f => f.id === fichaObj.id);
    if (index > -1) {
        fichasSeleccionadas.splice(index, 1); elementoFicha.classList.remove('seleccionada');
    } else {
        fichasSeleccionadas.push(fichaObj); elementoFicha.classList.add('seleccionada');
    }
}

// --- MOTOR DE ARRASTRE UNIFICADO (ATRIL Y MESA) ---
let draggedFichaId = null;

function aplicarArrastre(fichaDiv, fichaObj, zona, indexGrupo) {
    fichaDiv.dataset.zona = zona;
    fichaDiv.dataset.index = indexGrupo;

    // EVENTOS PC
    fichaDiv.draggable = true;
    fichaDiv.addEventListener('dragstart', (e) => {
        draggedFichaId = fichaObj.id;
        e.dataTransfer.setData('text/plain', JSON.stringify({id: fichaObj.id, zona: zona, index: indexGrupo}));
        setTimeout(() => fichaDiv.style.opacity = '0.5', 0);
    });
    fichaDiv.addEventListener('dragend', () => { fichaDiv.style.opacity = '1'; draggedFichaId = null; });
    fichaDiv.addEventListener('dragover', (e) => e.preventDefault());
    fichaDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        procesarMovimiento(data.id, data.zona, data.index, fichaObj.id, zona, indexGrupo);
    });

    // EVENTOS CELULAR (Táctil Mejorado)
    fichaDiv.addEventListener('touchstart', (e) => { draggedFichaId = fichaObj.id; fichaDiv.dataset.dragging = "true"; }, {passive: true});
    fichaDiv.addEventListener('touchmove', (e) => {
        if (!draggedFichaId) return;
        e.preventDefault(); 
        const touch = e.touches[0];
        fichaDiv.style.position = 'fixed';
        fichaDiv.style.left = (touch.clientX - 20) + 'px'; fichaDiv.style.top = (touch.clientY - 30) + 'px';
        fichaDiv.style.zIndex = 1000;
        fichaDiv.style.pointerEvents = 'none'; // Clave para que el teléfono lea lo que hay debajo del dedo
    }, {passive: false});

    fichaDiv.addEventListener('touchend', (e) => {
        if (!draggedFichaId) return;
        fichaDiv.dataset.dragging = "false";
        fichaDiv.style.position = ''; fichaDiv.style.left = ''; fichaDiv.style.top = ''; 
        fichaDiv.style.zIndex = ''; fichaDiv.style.pointerEvents = 'auto'; 
        
        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (dropTarget && dropTarget.classList.contains('ficha') && dropTarget.id !== fichaObj.id) {
            const targetZona = dropTarget.dataset.zona;
            const targetIndex = dropTarget.dataset.index !== "null" ? parseInt(dropTarget.dataset.index) : null;
            procesarMovimiento(fichaObj.id, zona, indexGrupo, dropTarget.id, targetZona, targetIndex);
        } else {
            renderizarAtril(); renderizarMesas(); 
        }
        draggedFichaId = null;
    });
}

function procesarMovimiento(idOrigen, zonaOrigen, indexOrigen, idDestino, zonaDestino, indexDestino) {
    // Solo permitimos mover dentro de la misma zona y grupo (Mano -> Mano) o (Mesa1 -> Mesa1)
    if (zonaOrigen !== zonaDestino || indexOrigen !== indexDestino) return;

    let arrayFichas = zonaOrigen === 'mano' ? manoJugador1 : mesaMia[indexOrigen];
    const iOrigen = arrayFichas.findIndex(f => f.id === idOrigen);
    const iDestino = arrayFichas.findIndex(f => f.id === idDestino);
    
    if (iOrigen > -1 && iDestino > -1) {
        const [ficha] = arrayFichas.splice(iOrigen, 1);
        arrayFichas.splice(iDestino, 0, ficha);
        
        // Guardado silencioso
        if (zonaOrigen === 'mano') db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
        else db.ref(`burako_salas/${roomCode}/mesa/${myRole}`).set(mesaMia);
        
        renderizarAtril(); renderizarMesas();
    }
}

// ========================================================
// 3. JUEZ MATEMÁTICO AVANZADO Y EL MUERTO
// ========================================================
function esMiTurno() {
    if (turnoActual !== myRole) { alert("¡Paciencia! Aún no es tu turno."); return false; }
    return true;
}

function verificarMuerto() {
    if (manoJugador1.length === 0 && estadoMuertos[myRole] === false) {
        alert("¡TE HAS IDO AL MUERTO! 💀");
        manoJugador1 = [...muertoMio]; 
        estadoMuertos[myRole] = true;
        db.ref(`burako_salas/${roomCode}`).update({ [`fichas/${myRole}`]: manoJugador1, [`estadoMuertos/${myRole}`]: true });
        renderizarAtril();
    }
}

// Validador inteligente: Sabe diferenciar un 2 natural de un 2 comodín
function esJuegoValido(fichas) {
    if (fichas.length < 3) return false;

    let comodinesPuros = fichas.filter(f => f.color === 'comodin');
    if (comodinesPuros.length > 1) return false;

    // Chequeo de Pierna
    let sinComodines = fichas.filter(f => f.color !== 'comodin' && f.numero !== 2);
    if (fichas.every(f => f.numero === 2 && f.color !== 'comodin')) return true; // Pierna de 2s
    if (sinComodines.length > 0 && fichas.filter(f => f.color === 'comodin' || f.numero === 2).length <= 1) {
        if (sinComodines.every(f => f.numero === sinComodines[0].numero)) return true;
    }

    // Chequeo de Escalera
    let colorFichas = fichas.filter(f => f.color !== 'comodin');
    if (colorFichas.length === 0) return false;
    let colorEscalera = colorFichas[0].color;
    if (!colorFichas.every(f => f.color === colorEscalera)) return false; // Todos del mismo color

    // Escenario A: Los números 2 actúan como COMODINES
    let regA = fichas.filter(f => f.color !== 'comodin' && f.numero !== 2);
    let comA = fichas.filter(f => f.color === 'comodin' || f.numero === 2);
    
    // Escenario B: Los números 2 del MISMO COLOR actúan como NATURALES
    let regB = fichas.filter(f => f.color !== 'comodin' && !(f.numero === 2 && f.color !== colorEscalera));
    let comB = fichas.filter(f => f.color === 'comodin' || (f.numero === 2 && f.color !== colorEscalera));

    function validarEscaleraMatematica(regs, coms) {
        if (coms.length > 1) return false;
        let nums = regs.map(f => f.numero);
        if (new Set(nums).size !== nums.length) return false; // Sin duplicados
        
        nums.sort((a,b) => a - b);
        let huecos = 0;
        for(let i=0; i<nums.length-1; i++) huecos += (nums[i+1] - nums[i] - 1);
        if (huecos <= coms.length) return true;

        // Comprobar con As (1) funcionando como 14
        if (nums.includes(1)) {
            let numsHigh = nums.map(n => n === 1 ? 14 : n).sort((a,b)=>a-b);
            huecos = 0;
            for(let i=0; i<numsHigh.length-1; i++) huecos += (numsHigh[i+1] - numsHigh[i] - 1);
            if (huecos <= coms.length) return true;
        }
        return false;
    }

    return validarEscaleraMatematica(regA, comA) || validarEscaleraMatematica(regB, comB);
}

function limpiarSeleccion() {
    fichasSeleccionadas.forEach(f => document.getElementById(f.id)?.classList.remove('seleccionada'));
    fichasSeleccionadas = [];
}

// ========================================================
// 4. ACCIONES DEL JUEGO CON FIREBASE
// ========================================================
document.getElementById('pozo')?.addEventListener('click', robarDelPozo);
document.getElementById('descarte')?.addEventListener('click', robarDelDescarte);
document.getElementById('btn-descartar')?.addEventListener('click', descartarFicha);
document.getElementById('btn-bajar-juego')?.addEventListener('click', bajarJuego);

function robarDelPozo() {
    if (!esMiTurno()) return;
    if (faseTurno !== 'robar') { alert("Ya robaste. Ahora baja juegos o descarta."); return; }
    if (pozo.length === 0) { alert("El pozo está vacío."); return; }

    manoJugador1.push(pozo.shift()); 
    limpiarSeleccion(); renderizarAtril();

    db.ref(`burako_salas/${roomCode}`).update({ 'fichas/pozo': pozo, [`fichas/${myRole}`]: manoJugador1, faseTurno: 'jugar' });
}

function robarDelDescarte() {
    if (!esMiTurno()) return;
    if (faseTurno !== 'robar') { alert("Ya robaste. Ahora baja juegos o descarta."); return; }
    if (descarte.length === 0) return;

    manoJugador1.push(...descarte); descarte = []; 
    limpiarSeleccion(); renderizarAtril(); renderizarDescarte();

    db.ref(`burako_salas/${roomCode}`).update({ 'fichas/descarte': descarte, [`fichas/${myRole}`]: manoJugador1, faseTurno: 'jugar' });
}

function bajarJuego() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { alert("Primero debes robar una ficha."); return; }
    if (fichasSeleccionadas.length < 3) { alert("Mínimo 3 fichas para un juego."); return; }
    
    if (!esJuegoValido(fichasSeleccionadas)) {
        alert("¡Jugada inválida! Recuerda: Piernas o Escaleras, y máximo 1 comodín.");
        limpiarSeleccion(); return;
    }

    // Orden inicial aproximado (luego el usuario lo acomoda arrastrando si quiere)
    fichasSeleccionadas.sort((a, b) => (a.numero === 1 ? 14 : a.numero) - (b.numero === 1 ? 14 : b.numero));
    
    fichasSeleccionadas.forEach(fichaObj => manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id));
    mesaMia.push([...fichasSeleccionadas]);
    fichasSeleccionadas = [];
    
    verificarMuerto(); 
    db.ref(`burako_salas/${roomCode}`).update({ [`mesa/${myRole}`]: mesaMia, [`fichas/${myRole}`]: manoJugador1 });
}

function intentarAgregarFichas(indexGrupo) {
    if (!esMiTurno() || faseTurno === 'robar') return;
    if (fichasSeleccionadas.length === 0) return;

    const combinacion = [...mesaMia[indexGrupo], ...fichasSeleccionadas];

    if (!esJuegoValido(combinacion)) {
        alert("Esas fichas rompen la regla del juego (recuerda que un juego solo admite 1 comodín).");
        limpiarSeleccion(); return;
    }

    fichasSeleccionadas.forEach(fichaObj => manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id));
    
    // Las nuevas fichas se agregan al final, el jugador luego las arrastra donde quiera
    mesaMia[indexGrupo] = combinacion;
    fichasSeleccionadas = [];
    verificarMuerto(); 

    db.ref(`burako_salas/${roomCode}`).update({ [`mesa/${myRole}`]: mesaMia, [`fichas/${myRole}`]: manoJugador1 });
}

function descartarFicha() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { alert("Primero debes robar una ficha."); return; }
    if (fichasSeleccionadas.length !== 1) { alert("Selecciona EXACTAMENTE UNA ficha para descartar."); return; }

    const fichaADescartar = fichasSeleccionadas[0];
    manoJugador1 = manoJugador1.filter(f => f.id !== fichaADescartar.id);
    descarte.push(fichaADescartar); 
    fichasSeleccionadas = [];
    
    verificarMuerto(); 
    const proximoTurno = myRole === 'host' ? 'guest' : 'host';

    db.ref(`burako_salas/${roomCode}`).update({
        'fichas/descarte': descarte, [`fichas/${myRole}`]: manoJugador1, turnoActual: proximoTurno, faseTurno: 'robar'
    });
}

// ========================================================
// 5. LOBBY Y MULTIJUGADOR FIREBASE
// ========================================================
const purificarArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
};

db.ref('burako_salas').on('value', (snapshot) => {
    if (roomCode) return; 
    const salas = snapshot.val() || {}; const listaUI = document.getElementById('rooms-list'); if (!listaUI) return;
    listaUI.innerHTML = ""; let salasDisponibles = 0; const ahora = Date.now();
    for (const [codigo, data] of Object.entries(salas)) {
        if (data.estado === "esperando" && (ahora - data.timestamp > 600000)) { db.ref(`burako_salas/${codigo}`).remove(); continue; }
        if (data.estado === "esperando") {
            salasDisponibles++; const btn = document.createElement('button');
            btn.className = "btn-success"; btn.style.width = "100%"; btn.style.marginBottom = "10px";
            btn.innerText = `Unirse a ${data.hostName}`; btn.onclick = () => unirseASala(codigo, data);
            listaUI.appendChild(btn);
        }
    }
    if (salasDisponibles === 0) listaUI.innerHTML = '<p style="color: #666; text-align: center;">Sin partidas activas. ¡Crea una!</p>';
});

document.getElementById('btn-crear-sala')?.addEventListener('click', () => {
    myName = document.getElementById('my-name').value.trim();
    if (!myName) { alert("Ingresa tu nombre."); return; }
    
    myRole = 'host'; roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 

    const fOrd = generarFichas(); mazo = mezclar(fOrd);
    const manoH = mazo.splice(0, 11); const manoG = mazo.splice(0, 11);
    const m1 = mazo.splice(0, 11); const m2 = mazo.splice(0, 11); pozo = [...mazo];

    const targetEl = document.getElementById('target-score');
    
    const salaRef = db.ref(`burako_salas/${roomCode}`);
    salaRef.set({
        hostName: myName, guestName: "", estado: "esperando",
        turnoActual: Math.random() > 0.5 ? 'host' : 'guest', faseTurno: 'robar', targetScore: targetEl ? parseInt(targetEl.value) : 3000, 
        scores: { host: 0, guest: 0 }, timestamp: Date.now(),
        fichas: { host: manoH, guest: manoG, muerto1: m1, muerto2: m2, pozo: pozo, descarte: [] },
        mesa: { host: [], guest: [] }, estadoMuertos: { host: false, guest: false }
    });

    salaRef.onDisconnect().remove();
    document.getElementById('start-screen').classList.add('hidden'); document.getElementById('mesa-burako').classList.remove('hidden');
    document.querySelector('.nombre-jugador').innerText = `${myName} (Tú)`;
    escucharPartida(); 
});

function unirseASala(codigo, data) {
    myName = document.getElementById('my-name').value.trim();
    if (!myName) { alert("Ingresa tu nombre."); return; }
    myRole = 'guest'; roomCode = codigo; rivalName = data.hostName;
    db.ref(`burako_salas/${roomCode}`).update({ guestName: myName, estado: "jugando" });
    document.getElementById('start-screen').classList.add('hidden'); document.getElementById('mesa-burako').classList.remove('hidden');
    document.querySelector('.nombre-jugador').innerText = `${myName} (Tú)`;
    escucharPartida(); 
}

function escucharPartida() {
    db.ref(`burako_salas/${roomCode}`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) { alert("Conexión perdida."); location.reload(); return; }

        if (myRole === 'host' && data.guestName !== "" && rivalName === "") {
            rivalName = data.guestName; db.ref(`burako_salas/${roomCode}`).onDisconnect().cancel();
        }

        turnoActual = data.turnoActual; faseTurno = data.faseTurno || 'robar';
        const indicadorUI = document.getElementById('turno-indicador');
        if (data.estado === "jugando" && indicadorUI) {
            if (turnoActual === myRole) {
                indicadorUI.innerText = faseTurno === 'robar' ? "¡TU TURNO! (1. Robar)" : "¡TU TURNO! (2. Bajar o Descartar)";
                indicadorUI.style.color = faseTurno === 'robar' ? "var(--neon-green)" : "var(--neon-gold)";
            } else {
                indicadorUI.innerText = `Turno de: ${turnoActual === 'host' ? data.hostName : data.guestName}`;
                indicadorUI.style.color = "#ff3333";
            }
        }

        estadoMuertos = data.estadoMuertos || { host: false, guest: false };
        manoJugador1 = myRole === 'host' ? purificarArray(data.fichas?.host) : purificarArray(data.fichas?.guest);
        pozo = purificarArray(data.fichas?.pozo); descarte = purificarArray(data.fichas?.descarte);
        muertoMio = myRole === 'host' ? purificarArray(data.fichas?.muerto1) : purificarArray(data.fichas?.muerto2);

        const mesaHostCruda = purificarArray(data.mesa?.host); const mesaGuestCruda = purificarArray(data.mesa?.guest);
        
        if (myRole === 'host') {
            mesaMia = mesaHostCruda.map(g => purificarArray(g)); mesaRival = mesaGuestCruda.map(g => purificarArray(g));
        } else {
            mesaMia = mesaGuestCruda.map(g => purificarArray(g)); mesaRival = mesaHostCruda.map(g => purificarArray(g));
        }

        const rivalRole = myRole === 'host' ? 'guest' : 'host';
        const rivalTomado = estadoMuertos[rivalRole] ? " [M💀]" : "";
        document.querySelector('.atril-rival .nombre-jugador').innerText = `${rivalName || 'Rival'} ${rivalTomado}`;

        renderizarAtril(); renderizarDescarte(); renderizarMesas();
    });
}