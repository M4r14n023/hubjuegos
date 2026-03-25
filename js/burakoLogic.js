// js/burakoLogic.js

const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

let mazo = [];
let manoJugador1 = []; 
let pozo = [];
let descarte = []; 
let diccionarioFichas = {}; 

let roomCode = null;
let myRole = null; 
let myName = "";
let rivalName = "";
let turnoActual = null; 
let faseTurno = 'robar'; // NUEVO: Controla si estamos en fase de robar o de jugar

// ========================================================
// 1. FABRICAR Y MEZCLAR FICHAS
// ========================================================
function generarFichas() {
    let nuevasFichas = [];
    let idCounter = 0; 
    for (let i = 0; i < 2; i++) {
        COLORES.forEach(color => {
            NUMEROS.forEach(numero => {
                let ficha = { id: `ficha-${idCounter++}`, numero: numero, color: color, esComodinReal: false };
                nuevasFichas.push(ficha);
                diccionarioFichas[ficha.id] = ficha; 
            });
        });
    }
    let comodin1 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    let comodin2 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    nuevasFichas.push(comodin1, comodin2);
    diccionarioFichas[comodin1.id] = comodin1; 
    diccionarioFichas[comodin2.id] = comodin2; 
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
// 2. RENDERIZADO VISUAL Y DRAG & DROP (ARRASTRAR)
// ========================================================
let fichasSeleccionadas = [];

function renderizarAtril() {
    const atrilUI = document.getElementById('mi-atril');
    if (!atrilUI) return; 
    atrilUI.innerHTML = ""; 
    
    manoJugador1.forEach(ficha => {
        const fichaDiv = document.createElement('div');
        fichaDiv.className = `ficha color-${ficha.color}`;
        fichaDiv.id = ficha.id;
        fichaDiv.innerText = ficha.esComodinReal ? "★" : ficha.numero;
        
        // Mantiene la selección normal (Clic)
        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));
        
        // Aplica los poderes de Arrastrar y Soltar
        aplicarArrastre(fichaDiv, ficha);
        
        atrilUI.appendChild(fichaDiv);
    });
}

function renderizarDescarte() {
    const descarteDiv = document.getElementById('descarte');
    if (!descarteDiv) return;
    descarteDiv.innerHTML = '';
    
    if (descarte.length === 0) {
        descarteDiv.classList.add('espacio-vacio');
        descarteDiv.innerText = "Descarte";
    } else {
        descarteDiv.classList.remove('espacio-vacio');
        const ultimaFicha = descarte[descarte.length - 1]; 
        const fichaDOM = document.createElement('div');
        fichaDOM.className = `ficha color-${ultimaFicha.color}`;
        fichaDOM.innerText = ultimaFicha.esComodinReal ? "★" : ultimaFicha.numero;
        descarteDiv.appendChild(fichaDOM);
    }
}

function toggleSeleccion(fichaObj, elementoFicha) {
    const estaEnMano = manoJugador1.some(f => f.id === fichaObj.id);
    if (!estaEnMano) return; 
    const index = fichasSeleccionadas.findIndex(f => f.id === fichaObj.id);
    if (index > -1) {
        fichasSeleccionadas.splice(index, 1);
        elementoFicha.classList.remove('seleccionada');
    } else {
        fichasSeleccionadas.push(fichaObj);
        elementoFicha.classList.add('seleccionada');
    }
}

// --- EL MOTOR DE ARRASTRE PARA PC Y CELULARES ---
function aplicarArrastre(fichaDiv, fichaObj) {
    // Para PC (Mouse)
    fichaDiv.draggable = true;
    fichaDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', fichaObj.id);
        setTimeout(() => fichaDiv.style.opacity = '0.5', 0);
    });
    fichaDiv.addEventListener('dragend', () => fichaDiv.style.opacity = '1');
    fichaDiv.addEventListener('dragover', (e) => e.preventDefault());
    fichaDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        const idArrastrada = e.dataTransfer.getData('text/plain');
        moverFichaEnAtril(idArrastrada, fichaObj.id);
    });

    // Para Celulares (Touch)
    fichaDiv.addEventListener('touchstart', (e) => {
        fichaDiv.dataset.dragging = "true";
    }, {passive: true});

    fichaDiv.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Evita que la pantalla haga scroll al arrastrar
        const touch = e.touches[0];
        fichaDiv.style.position = 'absolute';
        fichaDiv.style.left = (touch.pageX - 20) + 'px';
        fichaDiv.style.top = (touch.pageY - 30) + 'px';
        fichaDiv.style.zIndex = 1000;
    }, {passive: false});

    fichaDiv.addEventListener('touchend', (e) => {
        fichaDiv.dataset.dragging = "false";
        fichaDiv.style.position = ''; fichaDiv.style.left = ''; fichaDiv.style.top = ''; fichaDiv.style.zIndex = '';
        
        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (dropTarget && dropTarget.classList.contains('ficha') && dropTarget.id !== fichaObj.id) {
            moverFichaEnAtril(fichaObj.id, dropTarget.id);
        } else {
            renderizarAtril(); // Devuelve a su lugar si se suelta en el aire
        }
    });
}

