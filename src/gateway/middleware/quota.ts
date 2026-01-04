import {Request, Response, NextFunction} from "express";
import {redis} from "../../redis/client"

interface Plan{
  burst: number;
  rate: number;
  monthlyQuota: number;
  enforcement: "hard" | "soft";
}

export const quotaEnforcer = async(
  req:Request,
  res:Response,
  next:NextFunction
): Promise<void> => {
  try{
    const tenantId=req.context?.tenantId;
    const plan=req.context?.plan;
    
    if(!tenantId || !plan){
      res.status(500).json({error:"Quota context missing"});
      return;
    }
    const now = new Date();
    const currentMonth=`${now.getUTCFullYear()}-${String(
      now.getUTCMonth()+1
    ).padStart(2,"0")}`;

    const redisKey = `quota:${tenantId}:${currentMonth}`
    const used = await redis.incr(redisKey);

    if(used===1){
      const endofMonth=new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth()+1,
          1,0,0,0
        )
      );

      const ttlSeconds=Math.floor(
        (endofMonth.getTime()-now.getTime())/1000
      );

      await redis.expire(redisKey,ttlSeconds)
    }

    if(used>plan.monthlyQuota){
      if(plan.enforcement==="hard"){
        res.status(429).json({
          error:"Monthly Quota Exceeded",
          limit: plan.monthlyQuota,
          used,
          period:currentMonth,
        });
        return;
      }
      console.warn(`[Quota] Soft limit exceed for tenant ${tenantId} (${used}/${plan.monthlyQuota})`
                  );
    }
    next();

  }catch(err){
    console.error("[QuotaEnforcer] Error", err);
    res.status(500).json({error:"Quota middleware Failure"});
    return;
  }
}
