import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobileShelf } from "./MobileShelf";
import { MobileNovel } from "./MobileNovel";
import { MobileRecords, MobileNotifications } from "./MobileRecords";
import { resolveMobileTerminalRoute } from "./routePolicy";

export function MobileTerminal() {
  const location = useLocation();
  const route = resolveMobileTerminalRoute(location.pathname);
  const active = route.kind === "novel" ? "shelf" : route.kind;
  const tabs = [{ kind: "shelf", to: "/novels", label: "Novels" }, { kind: "records", to: "/tasks", label: "Activity" }, { kind: "notifications", to: "/auto-director/follow-ups", label: "Notifications" }];
  return <div className="min-h-dvh bg-background text-foreground">
    <header className="border-b px-4 py-4"><Link to="/novels" className="font-semibold">Novel Workspace</Link></header>
    <main className="mobile-site-main mx-auto max-w-xl space-y-5 px-4 py-5 pb-28">
      {route.kind === "shelf" ? <MobileShelf /> : route.kind === "records" ? <MobileRecords /> : route.kind === "notifications" ? <MobileNotifications /> : route.kind === "novel" ? <MobileNovel key={route.novelId} novelId={route.novelId} chapterId={route.chapterId} /> : <section className="space-y-4"><h1 className="text-xl font-semibold">Open this tool on your computer</h1><p className="text-sm text-muted-foreground">Importing and revising manuscripts, configuring models, planning worlds and characters, editing outlines, creating comics, exporting, and managing data are available on desktop. On mobile, you can check novel progress, read and edit chapter text, and follow up on tasks.</p><Button asChild><Link to="/novels">View novels</Link></Button></section>}
    </main>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{tabs.map(tab => <Link key={tab.kind} to={tab.to} aria-current={active === tab.kind ? "page" : undefined} className={`rounded-md px-4 py-2 text-sm ${active === tab.kind ? "bg-muted font-semibold text-primary" : "text-muted-foreground"}`}>{tab.label}</Link>)}</nav>
  </div>;
}
