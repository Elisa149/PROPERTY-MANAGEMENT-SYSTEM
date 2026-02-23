/**
 * Vercel entry point: export the Express app so Vercel runs it as a serverless function.
 * Local dev still uses backend/server.js directly (with app.listen).
 */
module.exports = require('./backend/server');
