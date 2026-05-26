const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

function cacheMiddleware(req, res, next) {
  if (req.method !== "GET") {
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log(`Cache hit for ${key}`);
    return res.status(cachedResponse.statusCode).json(cachedResponse.body);
  }

  console.log(`Cache miss for ${key}`);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cache.set(key, {
      statusCode: res.statusCode,
      body,
    });
    return originalJson(body);
  };

  return next();
}

module.exports = { cacheMiddleware };
