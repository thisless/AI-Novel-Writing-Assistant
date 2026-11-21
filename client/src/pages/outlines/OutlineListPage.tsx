import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import type { OutlineDocument } from "@ai-novel/shared/types/outline";
import { Button } from "@/components/ui/button";
import {
  confirmOutlineImport,
  createOutline,
  listOutlines,
  previewOutlineImport,
  type OutlineImportPreview as OutlineImportPreviewData,
} from "@/api/outlines";
import { OutlineImportPreview } from "./OutlineImportPreview";
import { featureFlags } from "@/config/featureFlags";
import { useIsMobileViewport } from "@/components/layout/mobile/useIsMobileViewport";

export default function OutlineListPage() {
  const navigate = useNavigate();
  const isMobileViewport = useIsMobileViewport();
  const client = useQueryClient();
  const [importText, setImportText] = useState("");
  const [preview, setPreview] = useState<OutlineImportPreviewData | null>(null);
  const query = useQuery({ queryKey: ["outlines"], queryFn: listOutlines });
  const create = useMutation({
    mutationFn: (title: string) => createOutline(title),
    onSuccess: async result => {
      await client.invalidateQueries({ queryKey: ["outlines"] });
      navigate(`/outlines/${result.project.id}`);
    },
  });
  const parse = useMutation({
    mutationFn: () => previewOutlineImport({
      title: "Imported outline",
      text: importText,
      format: /^\s*#/m.test(importText) ? "markdown" : "text",
    }),
    onSuccess: result => setPreview(result),
  });
  const confirm = useMutation({
    mutationFn: (document: OutlineDocument) => confirmOutlineImport(preview!.token, document),
    onSuccess: async result => {
      setPreview(null);
      await client.invalidateQueries({ queryKey: ["outlines"] });
      navigate(`/outlines/${result.project.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Outlines</h1>
          <p className="mt-2 text-sm text-muted-foreground">Shape the story direction, then develop its volumes, chapters, and characters.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => create.mutate("Untitled outline")} disabled={create.isPending}>Blank outline</Button>
          <Button onClick={() => create.mutate("New story outline")} disabled={create.isPending}>Start with an idea</Button>
        </div>
      </header>
      {create.isError ? <p role="alert" className="text-sm text-destructive">{create.error instanceof Error ? create.error.message : "Failed to create outline. Try again."}</p> : null}

      <section className="space-y-3 border-b border-border/50 pb-5">
        <div>
          <h2 className="font-medium">Import Markdown or TXT</h2>
          <p className="mt-1 text-sm text-muted-foreground">Paste outline text, review the detected titles, hierarchy, and references, then create the project.</p>
        </div>
        <textarea
          aria-label="Outline text to import"
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Paste outline text. You'll be able to review the parsed result before importing."
          value={importText}
          onChange={event => setImportText(event.target.value)}
        />
        <Button variant="outline" disabled={!importText.trim() || parse.isPending} onClick={() => parse.mutate()}>
          {parse.isPending ? "Parsing…" : "Parse and preview"}
        </Button>
        {parse.isError ? <p role="alert" className="text-sm text-destructive">{parse.error instanceof Error ? parse.error.message : "Failed to parse text. Try again."}</p> : null}
        {preview ? (
          <OutlineImportPreview
            key={preview.token}
            preview={preview}
            isConfirming={confirm.isPending}
            error={confirm.error}
            onConfirm={document => confirm.mutate(document)}
          />
        ) : null}
      </section>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading outlines…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">Failed to load outlines. Try again later.</p>
      ) : query.data?.length ? (
        <ul className="divide-y divide-border/60">
          {query.data.map(item => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-5">
              <div>
                <h2 className="font-medium">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Revision v{item.currentVersion} · {new Date(item.updatedAt).toLocaleString("en-US")}</p>
              </div>
              <div className="flex items-center gap-2">
                {featureFlags.outlineFeedbackEnabled && !isMobileViewport && item.boundNovelId ? (
                  <Button asChild variant="ghost"><Link to={`/outlines/${item.id}#outline-feedback-panel`}>Chapter feedback</Link></Button>
                ) : null}
                <Button asChild variant="ghost"><Link to={`/outlines/${item.id}`}>Continue editing</Link></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section className="py-14 text-center">
          <h2 className="text-lg font-medium">Start with a story idea</h2>
          <p className="mt-2 text-sm text-muted-foreground">Outlines are saved separately; you don't need to create a novel first.</p>
        </section>
      )}
    </div>
  );
}
