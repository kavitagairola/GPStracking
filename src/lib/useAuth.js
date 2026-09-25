"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to get the currently logged-in user from the auth cookie via /api/auth/me
 * Returns { user, loading, logout }
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUser(json.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/");
  };

  return { user, loading, logout };
}
