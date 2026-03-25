// js/burakoLogic.js

const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

let mazo = [];
let manoJugador1 = []; 
let pozo = [];
let descarte = []; 

// Ahora las mesas y los muertos están separados
let mesaMia = []; 
let mesaRival = [];
let muertoMio = [];
let estadoMuertos = { host: false, guest: false };
let diccionarioFichas = {}; 

let roomCode = null;
let myRole = null; 
let myName = "";
let rivalName = "";
let turnoActual = null; 
let faseTurno = 'robar'; 

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
// 2. RENDERIZADO VISUAL, ARRASTRE Y SELECCIÓN
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
        
        if (fichasSeleccionadas.some(f => f.id === ficha.id)) {
            fichaDiv.classList.add('seleccionada');
        }
        
        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));
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

function renderizarMesas() {
    // Mi mesa
    const divMisJuegos = document.getElementById('mis-juegos');
    if (divMisJuegos) {
        divMisJuegos.innerHTML = '<p style="color: var(--neon-green); text-align: center; font-size: 0.8rem; margin-bottom: 10px;">[ MIS JUEGOS ]</p>';
        mesaMia.forEach((grupo, index) => {
            const nuevoJuego = document.createElement('div');
            nuevoJuego.className = 'juego-en-mesa';
            nuevoJuego.addEventListener('click', () => intentarAgregarFichas(index)); // Solo puedo agregar a MIS juegos
            grupo.forEach(fichaObj => {
                const fichaDOM = document.createElement('div');
                fichaDOM.className = `ficha color-${fichaObj.color}`;
                fichaDOM.innerText = fichaObj.esComodinReal ? "★" : fichaObj.numero;
                nuevoJuego.appendChild(fichaDOM);
            });
            divMisJuegos.appendChild(nuevoJuego);
        });
    }

    // Mesa del Rival
    const divRival = document.getElementById('juegos-rival');
    if (divRival) {
        divRival.innerHTML = '<p style="color: #ff3333; text-align: center; font-size: 0.8rem; margin-bottom: 10px;">[ JUEGOS RIVAL ]</p>';
        mesaRival.forEach((grupo) => {
            const nuevoJuego = document.createElement('div');
            nuevoJuego.className = 'juego-en-mesa';
            // Al rival no se le pueden agregar fichas, así que no tiene evento click
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
        fichasSeleccionadas.splice(index, 1);
        elementoFicha.classList.remove('seleccionada');
    } else {
        fichasSeleccionadas.push(fichaObj);
        elementoFicha.classList.add('seleccionada');
    }
}

// EL TRUCO PARA CELULARES: pointerEvents = 'none'
function aplicarArrastre(fichaDiv, fichaObj) {
    // PC
    fichaDiv.draggable = true;
    fichaDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', fichaObj.id);
        setTimeout(() => fichaDiv.style.opacity = '0.5', 0);
    });
    fichaDiv.addEventListener('dragend', () => fichaDiv.style.opacity = '1');
    fichaDiv.addEventListener('dragover', (e) => e.preventDefault());
    fichaDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        moverFichaEnAtril(e.dataTransfer.getData('text/plain'), fichaObj.id);
    });

    // Celular
    fichaDiv.addEventListener('touchstart', (e) => {}, {passive: true});
    fichaDiv.addEventListener('touchmove', (e) => {
        e.preventDefault(); 
        const touch = e.touches[0];
        fichaDiv.style.position = 'fixed'; // Fixed funciona mejor para drag
        fichaDiv.style.left = (touch.clientX - 20) + 'px';
        fichaDiv.style.top = (touch.clientY - 30) + 'px';
        fichaDiv.style.zIndex = 1000;
        fichaDiv.style.pointerEvents = 'none'; // CRUCIAL para que el sensor "vea" lo que hay abajo
    }, {passive: false});

    fichaDiv.addEventListener('touchend', (e) => {
        fichaDiv.style.position = ''; fichaDiv.style.left = ''; fichaDiv.style.top = ''; 
        fichaDiv.style.zIndex = ''; fichaDiv.style.pointerEvents = 'auto'; // Restauramos
        
        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (dropTarget && dropTarget.classList.contains('ficha') && dropTarget.id !== fichaObj.id) {
            moverFichaEnAtril(fichaObj.id, dropTarget.id);
        } else {
            renderizarAtril(); 
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
        db.ref(`burako_salas/${roomCode}/fichas/${myRole}`).set(manoJugador1);
    }
}

// ========================================================
// 3. JUEZ MATEMÁTICO Y EL MUERTO
// ========================================================
function esMiTurno() {
    if (turnoActual !== myRole) { alert("¡Paciencia! Aún no es tu turno."); return false; }
    return true;
}

function verificarMuerto() {
    // Si me quedo sin fichas y todavía no usé el muerto
    if (manoJugador1.length === 0 && estadoMuertos[myRole] === false) {
        alert("¡TE HAS IDO AL MUERTO! 💀");
        manoJugador1 = [...muertoMio]; // Agarramos las 11 de reserva
        estadoMuertos[myRole] = true;
        
        db.ref(`burako_salas/${roomCode}`).update({
            [`fichas/${myRole}`]: manoJugador1,
            [`estadoMuertos/${myRole}`]: true
        });
        renderizarAtril();
    }
}

function esJuegoValido(fichas) {
    if (fichas.length < 3) return false;
    const comodines = fichas.filter(f => f.color === 'comodin' || f.numero === 2);
    const regulares = fichas.filter(f => f.color !== 'comodin' && f.numero !== 2);

    if (regulares.length === 0) return false;
    if (comodines.length > 1) return false; 

    const esPierna = regulares.every(f => f.numero === regulares[0].numero);
    if (esPierna) return true;

    const mismoColor = regulares.every(f => f.color === regulares[0].color);
    if (!mismoColor) return false;

    const numeros = regulares.map(f => f.numero);
    if (new Set(numeros).size !== numeros.length) return false;

    function comprobarHuecos(arr) {
        arr.sort((a, b) => a - b);
        let huecos = 0;
        for (let i = 0; i < arr.length - 1; i++) { huecos += (arr[i+1] - arr[i] - 1); }
        return huecos <= comodines.length;
    }

    if (comprobarHuecos([...numeros])) return true;
    if (numeros.includes(1)) {
        if (comprobarHuecos(numeros.map(n => n === 1 ? 14 : n))) return true;
    }
    return false;
}

function ordenarFichas(a, b) {
    let numA = a.numero === 1 ? 14 : a.numero; 
    let numB = b.numero === 1 ? 14 : b.numero;
    if(a.color === 'comodin') return 1; 
    if(b.color === 'comodin') return -1;
    return numA - numB;
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

    db.ref(`burako_salas/${roomCode}`).update({
        'fichas/pozo': pozo, [`fichas/${myRole}`]: manoJugador1, faseTurno: 'jugar'
    });
}

function robarDelDescarte() {
    if (!esMiTurno()) return;
    if (faseTurno !== 'robar') { alert("Ya robaste. Ahora baja juegos o descarta."); return; }
    if (descarte.length === 0) return;

    manoJugador1.push(...descarte); 
    descarte = []; 
    limpiarSeleccion(); renderizarAtril(); renderizarDescarte();

    db.ref(`burako_salas/${roomCode}`).update({
        'fichas/descarte': descarte, [`fichas/${myRole}`]: manoJugador1, faseTurno: 'jugar'
    });
}

function bajarJuego() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { alert("Primero debes robar una ficha."); return; }
    if (fichasSeleccionadas.length < 3) { alert("Mínimo 3 fichas para un juego."); return; }
    
    if (!esJuegoValido(fichasSeleccionadas)) {
        alert("¡Jugada inválida! Recuerda: Piernas o Escaleras, y máximo 1 comodín.");
        limpiarSeleccion(); return;
    }

    fichasSeleccionadas.sort(ordenarFichas);
    fichasSeleccionadas.forEach(fichaObj => {
        manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id);
    });

    mesaMia.push([...fichasSeleccionadas]);
    fichasSeleccionadas = [];
    
    verificarMuerto(); // Verificamos si bajando este juego te quedaste en 0

    db.ref(`burako_salas/${roomCode}`).update({
        [`mesa/${myRole}`]: mesaMia,
        [`fichas/${myRole}`]: manoJugador1
    });
}

