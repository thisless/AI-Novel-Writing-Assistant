import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccessTokenGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ready" | "required">("checking");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function connect(accessToken?: string, signal?: AbortSignal) {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/access/session`, {
        method: accessToken ? "POST" : "GET", credentials: "include", cache: "no-store", signal,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (response.ok) { setToken(""); setState("ready"); setMessage(""); }
      else { setState("required"); setMessage((await response.json()).error ?? "Connection failed. Enter the access token again."); }
    } catch (error) {
      if (!signal?.aborted) { setState("required"); setMessage("Could not connect to the writing service. Check the address and try again."); }
    } finally { setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    void connect(undefined, controller.signal);
    const requireAccess = () => { setState("required"); setMessage("Enter a valid access token."); };
    window.addEventListener("ai-novel:access-required", requireAccess);
    return () => { controller.abort(); window.removeEventListener("ai-novel:access-required", requireAccess); };
  }, []);
  if (state === "ready") return children;
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6">
    <form className="w-full max-w-sm space-y-4" onSubmit={event => { event.preventDefault(); void connect(token.trim()); }}>
      <h1 className="text-xl font-semibold">Connect to the writing workspace</h1>
      {state === "checking" ? <p role="status">Connecting to the writing service…</p> : <>
        <p className="text-sm text-muted-foreground">Enter the access token provided by your administrator to view your novels and continue writing.</p>
        <label className="block space-y-2 text-sm">Access token<Input autoComplete="current-password" type="password" required value={token} onChange={event => setToken(event.target.value)} /></label>
        {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
        <Button disabled={busy} type="submit">{busy ? "Connecting…" : "Connect to workspace"}</Button>
      </>}
    </form>
  </main>;
}
