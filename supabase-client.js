const SUPABASE_URL = "https://aywoghnxwamodjdwbsmq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_nJWP_bHMlKom8_mmyqPN6g_9M5Q4A6x";

if (!window.supabase?.createClient) {
  throw new Error("Supabase JS did not load. Check your internet connection.");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: window.sessionStorage,
    },
  },
);

window.closeActivitySessionOnExit = (sessionId, accessToken) => {
  if (!sessionId || !accessToken) {
    return;
  }

  fetch(`${SUPABASE_URL}/rest/v1/rpc/close_activity_session`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_session_id: sessionId }),
    keepalive: true,
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error(
          `Unable to save activity session close: ${response.status} ${await response.text()}`,
        );
      }
    })
    .catch((error) => {
      console.error("Unable to save activity session close:", error);
    });
};
