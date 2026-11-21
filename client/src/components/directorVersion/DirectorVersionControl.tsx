import {useEffect, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "react-router-dom";
import type {DirectorVersion} from "@ai-novel/shared/types/director/version";
import {getNovelDirectorVersion, setNovelDirectorVersion} from "@/api/novel/directorVersion";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";

export default function DirectorVersionControl({novelId, version}: {novelId: string; version?: DirectorVersion}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DirectorVersion | null>(null);
  const client = useQueryClient(), navigate = useNavigate();
  const query = useQuery({queryKey: ["novels", novelId, "director-version"], queryFn: () => getNovelDirectorVersion(novelId), enabled: Boolean(novelId), retry: false});
  const identity = query.data;
  useEffect(() => {
    if (version && identity && identity.version !== version) navigate(identity.sourceRoute, {replace: true});
  }, [version, identity, navigate]);
  const save = useMutation({mutationFn: () => {
    if (!identity || !selected) throw new Error("Load the director settings for this book first.");
    return setNovelDirectorVersion(novelId, selected, identity.epoch);
  }, onSuccess: async result => {
    await client.invalidateQueries();
    setOpen(false);
    navigate(result.sourceRoute);
  }});
  return <>
    <Button variant="ghost" size="sm" onClick={() => {setSelected(identity?.version ?? version ?? null); setOpen(true); save.reset(); void query.refetch();}}>
      {identity?.version || version ? `Director ${(identity?.version ?? version)!.toUpperCase()}` : "Director version"}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Director version for this book</DialogTitle><DialogDescription>Choose the workflow for this book. After switching, select a scope in the corresponding workspace. Saved drafts and history will be preserved.</DialogDescription></DialogHeader>
        {identity ? <div className="space-y-4">
          <label className="block space-y-2 text-sm"><span>Director version</span><select aria-label="Director version" className="h-10 w-full rounded-md border border-input bg-background px-3" value={selected ?? identity.version} disabled={!identity.canSwitch || save.isPending} onChange={event => setSelected(event.target.value as DirectorVersion)}>
            {identity.availableVersions.map(value => <option key={value} value={value}>{value === "v2" ? "Director V2 · New" : "Director V1 · Legacy"}</option>)}
            {!identity.availableVersions.includes(identity.version) ? <option value={identity.version}>Director V2 · Not enabled</option> : null}
          </select></label>
          <p className="text-xs leading-5 text-muted-foreground">Each version has its own task and recovery workflows. After switching, choose a scope in the corresponding workspace. Past tasks remain available to view.</p>
          {identity.blockedReason ? <p role="status" className="text-sm text-muted-foreground">{identity.blockedReason}</p> : null}
          <Button disabled={!identity.canSwitch || save.isPending || !selected || selected === identity.version} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save and open workspace"}</Button>
        </div> : <p className="text-sm text-muted-foreground">{query.isPending ? "Loading director settings…" : "Failed to load director settings."}</p>}
        {query.isError ? <Button variant="ghost" onClick={() => void query.refetch()}>Reload</Button> : null}
        {save.isError ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
      </DialogContent>
    </Dialog>
  </>;
}
