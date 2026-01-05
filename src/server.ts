import express from "express";
import {authMiddleware} from "./gateway/middleware/auth";
import {planResolver} from "./gateway/middleware/planResolver";
import {burstLimiter} from "./gateway/middleware/burst";
import {rateLimiter} from "./gateway/middleware/rate"
import {quotaEnforcer} from "./gateway/middleware/quota";

const app = express();

const PORT = 5555;

app.listen(PORT,()=>{
  console.log("Server's good");
})

app.get('/health',(req,res)=>{
  console.log("HOHO");
  res.status(200).json({message:"hoho"})
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
  (req, res) => {
    res.json({ ok: true });
  }
);
