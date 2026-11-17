import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import parkingRoutes from './routes/parking.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import incidentRoutes from './routes/incidents.js';
import occupationRoutes from './routes/occupations.js';
import { pool } from './db.js';
import { verifyAccessToken } from './utils/auth.js';

dotenv.config();
// Sin JWT_SECRET, jsonwebtoken falla en cada login/petición autenticada; mejor
// detener el arranque con un mensaje claro.
if (!process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET (ver backend/.env.example).');
  process.exit(1);
}
const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' }
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 180 }));

app.get('/api/health', async (_req,res) => {
  try {
    const r = await pool.query('SELECT now() AS now');
    res.json({ok:true, service:'sgdpu-api', database:r.rows[0].now});
  } catch {
    res.status(503).json({ok:false, service:'sgdpu-api', message:'Base de datos no disponible'});
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/occupations', occupationRoutes);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi:'3.0.0',
    info:{title:'SGDPU API',version:'1.0.0',description:'API REST del Sistema para la Gestión de Disponibilidad de Parqueaderos USCO'},
    servers:[{url:'http://localhost:4000'}]
  },
  apis:[]
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Errores no controlados de las rutas (ver utils/router.js). Los errores de
// negocio llevan `status`; los de PostgreSQL más comunes por datos del cliente
// se traducen a 4xx; el resto se registra y responde 500 sin filtrar detalles.
const PG_CLIENT_ERRORS = {
  '22P02': [400, 'Formato de dato inválido'],
  '22003': [400, 'Valor numérico fuera de rango'],
  '22001': [400, 'Alguno de los datos excede la longitud permitida'],
  '23503': [409, 'El registro referenciado no existe o tiene datos asociados'],
  '23505': [409, 'El registro ya existe'],
  '23514': [409, 'La operación viola una restricción de los datos'],
};
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (res.headersSent) return res.end();
  if (err.status) return res.status(err.status).json({message:err.message, errores:err.errores});
  const pgErr = PG_CLIENT_ERRORS[err.code];
  if (pgErr) return res.status(pgErr[0]).json({message:pgErr[1]});
  if (err.type === 'entity.too.large') return res.status(413).json({message:'La petición excede el tamaño permitido'});
  if (err.type === 'entity.parse.failed') return res.status(400).json({message:'JSON inválido'});
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({message:'Error interno del servidor'});
});

process.on('unhandledRejection', err => console.error('Promesa rechazada sin manejar:', err));

// Solo usuarios autenticados reciben eventos en tiempo real: el cliente envía
// su access token en el handshake (auth.token).
io.use((socket, next) => {
  try {
    socket.data.auth = verifyAccessToken(String(socket.handshake.auth?.token || ''));
    next();
  } catch {
    next(new Error('No autorizado'));
  }
});

io.on('connection', socket => {
  socket.on('join:parking', id => socket.join(`parking:${id}`));
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => console.log(`SGDPU API escuchando en http://localhost:${port}`));
