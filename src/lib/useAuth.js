"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

function getRoleFromPath(pathname) {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/telecaller")) return "TELECALLER";
  if (pathname.startsWith("/driver")) return "DRIVER";
  return null;
}

/**
 * Hook to get the currently logged-in user
 * from the role-specific auth cookie via /api/auth/me
 *
 * Returns { user, loading, logout }
 */
export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = getRoleFromPath(pathname);

  useEffect(() => {
    if (!role) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`/api/auth/me?role=${encodeURIComponent(role)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUser(json.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [role]);

  const logout = async () => {
    try {
      if (role) {
        await fetch(
          `/api/auth/logout?role=${encodeURIComponent(role)}`,
          {
            method: "POST",
          }
        );
      }
    } catch {
      // ignore
    }

    router.push("/");
  };

  return { user, loading, logout };
}