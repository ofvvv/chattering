const MAX_MESSAGES = 300;
let msgLineCounter = 0;
let totalMsgCount = 0;

// Estado global de la configuracion (se rellena al inicio)
let cfg = {};

// La URL del servidor y el socket se definen aquí para que sean globales
const SERVER = 'http://localhost:3000';
const socket = io(SERVER);
