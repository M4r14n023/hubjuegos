// js/burakoLogic.js

// --- CONFIGURACIÓN BASE DEL BURAKO ---
const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Variables globales de la mesa
let mazo = [];
let manoJugador1 = [];
let manoJugador2 = [];
let muerto1 = [];
let muerto2 = [];
let pozo = [];
let diccionarioFichas = {}; // Nos servirá para reconocer las fichas que ya están en la mesa

// --- 1. FABRICAR LAS FICHAS ---
function generarFichas() {
    let nuevasFichas = [];
    let idCounter = 0; 

    for (let i = 0; i < 2; i++) {
        COLORES.forEach(color => {
            NUMEROS.forEach(numero => {
                let ficha = { id: `ficha-${idCounter++}`, numero: numero, color: color, esComodinReal: false };
                nuevasFichas.push(ficha);
                diccionarioFichas[ficha.id] = ficha; // <--- NUEVA LÍNEA
            });
        });
    }

    let comodin1 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    let comodin2 = { id: `ficha-${idCounter++}`, numero: 0, color: 'comodin', esComodinReal: true };
    
    nuevasFichas.push(comodin1, comodin2);
    diccionarioFichas[comodin1.id] = comodin1; // <--- NUEVA LÍNEA
    diccionarioFichas[comodin2.id] = comodin2; // <--- NUEVA LÍNEA

    return nuevasFichas;
}

// --- 2. MEZCLAR LAS FICHAS (Algoritmo Fisher-Yates) ---
// Este es el método matemático más perfecto para simular una mezcla real
function mezclar(array) {
    let arrayMezclado = [...array];
    for (let i = arrayMezclado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayMezclado[i], arrayMezclado[j]] = [arrayMezclado[j], arrayMezclado[i]];
    }
    return arrayMezclado;
}

// --- 3. REPARTIR LA MESA PARA 2 JUGADORES ---
function iniciarPartidaBurako() {
    // 1. Fabricamos y mezclamos
    const fichasOrdenadas = generarFichas();
    mazo = mezclar(fichasOrdenadas);

    // 2. Repartimos usando splice() que extrae fichas del mazo original
    manoJugador1 = mazo.splice(0, 11); // Saca 11 fichas para J1
    manoJugador2 = mazo.splice(0, 11); // Saca 11 fichas para J2
    
    // 3. Separamos los muertos
    muerto1 = mazo.splice(0, 11); // Primer muerto de 11 fichas
    muerto2 = mazo.splice(0, 11); // Segundo muerto de 11 fichas

    // 4. Lo que sobra (106 - 44 = 62 fichas) es la pila para robar
    pozo = [...mazo];

    // Para comprobar que hicimos la matemática perfecta:
    console.log("¡Fichas repartidas exitosamente!");
    console.log(`Jugador 1 tiene: ${manoJugador1.length} fichas.`);
    console.log(`Jugador 2 tiene: ${manoJugador2.length} fichas.`);
    console.log(`Muerto 1: ${muerto1.length} fichas.`);
    console.log(`Muerto 2: ${muerto2.length} fichas.`);
    console.log(`Fichas restantes en el Pozo para robar: ${pozo.length} fichas.`);
}

// Arrancamos la máquina
iniciarPartidaBurako();
// --- 4. RENDERIZAR LA INTERFAZ Y EVENTOS (FASE 2 Y 3) ---

// Variable para recordar qué fichas tocaste
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

        // FASE 3: Escuchar el clic en la ficha
        fichaDiv.addEventListener('click', () => toggleSeleccion(ficha, fichaDiv));

        atrilUI.appendChild(fichaDiv);
    });
}

// --- FUNCIONES DE SELECCIÓN Y BUG FIX ---

