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
import staffRoutes from "./routes/staffRoutes";
import rateLimit from "express-rate-limit";
import path from "path";

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
});

const app = express();

app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
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
app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/staff", staffRoutes);

// Setup Swagger documentation
setupSwagger(app);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
