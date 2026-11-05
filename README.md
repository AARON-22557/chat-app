# 💻 MicroOS PC - Chat con Código de Invitación, Sanciones y Automatizaciones

**MicroOS PC** es una aplicación de escritorio y web para chatear con amigos desde la computadora o laptop. Incluye un entorno de sistema operativo virtual, salas privadas mediante **códigos de invitación** de 6 dígitos, un **sistema de sanciones y baneos temporales** y un conjunto completo de **automatizaciones inteligentes** (Bots asistentes, Watchdog de auto-reinicio y persistencia de logs).

---

## ⚡ Arranque Automático en 1 Clic (Windows)

Solo haz doble clic en el archivo:
```text
start.bat
```
El script se encargará automáticamente de:
1. Comprobar Node.js e instalar dependencias si faltan (`npm install ws express`).
2. Abrir tu navegador en `http://localhost:3000`.
3. Iniciar el servidor con **bucle vigilante (Watchdog)**: si el servidor se cae o falla por cualquier motivo, se reinicia solo automáticamente.

---

## 🤖 1. Bots Automáticos en la Sala (`🤖 MicroBot`)

Cada sala cuenta con un bot inteligente integrado de forma automática:
- **Bienvenida automática:** Saluda de manera personalizada a cada usuario que entra o crea la sala.
- **Comandos interactivos:**
  - `!ayuda` o `!comandos` : Lista de comandos disponibles.
  - `!reglas` : Muestra las normas de convivencia y sanciones.
  - `!hora` : Consulta la hora actual del servidor.
  - `!jefe` : Revela quién es el Jefe y creador de la sala.
  - `!usuarios` : Lista los miembros conectados.
  - `!dado` : Lanza un dado aleatorio (1 al 6).
  - `!moneda` : Lanza una moneda al aire (Cara o Cruz).
  - `!chiste` : Cuenta un chiste divertido de informática.
- **Detección de preguntas frecuentes en lenguaje natural:**
  - Responde automáticamente a dudas sobre cómo invitar amigos, cómo funcionan las sanciones del Jefe, o la compatibilidad con micro:bit.
- **Recordatorios periódicos:** Envía consejos y recomendaciones automáticas cada 3 minutos en salas activas.

---

## 🛡️ 2. Mantenimiento y Auto-Recuperación del Servidor

- **Sala Predeterminada Automática (`000000`):** Existe una sala general pública siempre activa desde el primer segundo.
- **Auto-desbaneo inteligente:** Un temporizador en el servidor libera automáticamente a los usuarios sancionados al vencer los segundos sin requerir acción manual.
- **Limpieza de memoria:** Purga periódica de salas vacías para optimizar el consumo de recursos.
- **Tolerancia a fallos:** Captura excepciones no controladas (`uncaughtException`, `unhandledRejection`) para evitar detenciones inesperadas.

---

## 📂 3. Guardado Automático y Logs (Persistencia)

Todos los eventos se guardan automáticamente en formato JSON estructurado:
- `logs/chats/chat_sala_[CODIGO]_[FECHA].json`: Historial completo de mensajes por sala y día.
- `logs/sanciones.json`: Auditoría histórica de todas las suspensiones aplicadas por los Jefes (quién, a quién, duración, motivo y fecha).
- `logs/servidor.log`: Registro de conexiones, desconexiones y eventos de mantenimiento.

### Endpoints API REST incluidos:
- `GET /api/status`: Estado del servidor, tiempo de actividad y bot.
- `GET /api/logs/chats/:roomCode`: Consulta de historial de chat por sala.
- `GET /api/logs/sanctions`: Consulta del registro histórico de sanciones.

---

## 📦 Estructura del Proyecto

- `start.bat`: Script de inicio y auto-reinicio con vigilante para Windows.
- `stop.bat`: Script para detener el servidor limpiamente.
- `server.js`: Servidor WebSocket y HTTP con salas, APIs y tareas programadas.
- `bot.js`: Motor del bot interactivo MicroBot.
- `logger.js`: Módulo de persistencia y registro automático de chats y sanciones.
- `index.html`: Entorno gráfico del sistema operativo MicroOS PC.
- `styles.css`: Estilos visuales del escritorio, ventanas, pantalla de sanción y burbujas del Bot.
- `app.js`: Cliente de chat en tiempo real y temporizador de sanciones.
- `main.ts`: Código MakeCode para microcontroladores BBC micro:bit.
