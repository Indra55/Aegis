local key = KEYS[1]
local windowSize = tonumber(ARGV[1]) --ms posibly
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET',key,'curr','prev','windowStart')

local curr = tonumber(data[1]) or 0
local prev = tonumber(data[2]) or 0
local windowStart = tonumber(data[3]) or (now - (now % windowSize))

local elapsed = now - windowStart

if elapsed>=windowSize and elapsed<2*windowSize then
  prev=curr
  curr=0
  windowStart= windowStart + windowSize
elseif elapsed >=2*windowSize then
  prev=0
  curr=0
  windowStart=now-(now%windowSize)
end

local overlap_ratio = math.max(0,(windowSize-elapsed)/windowSize)
local effective_count = curr + (prev*overlap_ratio)

if effective_count>=limit then
  return {0,math.floor(effective_count)}
end

curr=curr+1

redis.call(
  'HSET',
  key,
  'curr',curr,
  'prev',prev,
  'windowStart',windowStart
)

redis.call('PEXPIRE',key,windowSize*2)

return {1, math.floor(curr + (prev * overlap_ratio))}

