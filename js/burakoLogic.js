// js/burakoLogic.js

// --- CONFIGURACIÓN BASE DEL BURAKO ---
const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Variables globales de la mesa
let mazo = [];
let manoJugador1 = []; // Tu mano local
let manoJugador2 = [];
let muerto1 = [];
let muerto2 = [];
let pozo = [];
let diccionarioFichas = {}; // Nos servirá para reconocer las fichas que ya están en la mesa

// Variables multijugador
let roomCode = null;
let myRole = null; 
let myName = "";
let rivalName = "";

// ========================================================
// 1. FABRICAR Y MEZCLAR LAS FICHAS
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
// 2. RENDERIZAR LA INTERFAZ Y SELECCIÓN
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
        
        if (ficha.esComodinReal) {
            fichaDiv.innerText = "★";
        } else {
            fichaDiv.innerText = ficha.numero;
        }

        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));
        atrilUI.appendChild(fichaDiv);
    });
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

// ========================================================
// 3. ACCIONES DE JUEGO (Botones y Pozo)
// ========================================================
document.getElementById('btn-bajar-juego')?.addEventListener('click', bajarJuego);
document.getElementById('btn-descartar')?.addEventListener('click', descartarFicha);
document.getElementById('pozo')?.addEventListener('click', robarDelPozo);

function robarDelPozo() {
    if (pozo.length === 0) {
        alert("El pozo está vacío.");
        return;
    }
    const nuevaFicha = pozo.shift(); 
    manoJugador1.push(nuevaFicha);
    renderizarAtril();
}

function descartarFicha() {
    if (fichasSeleccionadas.length !== 1) {
        alert("Debes seleccionar EXACTAMENTE UNA ficha para descartar al pozo.");
        return;
    }

    const fichaADescartar = fichasSeleccionadas[0];
    manoJugador1 = manoJugador1.filter(f => f.id !== fichaADescartar.id);

    const descarteDiv = document.getElementById('descarte');
    descarteDiv.innerHTML = ''; 
    descarteDiv.classList.remove('espacio-vacio'); 

    const fichaDOM = document.getElementById(fichaADescartar.id);
    fichaDOM.classList.remove('seleccionada');
    fichaDOM.style.cursor = 'default'; 
    
    descarteDiv.appendChild(fichaDOM);
    fichasSeleccionadas = [];
    
    renderizarAtril();
}

// ========================================================
// 4. MOTOR MATEMÁTICO (JUEZ) Y BAJAR JUEGOS
// ========================================================
function esJuegoValido(fichas) {
    if (fichas.length < 3) return false;

    const comodines = fichas.filter(f => f.color === 'comodin' || f.numero === 2);
    const regulares = fichas.filter(f => f.color !== 'comodin' && f.numero !== 2);

    if (regulares.length === 0) return false;
    if (comodines.length > 1) return false; 

    // Chequeo Pierna
    const esPierna = regulares.every(f => f.numero === regulares[0].numero);
    if (esPierna) return true;

    // Chequeo Escalera
    const mismoColor = regulares.every(f => f.color === regulares[0].color);
    if (!mismoColor) return false;

    const numeros = regulares.map(f => f.numero);
    const setNumeros = new Set(numeros);
    if (setNumeros.size !== numeros.length) return false;

    function comprobarHuecos(arrayNumeros) {
        arrayNumeros.sort((a, b) => a - b);
        let huecosACompletar = 0;
        for (let i = 0; i < arrayNumeros.length - 1; i++) {
            huecosACompletar += (arrayNumeros[i+1] - arrayNumeros[i] - 1);
        }
        return huecosACompletar <= comodines.length;
    }

    if (comprobarHuecos([...numeros])) return true;
    if (numeros.includes(1)) {
        const numerosConAsAlto = numeros.map(n => n === 1 ? 14 : n);
        if (comprobarHuecos(numerosConAsAlto)) return true;
    }

    return false;
}

function bajarJuego() {
    if (fichasSeleccionadas.length < 3) {
        alert("Necesitas seleccionar al menos 3 fichas para armar un juego (Pierna o Escalera).");
        return;
    }

    if (!esJuegoValido(fichasSeleccionadas)) {
        alert("¡Jugada inválida! Recuerda: \n- Piernas: Mismo número. \n- Escaleras: Mismo color y consecutivas. \n- Máximo 1 comodín.");
        fichasSeleccionadas.forEach(fichaObj => {
            const fichaDOM = document.getElementById(fichaObj.id);
            if(fichaDOM) fichaDOM.classList.remove('seleccionada');
        });
        fichasSeleccionadas = [];
        return;
    }

    const zonaJuegos = document.getElementById('juegos-bajados');
    if (zonaJuegos.querySelector('p')) zonaJuegos.innerHTML = "";

    const nuevoJuegoDiv = document.createElement('div');
    nuevoJuegoDiv.className = 'juego-en-mesa'; 
    nuevoJuegoDiv.addEventListener('click', () => intentarAgregarFichas(nuevoJuegoDiv));

    fichasSeleccionadas.sort((a, b) => {
        let numA = a.numero === 1 ? 14 : a.numero; 
        let numB = b.numero === 1 ? 14 : b.numero;
        if(a.color === 'comodin') return 1; 
        if(b.color === 'comodin') return -1;
        return numA - numB;
    });

    fichasSeleccionadas.forEach(fichaObj => {
        manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id);
        const fichaDOM = document.getElementById(fichaObj.id);
        fichaDOM.classList.remove('seleccionada');
        fichaDOM.style.cursor = 'default'; 
        nuevoJuegoDiv.appendChild(fichaDOM);
    });

    zonaJuegos.appendChild(nuevoJuegoDiv);
    fichasSeleccionadas = [];
    renderizarAtril();
} 

