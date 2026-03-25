// js/burakoLogic.js

const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

let mazo = [];
let manoJugador1 = []; 
let pozo = [];
let descarte = []; // Ahora controlamos el descarte globalmente
let diccionarioFichas = {}; 

let roomCode = null;
let myRole = null; 
let myName = "";
let rivalName = "";
let turnoActual = null; // EL TURNERO

// 1. FABRICAR Y MEZCLAR FICHAS
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

// 2. RENDERIZADO VISUAL
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
        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));
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
        const ultimaFicha = descarte[descarte.length - 1]; // Muestra la de arriba de todo
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

// 3. SEGURIDAD DE TURNOS
function esMiTurno() {
    if (turnoActual !== myRole) {
        alert("¡Paciencia! Aún no es tu turno.");
        return false;
    }
    return true;
}

// 4. ACCIONES DEL JUEGO (ROBAR Y DESCARTAR CON FIREBASE)
document.getElementById('pozo')?.addEventListener('click', robarDelPozo);
document.getElementById('descarte')?.addEventListener('click', robarDelDescarte);
document.getElementById('btn-descartar')?.addEventListener('click', descartarFicha);

function robarDelPozo() {
    if (!esMiTurno()) return;
    if (pozo.length === 0) { alert("El pozo está vacío."); return; }

    const nuevaFicha = pozo.shift(); 
    manoJugador1.push(nuevaFicha);
    renderizarAtril();

    // Sincronizamos con la nube inmediatamente
    db.ref(`burako_salas/${roomCode}/fichas/pozo`).set(pozo);
    db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
}

// Regla oficial de Burako: podés llevarte todas las tiradas al descarte
function robarDelDescarte() {
    if (!esMiTurno()) return;
    if (descarte.length === 0) { alert("No hay nada en el descarte."); return; }

    manoJugador1.push(...descarte); // Agarra TODAS las fichas
    descarte = []; // Lo vacía
    
    renderizarAtril();
    renderizarDescarte();

    db.ref(`burako_salas/${roomCode}/fichas/descarte`).set(descarte);
    db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
}

function descartarFicha() {
    if (!esMiTurno()) return;
    if (fichasSeleccionadas.length !== 1) {
        alert("Selecciona EXACTAMENTE UNA ficha para terminar tu turno.");
        return;
    }

    const fichaADescartar = fichasSeleccionadas[0];
    manoJugador1 = manoJugador1.filter(f => f.id !== fichaADescartar.id);
    descarte.push(fichaADescartar); // Va a la pila global
    
    fichasSeleccionadas = [];
    renderizarAtril();
    renderizarDescarte();

    // Al descartar, le pasamos el turno al otro
    const proximoTurno = myRole === 'host' ? 'guest' : 'host';

    // Guardamos en la nube y pasamos el turno
    db.ref(`burako_salas/${roomCode}/fichas/descarte`).set(descarte);
    db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
    db.ref(`burako_salas/${roomCode}/turnoActual`).set(proximoTurno);
}


// ========================================================
// LOBBY Y MULTIJUGADOR FIREBASE
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
        listaUI.innerHTML = '<p style="color: #666; text-align: center; font-family: monospace;">Sin partidas activas. ¡Crea una!</p>';
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

    // DECIDIMOS QUIÉN EMPIEZA AL AZAR
    const primerTurno = Math.random() > 0.5 ? 'host' : 'guest';
    const metaPuntos = parseInt(document.getElementById('target-score').value);

    const salaRef = db.ref(`burako_salas/${roomCode}`);
    salaRef.set({
        hostName: myName,
        guestName: "",
        estado: "esperando",
        turnoActual: primerTurno, // Guardamos el turno en la nube
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

// EL MOTOR MULTIJUGADOR QUE ESCUCHA TODO
function escucharPartida() {
    db.ref(`burako_salas/${roomCode}`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert("La conexión con la sala se perdió.");
            location.reload();
            return;
        }

        // 1. DIBUJAR PUNTOS
        if (data.targetScore) document.getElementById('score-target').innerText = data.targetScore;
        if (data.scores) {
            document.getElementById('score-host').innerText = data.scores.host;
            document.getElementById('score-guest').innerText = data.scores.guest;
        }

        // 2. DESCUBRIR AL RIVAL
        if (myRole === 'host' && data.guestName !== "" && rivalName === "") {
            rivalName = data.guestName;
            document.querySelector('.atril-rival .nombre-jugador').innerText = `${rivalName} (11 fichas)`;
            db.ref(`burako_salas/${roomCode}`).onDisconnect().cancel();
        }

        // 3. ACTUALIZAR EL TURNERO VISUAL
        turnoActual = data.turnoActual;
        const nombreTurno = turnoActual === 'host' ? data.hostName : data.guestName;
        const indicadorUI = document.getElementById('turno-indicador');
        
        if (data.estado === "jugando" && indicadorUI) {
            if (turnoActual === myRole) {
                indicadorUI.innerText = "¡ES TU TURNO!";
                indicadorUI.style.color = "var(--neon-green)";
            } else {
                indicadorUI.innerText = `Turno de: ${nombreTurno || 'Rival'}`;
                indicadorUI.style.color = "#ff3333";
            }
        }

        // 4. DESCARGAR MIS FICHAS, EL POZO Y EL DESCARTE
        manoJugador1 = (myRole === 'host') ? (data.fichas?.host || []) : (data.fichas?.guest || []);
        pozo = data.fichas?.pozo || [];
        descarte = data.fichas?.descarte || [];

        renderizarAtril();
        renderizarDescarte();
    });
}