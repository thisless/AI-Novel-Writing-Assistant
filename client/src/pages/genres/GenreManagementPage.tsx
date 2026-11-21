import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CircleAlert,
  FileText,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Tags,
} from "lucide-react";
import { deleteGenre, flattenGenreTreeOptions, getGenreTree, type GenreTreeNode } from "@/api/genre";
import { queryKeys } from "@/api/queryKeys";
import {
  AssetLibraryEmptyState,
  AssetLibraryHeader,
  AssetLibraryRecommendation,
  AssetLibrarySection,
  AssetLibraryStatusGrid,
  type AssetLibraryStatusItem,
} from "@/components/assetLibrary";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import GenreCreateDialog from "./components/GenreCreateDialog";
import GenreEditDialog from "./components/GenreEditDialog";
import GenreTreeBrowser from "./components/GenreTreeBrowser";
import {
  collectDescendantIds,
  countGenreNovelBindingsInSubtree,
  countGenres,
  findGenreNode,
} from "./genreManagement.shared";

export default function GenreManagementPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState("");
  const [editingGenreId, setEditingGenreId] = useState("");

  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });

  const genreTree = genreTreeQuery.data?.data ?? [];
  const parentOptions = useMemo(() => flattenGenreTreeOptions(genreTree), [genreTree]);
  const totalGenres = useMemo(() => countGenres(genreTree), [genreTree]);
  const linkedNovelCount = useMemo(
    () => genreTree.reduce((total, node) => total + countGenreNovelBindingsInSubtree(node), 0),
    [genreTree],
  );
  const describedGenreCount = useMemo(
    () => parentOptions.filter((option) => Boolean(option.description?.trim())).length,
    [parentOptions],
  );
  const firstGenreWithoutDescription = useMemo(
    () => parentOptions.find((option) => !option.description?.trim()) ?? null,
    [parentOptions],
  );
  const editingGenre = useMemo(
    () => (editingGenreId ? findGenreNode(genreTree, editingGenreId) : null),
    [editingGenreId, genreTree],
  );
  const blockedParentIds = useMemo(
    () => editingGenre ? new Set([editingGenre.id, ...collectDescendantIds(editingGenre)]) : new Set<string>(),
    [editingGenre],
  );
  const statusUnavailable = genreTreeQuery.isLoading || genreTreeQuery.isError;
  const statusItems = useMemo<AssetLibraryStatusItem[]>(() => [
    {
      key: "genres",
      label: "Genre frameworks",
      value: statusUnavailable ? "—" : totalGenres,
      detail: "Categories available for novels",
      icon: Tags,
      tone: statusUnavailable ? "neutral" : "info",
    },
    {
      key: "roots",
      label: "Root categories",
      value: statusUnavailable ? "—" : genreTree.length,
      detail: "Define the main creative directions",
      icon: Layers3,
    },
    {
      key: "novels",
      label: "Linked novels",
      value: statusUnavailable ? "—" : linkedNovelCount,
      detail: "Works currently using these genres",
      icon: BookOpen,
      tone: statusUnavailable ? "neutral" : linkedNovelCount > 0 ? "success" : "neutral",
    },
    {
      key: "descriptions",
      label: "Descriptions complete",
      value: statusUnavailable ? "—" : `${describedGenreCount}/${totalGenres}`,
      detail: "Genres with a clearly defined position",
      icon: FileText,
      tone: statusUnavailable
        ? "neutral"
        : totalGenres > describedGenreCount ? "warning" : "success",
    },
  ], [
    describedGenreCount,
    genreTree.length,
    linkedNovelCount,
    statusUnavailable,
    totalGenres,
  ]);

  const deleteMutation = useMutation({
    mutationFn: (genreId: string) => deleteGenre(genreId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.genres.all });
      toast.success("Genre framework deleted.");
    },
  });

  const handleCreateRoot = () => {
    setDefaultParentId("");
    setCreateDialogOpen(true);
  };

  const handleCreateChild = (parentId: string) => {
    setDefaultParentId(parentId);
    setCreateDialogOpen(true);
  };

  const handleDelete = (genre: GenreTreeNode) => {
    const descendantCount = collectDescendantIds(genre).length;
    const message = descendantCount > 0
      ? `Delete the genre framework “${genre.name}”? This will also delete its ${descendantCount} subcategories. This action cannot be undone.`
      : `Delete the genre framework “${genre.name}”? This action cannot be undone.`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(genre.id);
  };

  const recommendation = genreTreeQuery.isError ? (
    <AssetLibraryRecommendation
      icon={CircleAlert}
      title="Reload genre frameworks"
      description="The genre structure is temporarily unavailable. Reload to continue viewing and editing genres."
      tone="danger"
      action={(
        <Button type="button" variant="outline" onClick={() => void genreTreeQuery.refetch()}>
          Reload
        </Button>
      )}
    />
  ) : genreTreeQuery.isLoading ? (
    <AssetLibraryRecommendation
      icon={LoaderCircle}
      title="Checking genre framework status"
      description="Once loading is complete, recommendations will be based on genre coverage and description quality."
      tone="neutral"
    />
  ) : totalGenres === 0 ? (
    <AssetLibraryRecommendation
      icon={Sparkles}
      title="Create your first genre framework"
      description="Describe the creative directions you want to cover. Build the hierarchy manually or have AI draft one for you to refine."
      action={(
        <Button type="button" onClick={handleCreateRoot}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create a genre framework
        </Button>
      )}
    />
  ) : firstGenreWithoutDescription ? (
    <AssetLibraryRecommendation
      icon={FileText}
      title={`Add a description for “${firstGenreWithoutDescription.name}”`}
      description="Clarify the work's positioning, reader expectations, and central conflict so AI can better understand the genre during setup and planning."
      tone="warning"
      action={(
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditingGenreId(firstGenreWithoutDescription.id)}
        >
          Add description
        </Button>
      )}
    />
  ) : (
    <AssetLibraryRecommendation
      icon={Sparkles}
      title="Genres are ready for novel setup"
      description="All existing genres have descriptions. Add a root genre or subcategory when you need to cover a new creative direction."
      tone="success"
      action={(
        <Button type="button" variant="outline" onClick={handleCreateRoot}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Expand genres
        </Button>
      )}
    />
  );

  return (
    <div className="space-y-5">
      <GenreCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentOptions={parentOptions}
        defaultParentId={defaultParentId}
      />

      <GenreEditDialog
        open={Boolean(editingGenre)}
        genre={editingGenre}
        onOpenChange={(open) => {
          if (!open) {
            setEditingGenreId("");
          }
        }}
        parentOptions={parentOptions}
        blockedParentIds={blockedParentIds}
      />

      <AssetLibraryHeader
        icon={Tags}
        context="Creative assets / Novel positioning"
        title="Genre library"
        description="Manage reusable genre positioning and category hierarchies. Choose a suitable genre framework when starting a novel so AI understands the work's type, reader expectations, and creative direction."
        actions={(
          <Button type="button" onClick={handleCreateRoot}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New genre framework
          </Button>
        )}
      />

      <AssetLibraryStatusGrid items={statusItems} />

      {recommendation}

      <AssetLibrarySection
        title="Genre structure"
        description="Expand categories in the left-hand tree, then view details and manage nodes on the right. To delete a category used by a novel, first update the linked work."
      >
        {genreTreeQuery.isLoading ? (
          <div
            className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-border px-5 py-8 text-center"
            role="status"
          >
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <div className="mt-3 text-sm font-semibold text-foreground">Loading genre structure</div>
            <div className="mt-1 text-sm text-muted-foreground">Please wait while genre and novel links are synchronized.</div>
          </div>
        ) : null}

        {genreTreeQuery.isError ? (
          <AssetLibraryEmptyState
            icon={CircleAlert}
            title="Genre frameworks are temporarily unavailable"
            description="Check the service connection and reload. Existing genres will not be affected."
            action={(
              <Button type="button" variant="outline" onClick={() => void genreTreeQuery.refetch()}>
                Reload
              </Button>
            )}
          />
        ) : null}

        {!genreTreeQuery.isLoading && !genreTreeQuery.isError && genreTree.length === 0 ? (
          <AssetLibraryEmptyState
            icon={Tags}
            title="No genres available for novel setup"
            description="Create a primary genre first. Enter it manually or describe your creative direction and let AI draft a genre tree with subcategories."
            action={(
              <Button type="button" onClick={handleCreateRoot}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create the first genre tree
              </Button>
            )}
          />
        ) : null}

        {!genreTreeQuery.isLoading && !genreTreeQuery.isError && genreTree.length > 0 ? (
          <GenreTreeBrowser
            nodes={genreTree}
            initialSelectedId={searchParams.get("selectedId") ?? ""}
            onCreateChild={handleCreateChild}
            onEdit={setEditingGenreId}
            onDelete={handleDelete}
            deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
          />
        ) : null}
      </AssetLibrarySection>
    </div>
  );
}
