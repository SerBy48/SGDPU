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

dotenv.config();
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
  const r = await pool.query('SELECT now() AS now');
  res.json({ok:true, service:'sgdpu-api', database:r.rows[0].now});
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

io.on('connection', socket => {
  socket.on('join:parking', id => socket.join(`parking:${id}`));
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => console.log(`SGDPU API escuchando en http://localhost:${port}`));