function moverFichaEnAtril(idOrigen, idDestino) {
    if (idOrigen === idDestino) return;
    const indexOrigen = manoJugador1.findIndex(f => f.id === idOrigen);
    const indexDestino = manoJugador1.findIndex(f => f.id === idDestino);
    
    if (indexOrigen > -1 && indexDestino > -1) {
        const [fichaMovida] = manoJugador1.splice(indexOrigen, 1);
        manoJugador1.splice(indexDestino, 0, fichaMovida);
        renderizarAtril();
        
        // Guardamos el nuevo orden en Firebase silenciosamente
        db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
    }
}

// ========================================================
// 3. SEGURIDAD Y REGLAS DE TURNOS
// ========================================================
function esMiTurno() {
    if (turnoActual !== myRole) {
        alert("¡Paciencia! Aún no es tu turno.");
        return false;
    }
    return true;
}

// ========================================================
// 4. ACCIONES DEL JUEGO CON FIREBASE Y FASES
// ========================================================
document.getElementById('pozo')?.addEventListener('click', robarDelPozo);
document.getElementById('descarte')?.addEventListener('click', robarDelDescarte);
document.getElementById('btn-descartar')?.addEventListener('click', descartarFicha);
document.getElementById('btn-bajar-juego')?.addEventListener('click', bajarJuego);

function robarDelPozo() {
    if (!esMiTurno()) return;
    if (faseTurno !== 'robar') { 
        alert("Ya levantaste ficha. Ahora debes bajar juegos o terminar descartando."); 
        return; 
    }
    if (pozo.length === 0) { alert("El pozo está vacío."); return; }

    const nuevaFicha = pozo.shift(); 
    manoJugador1.push(nuevaFicha);
    renderizarAtril();

    // Sincronizamos nube y pasamos a fase jugar
    db.ref(`burako_salas/${roomCode}`).update({
        [`fichas/pozo`]: pozo,
        [`fichas/${myRole}`]: manoJugador1,
        faseTurno: 'jugar'
    });
}

function robarDelDescarte() {
    if (!esMiTurno()) return;
    if (faseTurno !== 'robar') { 
        alert("Ya levantaste ficha. Ahora debes bajar juegos o terminar descartando."); 
        return; 
    }
    if (descarte.length === 0) { alert("No hay nada en el descarte."); return; }

    manoJugador1.push(...descarte); 
    descarte = []; 
    
    renderizarAtril();
    renderizarDescarte();

    db.ref(`burako_salas/${roomCode}`).update({
        [`fichas/descarte`]: descarte,
        [`fichas/${myRole}`]: manoJugador1,
        faseTurno: 'jugar'
    });
}

function bajarJuego() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { 
        alert("¡Alto! Primero debes robar una ficha del pozo o del descarte."); 
        return; 
    }
    // ... [Aquí va tu lógica matemática de esJuegoValido que ya funciona perfecto. La simplificamos por espacio, pero es la misma que ya tenías] ...
    alert("Función Bajar Juego (Debes asegurarte de tener la lógica del juez matemático aquí).");
    // RECORDATORIO: Al final del bajarJuego real, tenés que hacer:
    // db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
}

function descartarFicha() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { 
        alert("¡Alto! Primero debes robar una ficha antes de descartar."); 
        return; 
    }
    if (fichasSeleccionadas.length !== 1) {
        alert("Selecciona EXACTAMENTE UNA ficha para terminar tu turno.");
        return;
    }

    const fichaADescartar = fichasSeleccionadas[0];
    manoJugador1 = manoJugador1.filter(f => f.id !== fichaADescartar.id);
    descarte.push(fichaADescartar); 
    
    fichasSeleccionadas = [];
    renderizarAtril();
    renderizarDescarte();

    const proximoTurno = myRole === 'host' ? 'guest' : 'host';

    // Guardamos en la nube, PASAMOS EL TURNO y reseteamos la fase a "robar" para el otro
    db.ref(`burako_salas/${roomCode}`).update({
        [`fichas/descarte`]: descarte,
        [`fichas/${myRole}`]: manoJugador1,
        turnoActual: proximoTurno,
        faseTurno: 'robar'
    });
}

// ========================================================
// 5. LOBBY Y MULTIJUGADOR FIREBASE
// ========================================================
const TIEMPO_EXPIRACION = 10 * 60 * 1000; 

