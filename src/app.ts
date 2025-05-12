import express from "express";
import cors from "cors";
import helmet from "helmet";
import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { setupSwagger } from "./config/swagger";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import registrationRoutes from "./routes/registrationRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import badgeRoutes from "./routes/badgeRoutes";
import rateLimit from "express-rate-limit";
import path from "path";
import healthRoutes from './routes/healthRoutes';
import { startKeepAliveCron } from './cron/keepAlive';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
});

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'https://event-management-system-i5mq.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
      },
    },
  })
);

app.use(express.json());
app.use("/api", apiLimiter);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });

app.use(express.static(path.join(__dirname, '../public')));
app.use("/js", express.static(path.join(__dirname, "../public/js")));
app.use("/badges", express.static(path.join(__dirname, "../public/badges")));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/badges", badgeRoutes);

// Add health routes
app.use('/api', healthRoutes);

// Setup Swagger documentation
setupSwagger(app);

// Start the keep-alive cron job
if (process.env.NODE_ENV === 'production') {
  startKeepAliveCron();
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
