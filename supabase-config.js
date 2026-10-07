// Leave apiBase empty to use this same website when it is started with `npm start`.
window.KALCETO_AUTH = {
  apiBase: location.hostname.endsWith("github.io") ? "https://kalceto-shkoder.onrender.com" : ""
};

// Optional social login later. Email codes are sent by the Kalceto server, not this key.
window.KALCETO_SUPABASE = {
  url: "https://eviryleblskmpbzotqyt.supabase.co",
  publishableKey: "sb_publishable_-S4SyMtHdwj6ko48DyRXFA_2RKuvqcg",
  providers: { google: false, apple: false, azure: false }
};