function intentarAgregarFichas(juegoDiv) {
    if (fichasSeleccionadas.length === 0) return; 

    const fichasEnMesaDOM = Array.from(juegoDiv.children);
    const fichasEnMesaObjs = fichasEnMesaDOM.map(dom => diccionarioFichas[dom.id]);
    const combinacion = [...fichasEnMesaObjs, ...fichasSeleccionadas];

    if (!esJuegoValido(combinacion)) {
        alert("¡No podés colgar esas fichas ahí! Rompen la Escalera o la Pierna.");
        fichasSeleccionadas.forEach(fichaObj => {
            document.getElementById(fichaObj.id)?.classList.remove('seleccionada');
        });
        fichasSeleccionadas = [];
        return;
    }

    combinacion.sort((a, b) => {
        let numA = a.numero === 1 ? 14 : a.numero; 
        let numB = b.numero === 1 ? 14 : b.numero;
        if(a.color === 'comodin') return 1; 
        if(b.color === 'comodin') return -1;
        return numA - numB;
    });

    combinacion.forEach(fichaObj => {
        manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id);
        const fichaDOM = document.getElementById(fichaObj.id);
        if (fichaDOM) { 
            fichaDOM.classList.remove('seleccionada');
            fichaDOM.style.cursor = 'default';
            juegoDiv.appendChild(fichaDOM); 
        }
    });

    fichasSeleccionadas = [];
    renderizarAtril();
}

// ========================================================
// 5. FIREBASE Y MULTIJUGADOR (LOBBY)
// ========================================================

// Escuchar partidas abiertas en "burako_salas"
db.ref('burako_salas').on('value', (snapshot) => {
    if (roomCode) return; // Si ya estoy en una sala, ignoro el lobby general

    const salas = snapshot.val() || {};
    const listaUI = document.getElementById('rooms-list');
    if (!listaUI) return;
    
    listaUI.innerHTML = ""; 
    let salasDisponibles = 0;

    for (const [codigo, data] of Object.entries(salas)) {
        if (data.estado === "esperando") {
            salasDisponibles++;
            const btn = document.createElement('button');
            btn.className = "btn-success";
            btn.style.width = "100%";
            btn.style.marginBottom = "10px";
            btn.style.backgroundColor = "transparent";
            btn.style.color = "var(--neon-green)";
            btn.style.borderColor = "var(--neon-green)";
            btn.innerText = `Unirse a ${data.hostName}`;
            
            // Función para el Jugador 2 (Lo conectaremos en el siguiente paso)
            btn.onclick = () => alert("¡Próximamente unirse a la sala " + codigo + "!"); 
            listaUI.appendChild(btn);
        }
    }
    if (salasDisponibles === 0) listaUI.innerHTML = '<p style="color: #666; text-align: center; font-family: monospace;">Sin partidas activas. ¡Crea una!</p>';
});

// CREAR SALA (HOST)
document.getElementById('btn-crear-sala')?.addEventListener('click', () => {
    const inputName = document.getElementById('my-name');
    myName = inputName.value.trim();
    
    if (!myName) { 
        alert("Por favor, ingresa tu nombre para jugar."); 
        return; 
    }
    
    myRole = 'host';
    roomCode = Math.random().toString(36).substring(2, 6).toUpperCase(); 

    // Fabricamos, mezclamos y dividimos las fichas
    const fichasOrdenadas = generarFichas();
    mazo = mezclar(fichasOrdenadas);
    
    const manoH = mazo.splice(0, 11); // Mano Host
    const manoG = mazo.splice(0, 11); // Mano Guest
    const m1 = mazo.splice(0, 11);    // Muerto 1
    const m2 = mazo.splice(0, 11);    // Muerto 2
    pozo = [...mazo];                 // Lo que sobra al pozo local

    // Subimos TODO el estado inicial a Firebase
    db.ref(`burako_salas/${roomCode}`).set({
        hostName: myName,
        guestName: "",
        estado: "esperando",
        fichas: {
            host: manoH,
            guest: manoG,
            muerto1: m1,
            muerto2: m2,
            pozo: pozo,
            descarte: []
        },
        mesa: [] 
    });

    // Seteamos la mano del Host en su variable local para que pueda jugar
    manoJugador1 = manoH;

    // Ocultamos el lobby y mostramos la mesa
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('mesa-burako').classList.remove('hidden');
    document.querySelector('.nombre-jugador').innerText = `${myName} (Tú)`;
    
    // Mostramos visualmente las fichas del Host
    renderizarAtril();

    alert(`¡Sala creada! Código: ${roomCode}. Esperando a que alguien se una...`);
});