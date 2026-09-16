/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't let Next.js's build bundle these into the serverless function —
  // webpack mangles `ws`'s internal WebSocket frame-masking code when it's
  // bundled, which breaks the Neon pooled connection at runtime with
  // "TypeError: b.mask is not a function" / "Connection terminated
  // unexpectedly". Left as a normal node_modules require instead.
  serverExternalPackages: ["ws", "@neondatabase/serverless"],
};

export default nextConfig;
