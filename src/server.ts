import express from "express";
import {authMiddleware} from "./gateway/middleware/auth";
import {planResolver} from "./gateway/middleware/planResolver.ts"

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
app.get(
  "/auth/protected",
  authMiddleware,
  planResolver,
  (req, res) => {
    res.json({
      context: req.context
    });
  }
);
