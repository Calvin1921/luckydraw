// Convex + Clerk JWT bridge
// CLERK_JWT_ISSUER_DOMAIN must also be set as an environment variable
// in the Convex dashboard (Settings → Environment Variables).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
