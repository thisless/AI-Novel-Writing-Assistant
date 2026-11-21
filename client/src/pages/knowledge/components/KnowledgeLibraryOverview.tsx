import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CircleAlert,
  Database,
  LoaderCircle,
  RefreshCw,
  SearchCheck,
  Upload,
} from "lucide-react";
import {
  AssetLibraryHeader,
  AssetLibraryRecommendation,
  type AssetLibraryTone,
} from "@/components/assetLibrary";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { Button } from "@/components/ui/button";

type RecommendationAction = "clear_filters" | "open_documents" | "open_ops" | "retry" | "upload";

interface RecommendationState {
  action: RecommendationAction;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: AssetLibraryTone;
}

interface KnowledgeLibraryOverviewProps {
  activeJobCount: number;
  enabledCount: number;
  failedIndexDocumentCount: number;
  failedJobCount: number;
  hasFilters: boolean;
  isError: boolean;
  isLoading: boolean;
  searchableDocumentCount: number;
  selectedDocumentId?: string;
  visibleDocumentCount: number;
  onClearFilters: () => void;
  onOpenDocuments: () => void;
  onOpenOps: () => void;
  onRetry: () => void;
  onUpload: () => void;
}

function getRecommendation(props: KnowledgeLibraryOverviewProps): RecommendationState {
  if (props.isError) {
    return {
      action: "retry",
      description: "The document list is temporarily unavailable. Reloading will not modify existing documents or indexing tasks.",
      icon: CircleAlert,
      title: "Reload knowledge documents",
      tone: "danger",
    };
  }
  if (props.isLoading) {
    return {
      action: "open_documents",
      description: "Checking document and index status. A recommended next step will appear when loading is complete.",
      icon: LoaderCircle,
      title: "Loading knowledge documents",
      tone: "neutral",
    };
  }
  if (props.activeJobCount > 0) {
    return {
      action: "open_ops",
      description: `${props.activeJobCount} indexing tasks are running. Check their progress, and use indexed documents for creative work when possible.`,
      icon: RefreshCw,
      title: "View document sync progress",
      tone: "info",
    };
  }
  if (props.failedIndexDocumentCount > 0 || props.failedJobCount > 0) {
    return {
      action: "open_ops",
      description: "Some documents have not been indexed. Review the failure details and rebuild their indexes; other available documents can still be used.",
      icon: CircleAlert,
      title: "Resolve incomplete indexing",
      tone: "warning",
    };
  }
  if (props.visibleDocumentCount === 0 && props.hasFilters) {
    return {
      action: "clear_filters",
      description: "No documents match the current search or status filters. Clear the filters to see the full list.",
      icon: SearchCheck,
      title: "View other knowledge documents",
      tone: "neutral",
    };
  }
  if (props.visibleDocumentCount === 0) {
    return {
      action: "upload",
      description: "Upload a TXT document to create an index for analysis, planning, and drafting.",
      icon: Upload,
      title: "Add a creative resource",
      tone: "info",
    };
  }
  if (props.searchableDocumentCount === 0) {
    return {
      action: "open_documents",
      description: "There are no enabled, indexed documents yet. Enable a document or rebuild its index to use it in your work.",
      icon: Database,
      title: "Prepare a searchable document",
      tone: "warning",
    };
  }
  return {
    action: "open_documents",
    description: `${props.searchableDocumentCount} documents are searchable. View versions, test retrieval, or select a document to continue creating.`,
    icon: BookOpenCheck,
    title: "Choose a document and continue creating",
    tone: "success",
  };
}

export default function KnowledgeLibraryOverview(props: KnowledgeLibraryOverviewProps) {
  const recommendation = getRecommendation(props);
  const documentStatusUnavailable = props.isLoading || props.isError;

  const recommendationAction = (() => {
    switch (recommendation.action) {
      case "upload":
        return (
          <Button type="button" size="sm" onClick={props.onUpload}>
            <Upload className="h-4 w-4" />
            Upload document
          </Button>
        );
      case "retry":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onRetry}>
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        );
      case "clear_filters":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onClearFilters}>
            Clear filters
          </Button>
        );
      case "open_ops":
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onOpenOps}>
            View index status
          </Button>
        );
      default:
        if (props.isLoading) {
          return (
            <Button type="button" size="sm" variant="outline" disabled>
              Loading…
            </Button>
          );
        }
        return (
          <Button type="button" size="sm" variant="outline" onClick={props.onOpenDocuments}>
            View documents
          </Button>
        );
    }
  })();

  return (
    <>
      <AssetLibraryHeader
        icon={Database}
        context="Creative assets · Knowledge and search"
        title="Knowledge library"
        description="Manage reusable creative resources, review their index status, and bring reliable material into analysis, planning, and drafting."
        actions={(
          <>
            <Button type="button" onClick={props.onUpload}>
              <Upload className="h-4 w-4" />
              Upload document
            </Button>
            <OpenInCreativeHubButton
              bindings={{ knowledgeDocumentIds: props.selectedDocumentId ? [props.selectedDocumentId] : [] }}
              label="Send to Creative Hub"
            />
          </>
        )}
      />

      <section aria-label="Knowledge document status" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-muted/25 px-5 py-3">
        {[
          { label: props.hasFilters ? "Filtered results" : "All documents", value: documentStatusUnavailable ? "—" : props.visibleDocumentCount, dot: "bg-muted-foreground/45" },
          { label: "Enabled", value: documentStatusUnavailable ? "—" : props.enabledCount, dot: "bg-success" },
          { label: "Searchable", value: documentStatusUnavailable ? "—" : props.searchableDocumentCount, dot: "bg-success" },
          { label: "Syncing", value: props.activeJobCount, dot: props.failedJobCount > 0 ? "bg-destructive" : "bg-info" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden="true" />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
          </div>
        ))}
        {props.failedJobCount > 0 ? (
          <span className="text-xs text-destructive">{props.failedJobCount} indexing tasks need attention</span>
        ) : null}
      </section>

      {recommendation.tone !== "success" ? (
        <AssetLibraryRecommendation
          icon={recommendation.icon}
          title={recommendation.title}
          description={recommendation.description}
          tone={recommendation.tone}
          action={recommendationAction}
        />
      ) : null}
    </>
  );
}
