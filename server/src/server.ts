import express, { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./gateway/middleware/auth";
import { planResolver } from "./gateway/middleware/planResolver";
import { burstLimiter } from "./gateway/middleware/burst";
import { rateLimiter } from "./gateway/middleware/rate"
import { quotaEnforcer } from "./gateway/middleware/quota";
import adminRoutes from "./routes/admin";

const app = express();

const PORT = 5555;

// CORS middleware for frontend communication
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// JSON body parser
app.use(express.json());

// Mount admin API routes
app.use("/api", adminRoutes);

app.listen(PORT, () => {
  console.log(`
🛡️  Aegis Gateway Online
   ├─ HTTP:     http://localhost:${PORT}
   ├─ API:      http://localhost:${PORT}/api
   └─ Health:   http://localhost:${PORT}/health
  `);
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: "operational",
    message: "Aegis is guarding your APIs",
    uptime_seconds: Math.floor(process.uptime())
  });
})

// app.get("/auth/protected", authMiddleware, (req, res) => {
//   res.json({ context: req.context });
//   console.log("auth ping!")
// });
//
// app.get(
//   "/auth/protected",
//   authMiddleware,
//   planResolver,
//   (req, res) => {
//     res.json({
//       context: req.context
//     });
//   }
// );

// app.get(
//   "/auth/protected",
//   authMiddleware,
//   planResolver,
//   burstLimiter,
//   (req, res) => {
//     res.json({ ok: true });
//   }
// );

// app.get(
//   "/auth/protected",
//   authMiddleware,
//   planResolver,
//   burstLimiter,
//   rateLimiter,
//   (req, res) => {
//     res.json({ ok: true });
//   }
// );

app.get(
  "/auth/protected",
  authMiddleware,
  planResolver,
  burstLimiter,
  rateLimiter,
  quotaEnforcer,
  (req: Request, res: Response) => {
    res.json({ ok: true });
  }
);
