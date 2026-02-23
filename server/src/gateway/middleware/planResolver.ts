import {Request, Response, NextFunction} from "express";
import {pool} from "../../config/dbConfig"
import {redis} from "../../redis/client"

interface Plan{
  id:string;
  burst:number;
  rate:number;
  monthlyQuota:number;
  enforcement:string;
}

const PLAN_CACHE_TTL=300;
const PLAN_CACHE_KEY= (tenantId:string)=>`tenant:plan:${tenantId}`;

export const planResolver = async(
  req:Request,
  res:Response,
  next:NextFunction
):Promise<void>=>{
  try{
    const tenantId=req.context?.tenantId;

    if(!tenantId){
      res.status(400).json({error:"tenantId missing"});
      return;

    } 
    const redisKey=PLAN_CACHE_KEY(tenantId);

    const cached= await redis.get(redisKey);
    if(cached){
      req.context.plan=JSON.parse(cached);
      console.log(`[PlanResolver] Cache hit - tenant: ${tenantId}`);
      return next();
    }

    const result=await pool.query(
      `
      SELECT 
        p.id as plan_id, 
        p.burst_rps,
        p.sustained_rpm,
        p.monthly_quota,
        p.enforcement_type
      FROM tenants t
      JOIN plans p ON p.id=t.plan_id
      WHERE t.id=$1
      AND t.status='active'
      LIMIT 1
      `,[tenantId]
    );

    if(result.rowCount===0) {
      res.status(404).json({error:"No plan details found for the tenant"});
      return;
    }

    const row = result.rows[0];

    const plan: Plan = {
      id: row.plan_id,
      burst: row.burst_rps,
      rate: row.sustained_rpm,
      monthlyQuota: row.monthly_quota,
      enforcement: row.enforcement_type
    };
    try{
      await redis.set(
        redisKey,
        JSON.stringify(plan),
        "EX",
        PLAN_CACHE_TTL
      );
      console.log(`[PlanResolver] Cached plan - tenant: ${tenantId}`);
    }catch(err){
      console.error(`[PlanResolver] Cache write failed - tenant: ${tenantId}`, err);

    }

    req.context.plan = plan;
    console.log(`[PlanResolver] DB hit - tenant: ${tenantId}`);
    next();

  }catch(err){
    console.log(err);
    res.status(500).json({error:"Server error"});
  }
}

