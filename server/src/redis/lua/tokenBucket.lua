local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillAmount = tonumber(ARGV[2])
local refillTime = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local tokens = tonumber(redis.call('HGET', key, 'tokens'))
local lastRefill = tonumber(redis.call('HGET', key, 'lastRefill'))
if not tokens then
  tokens = capacity
  lastRefill = now
end

local timePassed = (now - lastRefill) / 1000
local intervalsElapsed = math.floor(timePassed / refillTime)

if intervalsElapsed > 0 then
  tokens = math.min(capacity, tokens + (intervalsElapsed * refillAmount))
  lastRefill = lastRefill + (intervalsElapsed * refillTime * 1000)
end

if tokens < 1 then
  redis.call('EXPIRE', key, ttl)
  return {0, tokens}
end

tokens = tokens - 1
redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
redis.call('EXPIRE', key, ttl)

return {1, tokens}