db.ref('burako_salas').on('value', (snapshot) => {
    if (roomCode) return; 

    const salas = snapshot.val() || {};
    const listaUI = document.getElementById('rooms-list');
    if (!listaUI) return;
    
    listaUI.innerHTML = ""; 
    let salasDisponibles = 0;
    const ahora = Date.now();

    for (const [codigo, data] of Object.entries(salas)) {
        if (data.estado === "esperando" && (ahora - data.timestamp > TIEMPO_EXPIRACION)) {
            db.ref(`burako_salas/${codigo}`).remove();
            continue;
        }

        if (data.estado === "esperando") {
            salasDisponibles++;
            const btn = document.createElement('button');
            btn.className = "btn-success";
            btn.style.width = "100%";
            btn.style.marginBottom = "10px";
            btn.innerText = `Unirse a ${data.hostName}`;
            btn.onclick = () => unirseASala(codigo, data);
            listaUI.appendChild(btn);
        }
    }
    
    if (salasDisponibles === 0) {
        listaUI.innerHTML = '<p style="color: #666; text-align: center;">Sin partidas activas. ¡Crea una!</p>';
    }
});

// HOST CREA SALA
document.getElementById('btn-crear-sala')?.addEventListener('click', () => {
    const inputName = document.getElementById('my-name');
    myName = inputName.value.trim();
    if (!myName) { alert("Ingresa tu nombre."); return; }
    
    myRole = 'host';
    roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 

    const fichasOrdenadas = generarFichas();
    mazo = mezclar(fichasOrdenadas);
    
    const manoH = mazo.splice(0, 11);
    const manoG = mazo.splice(0, 11);
    const m1 = mazo.splice(0, 11);
    const m2 = mazo.splice(0, 11);
    pozo = [...mazo];

    const primerTurno = Math.random() > 0.5 ? 'host' : 'guest';
    const targetEl = document.getElementById('target-score');
    const metaPuntos = targetEl ? parseInt(targetEl.value) : 3000;

    const salaRef = db.ref(`burako_salas/${roomCode}`);
    salaRef.set({
        hostName: myName,
        guestName: "",
        estado: "esperando",
        turnoActual: primerTurno, 
        faseTurno: 'robar', // Inicializamos la fase
        targetScore: metaPuntos, 
        scores: { host: 0, guest: 0 }, 
        timestamp: Date.now(),
        fichas: { host: manoH, guest: manoG, muerto1: m1, muerto2: m2, pozo: pozo, descarte: [] },
        mesa: [] 
    });

    salaRef.onDisconnect().remove();
    manoJugador1 = manoH;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('mesa-burako').classList.remove('hidden');
    document.querySelector('.nombre-jugador').innerText = `${myName} (Tú)`;
    
    renderizarAtril();
    escucharPartida(); 
});

// INVITADO SE UNE
function unirseASala(codigo, data) {
    const inputName = document.getElementById('my-name');
    myName = inputName.value.trim();
    if (!myName) { alert("Ingresa tu nombre."); return; }

    myRole = 'guest';
    roomCode = codigo;
    rivalName = data.hostName;

    db.ref(`burako_salas/${roomCode}`).update({ guestName: myName, estado: "jugando" });

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('mesa-burako').classList.remove('hidden');
    
    document.querySelector('.nombre-jugador').innerText = `${myName} (Tú)`;
    document.querySelector('.atril-rival .nombre-jugador').innerText = `${rivalName} (11 fichas)`;
    
    escucharPartida(); 
}

// MOTOR DE SINCRONIZACIÓN MAESTRO
function escucharPartida() {
    db.ref(`burako_salas/${roomCode}`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Marcadores
        if (data.targetScore) {
            const el = document.getElementById('score-target');
            if (el) el.innerText = data.targetScore;
        }
        if (data.scores) {
            const sh = document.getElementById('score-host');
            const sg = document.getElementById('score-guest');
            if (sh) sh.innerText = data.scores.host;
            if (sg) sg.innerText = data.scores.guest;
        }

        if (myRole === 'host' && data.guestName !== "" && rivalName === "") {
            rivalName = data.guestName;
            document.querySelector('.atril-rival .nombre-jugador').innerText = `${rivalName} (11 fichas)`;
            db.ref(`burako_salas/${roomCode}`).onDisconnect().cancel();
        }

        // --- ACTUALIZADOR DEL TURNERO ---
        turnoActual = data.turnoActual;
        faseTurno = data.faseTurno || 'robar';
        
        const nombreTurno = turnoActual === 'host' ? data.hostName : data.guestName;
        const indicadorUI = document.getElementById('turno-indicador');
        
        if (data.estado === "jugando" && indicadorUI) {
            if (turnoActual === myRole) {
                if (faseTurno === 'robar') {
                    indicadorUI.innerText = "¡TU TURNO! (1. Roba una ficha)";
                    indicadorUI.style.color = "var(--neon-green)";
                } else {
                    indicadorUI.innerText = "¡TU TURNO! (2. Baja o Descarta)";
                    indicadorUI.style.color = "var(--neon-gold)";
                }
            } else {
                indicadorUI.innerText = `Turno de: ${nombreTurno || 'Rival'}`;
                indicadorUI.style.color = "#ff3333";
            }
        }

        // Descarga de datos
        manoJugador1 = (myRole === 'host') ? (data.fichas?.host || []) : (data.fichas?.guest || []);
        pozo = data.fichas?.pozo || [];
        descarte = data.fichas?.descarte || [];

        renderizarAtril();
        renderizarDescarte();
    });
}