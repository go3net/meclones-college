"use client";

import { USERS, User, Role } from "./mock-data";

const KEY = "meclones_session_v1";

export function login(email: string, password: string): User | null {
  const user = USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );
  if (!user) return null;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  }
  return user;
}

export function logout() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(KEY);
  }
}

export function currentUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function dashboardPath(role: Role): string {
  switch (role) {
    case "director": return "/portal/director";
    case "school_admin": return "/portal/admin";
    case "teacher": return "/portal/teacher";
    case "parent": return "/portal/parent";
    case "student": return "/portal/student";
    case "accountant": return "/portal/accountant";
  }
}

export function demoAccounts() {
  return USERS.map(u => ({ role: u.role, email: u.email, password: u.password, name: u.name }));
}