function intentarAgregarFichas(indexGrupo) {
    if (!esMiTurno() || faseTurno === 'robar') return;
    if (fichasSeleccionadas.length === 0) return;

    const combinacion = [...mesaMia[indexGrupo], ...fichasSeleccionadas];

    if (!esJuegoValido(combinacion)) {
        alert("Esas fichas no encajan en este juego.");
        limpiarSeleccion(); return;
    }

    combinacion.sort(ordenarFichas);
    fichasSeleccionadas.forEach(fichaObj => {
        manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id);
    });

    mesaMia[indexGrupo] = combinacion;
    fichasSeleccionadas = [];

    verificarMuerto(); // Verificamos si te quedaste en 0

    db.ref(`burako_salas/${roomCode}`).update({
        [`mesa/${myRole}`]: mesaMia,
        [`fichas/${myRole}`]: manoJugador1
    });
}

function descartarFicha() {
    if (!esMiTurno()) return;
    if (faseTurno === 'robar') { alert("Primero debes robar una ficha."); return; }
    if (fichasSeleccionadas.length !== 1) { alert("Selecciona EXACTAMENTE UNA ficha para descartar."); return; }

    const fichaADescartar = fichasSeleccionadas[0];
    manoJugador1 = manoJugador1.filter(f => f.id !== fichaADescartar.id);
    descarte.push(fichaADescartar); 
    fichasSeleccionadas = [];
    
    verificarMuerto(); // Verificamos si te fuiste al muerto "con descarte"
    
    const proximoTurno = myRole === 'host' ? 'guest' : 'host';

    db.ref(`burako_salas/${roomCode}`).update({
        'fichas/descarte': descarte,
        [`fichas/${myRole}`]: manoJugador1,
        turnoActual: proximoTurno,
        faseTurno: 'robar'
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
    const salas = snapshot.val() || {};
    const listaUI = document.getElementById('rooms-list');
    if (!listaUI) return;
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
    const inputName = document.getElementById('my-name');
    myName = inputName.value.trim();
    if (!myName) { alert("Ingresa tu nombre."); return; }
    
    myRole = 'host'; roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 

    const fichasOrdenadas = generarFichas(); mazo = mezclar(fichasOrdenadas);
    const manoH = mazo.splice(0, 11); const manoG = mazo.splice(0, 11);
    const m1 = mazo.splice(0, 11); const m2 = mazo.splice(0, 11); pozo = [...mazo];

    const targetEl = document.getElementById('target-score');
    
    const salaRef = db.ref(`burako_salas/${roomCode}`);
    salaRef.set({
        hostName: myName, guestName: "", estado: "esperando",
        turnoActual: Math.random() > 0.5 ? 'host' : 'guest', faseTurno: 'robar', targetScore: targetEl ? parseInt(targetEl.value) : 3000, 
        scores: { host: 0, guest: 0 }, timestamp: Date.now(),
        fichas: { host: manoH, guest: manoG, muerto1: m1, muerto2: m2, pozo: pozo, descarte: [] },
        mesa: { host: [], guest: [] },
        estadoMuertos: { host: false, guest: false }
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

        // Descarga y asignación de variables
        estadoMuertos = data.estadoMuertos || { host: false, guest: false };
        manoJugador1 = myRole === 'host' ? purificarArray(data.fichas?.host) : purificarArray(data.fichas?.guest);
        pozo = purificarArray(data.fichas?.pozo);
        descarte = purificarArray(data.fichas?.descarte);
        
        muertoMio = myRole === 'host' ? purificarArray(data.fichas?.muerto1) : purificarArray(data.fichas?.muerto2);

        // Mesas separadas
        const mesaHostCruda = purificarArray(data.mesa?.host);
        const mesaGuestCruda = purificarArray(data.mesa?.guest);
        
        if (myRole === 'host') {
            mesaMia = mesaHostCruda.map(g => purificarArray(g));
            mesaRival = mesaGuestCruda.map(g => purificarArray(g));
        } else {
            mesaMia = mesaGuestCruda.map(g => purificarArray(g));
            mesaRival = mesaHostCruda.map(g => purificarArray(g));
        }

        // UI del Muerto del Rival
        const rivalRole = myRole === 'host' ? 'guest' : 'host';
        const rivalTomado = estadoMuertos[rivalRole] ? " [M💀]" : "";
        document.querySelector('.atril-rival .nombre-jugador').innerText = `${rivalName || 'Rival'} ${rivalTomado}`;

        renderizarAtril(); renderizarDescarte(); renderizarMesas();
    });
}