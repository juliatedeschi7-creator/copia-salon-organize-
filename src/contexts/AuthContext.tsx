const init = async () => {
  try {
    setIsLoading(true);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );

    const sessionPromise = supabase.auth.getSession();

    const { data } = await Promise.race([
      sessionPromise,
      timeout,
    ]) as any;

    const session = data?.session;

    if (!session?.user) {
      setUser(null);
      setProfile(null);
      setProfileLoaded(true);
      return;
    }

    const currentUser = session.user;
    setUser(currentUser);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile(profileData || null);
    setProfileLoaded(true);
  } catch (err) {
    console.error("Timeout ou erro:", err);

    // 🔥 NUNCA TRAVA
    setUser(null);
    setProfile(null);
    setProfileLoaded(true);
  } finally {
    setIsLoading(false);
  }
};