function toggleSeleccion(fichaObj, elementoFicha) {
    // BUG FIX: Verificamos que la ficha siga realmente en tu mano.
    // Si ya la descartaste o la bajaste, ignoramos el clic.
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

// --- 5. ACCIONES DE LOS BOTONES Y EL POZO ---

document.getElementById('btn-bajar-juego')?.addEventListener('click', bajarJuego);
document.getElementById('btn-descartar')?.addEventListener('click', descartarFicha);
document.getElementById('pozo')?.addEventListener('click', robarDelPozo);

// NUEVO: Función para robar del mazo central
function robarDelPozo() {
    if (pozo.length === 0) {
        alert("El pozo está vacío.");
        return;
    }
    
    // Sacamos la primera ficha de arriba del pozo
    const nuevaFicha = pozo.shift(); 
    
    // La agregamos a tu mano virtual
    manoJugador1.push(nuevaFicha);
    
    // Volvemos a dibujar tu atril para que aparezca la nueva ficha
    renderizarAtril();
}
// --- 6. MOTOR MATEMÁTICO (JUEZ DEL JUEGO) ---

function esJuegoValido(fichas) {
    // Regla base: Mínimo 3 fichas
    if (fichas.length < 3) return false;

    // Separamos los comodines (Las figuras "comodin" y todos los números "2")
    const comodines = fichas.filter(f => f.color === 'comodin' || f.numero === 2);
    const regulares = fichas.filter(f => f.color !== 'comodin' && f.numero !== 2);

    // No se puede armar un juego solo de comodines, y el límite por juego armado es 1 comodín.
    if (regulares.length === 0) return false;
    if (comodines.length > 1) return false; 

    // --- CHEQUEO A: ¿ES UNA PIERNA? ---
    // Todas las fichas regulares deben tener exactamente el mismo número. (Cualquier color vale)
    const esPierna = regulares.every(f => f.numero === regulares[0].numero);
    if (esPierna) return true;

    // --- CHEQUEO B: ¿ES UNA ESCALERA? ---
    // 1. Todas las regulares deben ser del mismo color
    const mismoColor = regulares.every(f => f.color === regulares[0].color);
    if (!mismoColor) return false;

    // 2. En una escalera no pueden haber números regulares repetidos
    const numeros = regulares.map(f => f.numero);
    const setNumeros = new Set(numeros);
    if (setNumeros.size !== numeros.length) return false;

    // Función interna para comprobar si la distancia entre los números se puede llenar con el comodín
    function comprobarHuecos(arrayNumeros) {
        arrayNumeros.sort((a, b) => a - b);
        let huecosACompletar = 0;
        for (let i = 0; i < arrayNumeros.length - 1; i++) {
            // Ejemplo: si tengo 5 y 7, la resta es 2. (2 - 1 = 1 hueco).
            huecosACompletar += (arrayNumeros[i+1] - arrayNumeros[i] - 1);
        }
        return huecosACompletar <= comodines.length;
    }

    // Escenario B1: El '1' funciona como el número más bajo (1, 2, 3...)
    if (comprobarHuecos([...numeros])) return true;

    // Escenario B2: El '1' funciona como el número más alto (después del 13)
    if (numeros.includes(1)) {
        const numerosConAsAlto = numeros.map(n => n === 1 ? 14 : n);
        if (comprobarHuecos(numerosConAsAlto)) return true;
    }

    // Si no pasó ni la prueba de Pierna ni la de Escalera, es inválido.
    return false;
}

function bajarJuego() {
    if (fichasSeleccionadas.length < 3) {
        alert("Necesitas seleccionar al menos 3 fichas para armar un juego (Pierna o Escalera).");
        return;
    }

    // --- ¡AQUÍ ENTRA EL JUEZ! ---
    if (!esJuegoValido(fichasSeleccionadas)) {
        alert("¡Jugada inválida! Recuerda: \n- Piernas: Mismo número. \n- Escaleras: Mismo color y consecutivas. \n- Máximo 1 comodín (el 2 o la estrella).");
        
        // Les sacamos la selección porque se equivocaron
        fichasSeleccionadas.forEach(fichaObj => {
            const fichaDOM = document.getElementById(fichaObj.id);
            if(fichaDOM) fichaDOM.classList.remove('seleccionada');
        });
        fichasSeleccionadas = [];
        return;
    }

    const zonaJuegos = document.getElementById('juegos-bajados');
    if (zonaJuegos.querySelector('p')) {
        zonaJuegos.innerHTML = "";
    }

// (Dentro de bajarJuego, reemplaza la creación del div por esto:)
    const nuevoJuegoDiv = document.createElement('div');
    nuevoJuegoDiv.className = 'juego-en-mesa'; // Usamos la clase CSS nueva
    
    // NUEVO: Al hacer clic en el juego en la mesa, intentamos meterle las fichas seleccionadas
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
} // (Aquí termina bajarJuego)

// --- NUEVA FUNCIÓN PARA COLGAR FICHAS (CORREGIDA) ---
function intentarAgregarFichas(juegoDiv) {
    if (fichasSeleccionadas.length === 0) return; // Si no hay nada seleccionado, no hace nada

    // 1. Identificamos qué fichas YA estaban en ese juego de la mesa
    const fichasEnMesaDOM = Array.from(juegoDiv.children);
    const fichasEnMesaObjs = fichasEnMesaDOM.map(dom => diccionarioFichas[dom.id]);

    // 2. Simulamos la combinación (Las que estaban + Las que queremos agregar)
    const combinacion = [...fichasEnMesaObjs, ...fichasSeleccionadas];

    // 3. Le preguntamos al "Juez" Matemático si la mezcla es válida
    if (!esJuegoValido(combinacion)) {
        alert("¡No podés colgar esas fichas ahí! Rompen la Escalera o la Pierna.");
        
        // Deseleccionamos por si se equivocaron
        fichasSeleccionadas.forEach(fichaObj => {
            document.getElementById(fichaObj.id)?.classList.remove('seleccionada');
        });
        fichasSeleccionadas = [];
        return;
    }

    // 4. Si el juez aprueba, ordenamos la combinación nueva
    combinacion.sort((a, b) => {
        let numA = a.numero === 1 ? 14 : a.numero; 
        let numB = b.numero === 1 ? 14 : b.numero;
        if(a.color === 'comodin') return 1; 
        if(b.color === 'comodin') return -1;
        return numA - numB;
    });

    // ¡EL TRUCO ESTÁ AQUÍ!
    // Ya no borramos nada. Al hacer appendChild, JS simplemente reordena
    // las fichas viejas y agrega las nuevas al final en el orden correcto.
    combinacion.forEach(fichaObj => {
        // Borramos de la mano virtual (solo afecta a las nuevas)
        manoJugador1 = manoJugador1.filter(f => f.id !== fichaObj.id);

        const fichaDOM = document.getElementById(fichaObj.id);
        if (fichaDOM) { // Verificamos que exista por precaución
            fichaDOM.classList.remove('seleccionada');
            fichaDOM.style.cursor = 'default';
            juegoDiv.appendChild(fichaDOM); // JS mueve o inserta la ficha
        }
    });

    fichasSeleccionadas = [];
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
    fichaDOM.style.cursor = 'default'; // Ya no es clickeable
    
    descarteDiv.appendChild(fichaDOM);
    fichasSeleccionadas = [];
    
    renderizarAtril();
}

// Arrancamos el renderizado inicial
renderizarAtril();