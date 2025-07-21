# Performance Optimization Guide

## Overview

This document details the performance optimization work done on the EdTech API Gateway, including key findings, benchmarks, and recommendations for future development.

## Performance Benchmarks

### Final Results
- **Total execution time**: 4.51 seconds (optimized from 5.31s)
- **Canvas API**: 2.81s for 69 assignments across 4 courses
- **Gradescope API**: 0.83s for 29 assignments across 2 courses
- **Overall improvement**: 15% faster (0.80s saved)

### Detailed Breakdown
```
📊 PERFORMANCE BREAKDOWN
=======================
🔍 Course fetching: 1.70s (37.6%)
📋 Assignment fetching: 3.64s (80.7%)
   📚 Canvas: 2.81s (62.3%)
   📝 Gradescope: 0.83s (18.4%)
💻 Display processing: 0.00s (0.0%)
🌐 Network I/O: 5.34s (100.0%)
⚙️  Processing: 0.00s (0.0%)
```

## Key Findings

### Canvas API Performance

#### ✅ What Works
- **Parallel Requests**: Despite Canvas documentation recommending sequential requests, parallel processing is 77% faster
- **Response Compression**: `Accept-Encoding: gzip, deflate, br` headers improve transfer speed
- **Field Selection**: Using `only[]` parameter reduces payload size
- **Request Caching**: 5-minute cache with deduplication prevents redundant calls
- **Optimized Timeouts**: 3-second timeout (reduced from 10s) with fail-fast strategy

#### ❌ What Doesn't Work
- **Sequential Requests**: Canvas docs recommend this, but it's much slower (4.97s vs 2.81s)
- **Artificial Delays**: 100ms delays between requests significantly hurt performance
- **Conservative Concurrency**: Canvas can handle more parallel requests than documented

#### 🔍 Canvas Limitations
- **Server-side bottleneck**: ~2.8s appears to be Canvas's architectural limit for processing 69 assignments
- **Assignment-heavy courses**: Canvas performance degrades with large numbers of assignments
- **Documented throttling**: Canvas docs are overly conservative about parallel requests

### Gradescope API Performance

#### ✅ What Works
- **Session Reuse**: Single authentication with cached session cookies
- **Batch Processing**: 8 concurrent requests work well
- **HTML Parsing Optimization**: Cheerio parsing is surprisingly efficient
- **Connection Pooling**: Axios instance reuse improves performance

#### 🏆 Performance Champion
- **Gradescope consistently outperforms Canvas** (0.83s vs 2.81s)
- **More efficient architecture** for assignment data retrieval
- **Better scaling** with number of assignments

## Optimization History

### Optimization Rounds
1. **Baseline**: 5.31s total (Canvas 3.53s, Gradescope 0.81s)
2. **Timeouts & Batching**: 4.94s total (Canvas 3.11s, Gradescope 0.85s)
3. **Caching & Deduplication**: 4.72s total (Canvas 2.95s, Gradescope 0.82s)
4. **Compression & Field Selection**: 4.64s total (Canvas 2.82s, Gradescope 0.81s)
5. **True Parallelization**: 4.51s total (Canvas 2.81s, Gradescope 0.83s)

### Failed Optimizations
- **Sequential Canvas requests**: Made performance 77% worse
- **Artificial delays**: Added unnecessary latency
- **Over-conservative concurrency**: Limited parallelization benefits

## Technical Implementation

### Canvas API Optimizations
```typescript
// Request caching with deduplication
const requestCache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();

// Optimized headers
const headers = {
  'Authorization': `Bearer ${apiToken}`,
  'Accept': 'application/json+canvas-string-ids',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache'
};

// Field selection for reduced payload
const endpoint = `/api/v1/courses/${courseId}/assignments?include[]=submission&per_page=200&only[]=id,name,due_at,points_possible,submission`;
```

### Gradescope API Optimizations
```typescript
// Session caching
const sessionCache = new Map<string, { cookies: string; timestamp: number }>();

// Batch processing
const BATCH_SIZE = 8;
for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
  const batch = courseIds.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(batchPromises);
}
```

## Recommendations for Future Development

### Canvas API
1. **Always use parallel requests** - ignore Canvas docs recommending sequential
2. **Expect 2-3s per course** with many assignments - this is Canvas's limit
3. **Use field selection** to reduce payload size
4. **Implement request caching** for repeated calls
5. **Set aggressive timeouts** (3s) to fail fast

### Gradescope API
1. **Reuse sessions** - authentication is expensive
2. **Batch requests** in groups of 8 for optimal throughput
3. **Cache sessions** for 10+ minutes to avoid re-authentication
4. **Gradescope is much faster** - prioritize it when possible

### General Performance
1. **Network I/O dominates** - optimize API calls, not local processing
2. **Parallel > Sequential** for both APIs
3. **Caching provides significant benefits** for repeated operations
4. **Assignment-heavy courses** will always be slower

## Debugging Performance Issues

### Canvas Performance Problems
- Check individual course timings with per-request logging
- Look for 403 rate limiting errors (though parallel works better)
- Monitor `X-Request-Cost` and `X-Rate-Limit-Remaining` headers
- Consider GraphQL API for complex queries

### Gradescope Performance Problems
- Check session cache hit rate
- Monitor authentication frequency
- Look for HTML parsing errors
- Verify batch sizing isn't too aggressive

## Performance Monitoring

### Key Metrics to Track
- Total execution time
- Canvas vs Gradescope response times
- Individual course processing times
- Cache hit rates
- Network I/O percentage

### Performance Regression Detection
- Canvas > 3.5s indicates performance regression
- Gradescope > 1.0s indicates session/caching issues
- Total > 5.0s indicates architectural problems

## Resources

### Canvas Performance References
- [Canvas API Throttling Documentation](https://developerdocs.instructure.com/services/canvas/basics/file.throttling)
- [Canvas Performance Issues Discussion](https://community.canvaslms.com/t5/Canvas-Developers-Group/Slow-API-responses-for-modules-and-module-items-even-when-cached/td-p/573914)
- [Canvas Assignment Loading Issues](https://community.canvaslms.com/t5/Canvas-Ideas/Assignments-Assignments-and-Modules-are-Slow-to-Load-If-There-Is/idi-p/431517)

### General API Performance
- [API Response Time Optimization Guide](https://prismic.io/blog/api-response-times)

---

**Last Updated**: July 2025  
**Performance Baseline**: 69 Canvas assignments, 29 Gradescope assignments across 6 courses  
**Optimized Performance**: 4.51s total execution time  
**EdTech API Gateway**: Unified interface for Canvas and Gradescope platforms