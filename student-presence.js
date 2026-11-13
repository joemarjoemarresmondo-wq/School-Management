window.studentPresence = {
  async update(userId) {
    const { error } = await window.supabaseClient
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);

    return error;
  },

  isActive(lastSeenAt) {
    if (!lastSeenAt) {
      return false;
    }

    const lastSeenTime = new Date(lastSeenAt).getTime();
    return Number.isFinite(lastSeenTime) && Date.now() - lastSeenTime < 90_000;
  },
};
