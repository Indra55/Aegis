import {Request, Response, NextFunction} from "express";
import crypto from "crypto";
import {pool} from "../../config/dbConfig"
import {redis} from "../../redis/client"

export const authMiddleware = async (
  req:Request,
  res:Response,
  next:NextFunction
)=>{
  try{
  const apiKey=req.header("x-api-key");

  if(!apiKey) return res.status(401).json({error:"API Key missing in header"});

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const redisKey =`apikey:${keyHash}`;

  //redis lookup
  const cached = await redis.get(redisKey);
  if(cached){
    req.context=JSON.parse(cached);
    console.log("redis hit");
    return next();
  }

  //db lookup
  const result = await pool.query(
    `
    SELECT tenant_id
    FROM api_keys 
    WHERE key_hash = $1
    AND status='active'
    LIMIT 1
    `,[keyHash]
  );

  if(result.rowCount===0) return res.status(401).json({error:"Invalid API Key"});
  
  const context = {
    tenantId: result.rows[0].tenant_id,
  };
  
  //cahching the context for 10 mins
  await redis.set(
    redisKey,
    JSON.stringify(context),
    "EX",
    600
  );

  req.context=context;
  console.log("DB hit");
  next();
}catch(err){
    console.log(err);
    return res.status(500).json({error:"Auth Middleware failure"});
}};
