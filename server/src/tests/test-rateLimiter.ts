import autocannon from 'autocannon';
import Redis from 'ioredis';

interface TestConfig {
  freeKey: string;
  freeTenantId: string;
  proKey: string;
  proTenantId: string;
  entKey: string;
  entTenantId: string;
}

class RateLimiterTester {
  private redis: Redis;
  private baseUrl: string;
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.redis = new Redis('redis://localhost:6379');
    this.baseUrl = 'http://localhost:5555';
    this.config = config;
  }

  // --- Helper to clear Redis for a specific tenant ---
  private async resetTenantState(tenantId: string) {
    const keys = await this.redis.keys(`*${tenantId}*`);
    if (keys.length > 0) {
      console.log(`   🧹 Clearing ${keys.length} keys for tenant ${tenantId.slice(0, 8)}...`);
      await this.redis.del(...keys);
    }
  }

  // --- Helper to Run Load Test ---
  private async runAutocannon(options: autocannon.Options) {
    return new Promise<any>((resolve, reject) => {
      autocannon(options, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // --- TEST 1: BURST LIMIT ---
  async test1_BurstLimit() {
    console.log(`\n🔥 TEST 1: BURST LIMIT (Pro Key - Hard Limit)`);
    await this.resetTenantState(this.config.proTenantId);

    const result = await this.runAutocannon({
      url: `${this.baseUrl}/auth/protected`,
      connections: 50, // High concurrency
      duration: 3,
      headers: { 'X-API-Key': this.config.proKey }
    });

    const success = result.statusCodeStats['200']?.count || 0;
    const rejected = result.statusCodeStats['429']?.count || 0;

    console.log(`   📝 Result: ${success} Success, ${rejected} Rejected (429s)`);
    
    if (rejected > 0 && success > 0) {
      console.log('   ✅ PASSED: Burst limit hit correctly.');
      return true;
    } else {
      console.log('   ❌ FAILED: Expected some 429 rejections.');
      return false;
    }
  }

  // --- TEST 3: QUOTA (Debug Version) ---
  async test3_Quota() {
    console.log('\n📊 TEST 3: QUOTA ENFORCEMENT');
    await this.resetTenantState(this.config.proTenantId);

    // 1. Send ONE request to force backend to create the correct key structure
    console.log('   ⚡ Sending 1 primer request to generate keys...');
    await this.runAutocannon({
        url: `${this.baseUrl}/auth/protected`,
        connections: 1,
        amount: 1,
        headers: { 'X-API-Key': this.config.proKey }
    });

    // 2. Find the key the backend actually created
    const keys = await this.redis.keys(`*quota*${this.config.proTenantId}*`);
    if (keys.length === 0) {
        console.log('   ❌ FAILED: No quota key found in Redis. Is the backend saving it?');
        return false;
    }
    const realQuotaKey = keys[0];
    console.log(`   🔎 Found real quota key: "${realQuotaKey}"`);

    // 3. Manually fill the quota (Limit 5,000,000 -> Set to 4,999,990)
    await this.redis.set(realQuotaKey, '4999990');
    console.log('   ✏️  Artificially filled quota to 4,999,990');

    // 4. Send 15 requests (Should allow 10, Block 5)
    const result = await this.runAutocannon({
        url: `${this.baseUrl}/auth/protected`,
        connections: 1,
        amount: 15,
        headers: { 'X-API-Key': this.config.proKey }
    });

    const success = result.statusCodeStats['200']?.count || 0;
    const rejected = result.statusCodeStats['429']?.count || 0;

    console.log(`   📝 Result: ${success} Success, ${rejected} Rejected`);

    if (success === 10 && rejected === 5) {
        console.log('   ✅ PASSED: Exact quota enforcement.');
        return true;
    } else {
        console.log('   ❌ FAILED: Quota math incorrect.');
        return false;
    }
  }

  // --- TEST 5: ISOLATION (Debug Version) ---
  async test5_PlanIsolation() {
    console.log('\n🔒 TEST 5: PLAN ISOLATION');
    await this.resetTenantState(this.config.proTenantId);
    await this.resetTenantState(this.config.entTenantId);

    console.log('   ⚡ Running Pro and Enterprise in parallel...');
    
    const [proResult, entResult] = await Promise.all([
      this.runAutocannon({
        url: `${this.baseUrl}/auth/protected`,
        connections: 5,
        duration: 2,
        headers: { 'X-API-Key': this.config.proKey }
      }),
      this.runAutocannon({
        url: `${this.baseUrl}/auth/protected`,
        connections: 5,
        duration: 2,
        headers: { 'X-API-Key': this.config.entKey }
      })
    ]);

    const proSuccess = proResult.statusCodeStats['200']?.count || 0;
    const entSuccess = entResult.statusCodeStats['200']?.count || 0;

    console.log(`   📝 Pro Success: ${proSuccess}`);
    console.log(`   📝 Ent Success: ${entSuccess}`);

    // DEBUGGING ENTERPRISE FAILURE
    if (entSuccess === 0) {
        console.log('   ⚠️  DEBUGGING ENT FAILURE: Status Codes received:');
        console.log(entResult.statusCodeStats); 
    }

    if (proSuccess > 0 && entSuccess > 0) {
      console.log('   ✅ PASSED: Both plans working concurrently.');
      return true;
    } else {
      console.log('   ❌ FAILED: One plan is completely blocked.');
      return false;
    }
  }

  async runAll() {
    await this.test1_BurstLimit();
    await this.test3_Quota();
    await this.test5_PlanIsolation();
    process.exit(0);
  }
}

// CONFIG
const config: TestConfig = {
  freeKey: 'password4',
  freeTenantId: '019b8a20-ebbe-7ce7-a3fb-9516d6bc76d1',
  proKey: 'password2',
  proTenantId: '019b8a20-ebbe-72d1-b575-2e8ae77d71a1',
  entKey: 'password5',
  entTenantId: '019b8a20-ebbe-7f75-9756-48dc7a017296'
};

new RateLimiterTester(config).runAll();
