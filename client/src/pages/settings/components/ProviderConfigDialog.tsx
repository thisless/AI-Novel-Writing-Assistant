import type { Dispatch, SetStateAction } from "react";
import { Bot, Image, KeyRound, Link2, SlidersHorizontal } from "lucide-react";
import type { APIKeyStatus } from "@/api/settings";
import type { ProviderAuthMode } from "@ai-novel/shared/types/llm";
import SearchableSelect from "@/components/common/SearchableSelect";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ProviderRequestLimitFields from "./ProviderRequestLimitFields";

export interface ProviderFormState {
  displayName: string;
  key: string;
  model: string;
  imageModel: string;
  baseURL: string;
  authMode: ProviderAuthMode;
  concurrencyLimit: string;
  requestIntervalMs: string;
}

interface ProviderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreatingCustomProvider: boolean;
  isCustomDialog: boolean;
  editingConfig?: APIKeyStatus;
  form: ProviderFormState;
  setForm: Dispatch<SetStateAction<ProviderFormState>>;
  selectableModels: string[];
  previewModelsResult: string;
  isPreviewingModels: boolean;
  onClearPreviewModels: () => void;
  onPreviewModels: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  onTest: () => void;
  testDisabled: boolean;
  testResult: string;
  onDeleteCustomProvider: () => void;
  deleteDisabled: boolean;
  deleteLabel: string;
}

export default function ProviderConfigDialog({
  open,
  onOpenChange,
  isCreatingCustomProvider,
  isCustomDialog,
  editingConfig,
  form,
  setForm,
  selectableModels,
  previewModelsResult,
  isPreviewingModels,
  onClearPreviewModels,
  onPreviewModels,
  onSubmit,
  submitDisabled,
  submitLabel,
  onTest,
  testDisabled,
  testResult,
  onDeleteCustomProvider,
  deleteDisabled,
  deleteLabel,
}: ProviderConfigDialogProps) {
  const primaryModelLabel = isCreatingCustomProvider ? "Default model (optional)" : isCustomDialog ? "Default model" : "Model name";
  const canSelectListedModels = selectableModels.length > 0;
  const imageModelOptions = editingConfig?.imageModels ?? [];
  const canSelectImageModels = imageModelOptions.length > 0;
  const modelGuidance = editingConfig?.provider === "deepseek"
    ? "DeepSeek Flash is recommended for a balance of Chinese long-form writing quality and response speed. You can also choose another available model."
    : isCreatingCustomProvider
      ? "The first available model is selected after retrieving the model list. If the API does not return a list, enter a model manually."
      : editingConfig?.kind === "custom" && !canSelectListedModels
        ? "Select “Refresh models” on the provider card to retrieve the list, or enter a default model manually."
        : "If the model you want is not listed, you can enter it manually.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-lg"
        title={isCreatingCustomProvider ? "Add custom provider" : isCustomDialog ? "Edit custom provider" : "Configure provider"}
        footer={(
          <>
            <Button className="w-full sm:w-auto" onClick={onSubmit} disabled={submitDisabled}>
              {submitLabel}
            </Button>

            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onTest}
              disabled={testDisabled}
            >
              Test connection
            </Button>

            {editingConfig?.kind === "custom" ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={onDeleteCustomProvider}
                disabled={deleteDisabled}
              >
                {deleteLabel}
              </Button>
            ) : null}
          </>
        )}
        footerClassName="gap-2"
      >
        <div className="space-y-5">
          {isCustomDialog ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Provider name</div>
              <Input
                value={form.displayName}
                placeholder="e.g. My model gateway"
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>
          ) : null}

          {(isCustomDialog || editingConfig?.requiresApiKey === false) ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The API key is optional. Enter an API URL to retrieve available models, and one will be selected by default.
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><KeyRound className="h-3.5 w-3.5" /> API Key</div>
            <Input
              type="password"
              value={form.key}
              placeholder={editingConfig?.isConfigured ? "Leave blank to keep the saved API key" : "Enter API key"}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, key: event.target.value }));
                if (isCreatingCustomProvider) {
                  onClearPreviewModels();
                }
              }}
            />
          </div>

          {isCustomDialog ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Authentication method</div>
              <SearchableSelect
                value={form.authMode}
                onValueChange={(value) => setForm((prev) => ({
                  ...prev,
                  authMode: value as ProviderAuthMode,
                }))}
                options={[
                  { value: "bearer", label: "Authorization: Bearer" },
                  { value: "x-api-key", label: "x-api-key" },
                  { value: "none", label: "No authentication" },
                ]}
                placeholder="Select an authentication method"
              />
              <div className="text-xs text-muted-foreground">
                Choose the method specified by the API documentation. Most OpenAI-compatible APIs use Authorization: Bearer.
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> API URL</div>
            <Input
              value={form.baseURL}
              placeholder={editingConfig?.defaultBaseURL ?? "https://api.example.com/v1"}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  baseURL: event.target.value,
                  model: isCreatingCustomProvider ? "" : prev.model,
                }));
                if (isCreatingCustomProvider) {
                  onClearPreviewModels();
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              {isCreatingCustomProvider
                ? "Enter an OpenAI-compatible API URL, usually ending in /v1. A common local Ollama URL is http://127.0.0.1:11434/v1."
                : "Leave blank to use the default URL. A common local Ollama URL is http://127.0.0.1:11434/v1."}
            </div>
          </div>

          {isCreatingCustomProvider ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={onPreviewModels}
                disabled={isPreviewingModels || !form.baseURL.trim()}
              >
                {isPreviewingModels ? "Retrieving…" : "Get model list"}
              </Button>
              {previewModelsResult ? (
                <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {previewModelsResult}
                </div>
              ) : null}
            </div>
          ) : null}

          {canSelectListedModels ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Available models</div>
              <SearchableSelect
                value={form.model}
                onValueChange={(value) => setForm((prev) => ({ ...prev, model: value }))}
                options={selectableModels.map((model) => ({ value: model }))}
                placeholder="Select a model"
                searchPlaceholder="Search models"
                emptyText="No models available"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Bot className="h-3.5 w-3.5" /> {primaryModelLabel}</div>
            <div className="text-xs text-muted-foreground">{modelGuidance}</div>
          </div>
          <Input
            value={form.model}
            placeholder="Or enter a model name"
            onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
          />

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Image className="h-3.5 w-3.5" /> Image model (optional)</div>
              <div className="text-xs text-muted-foreground">
                Once configured, this provider can be selected for character image generation. Leave blank to use it for text models only.
              </div>
            </div>
            {canSelectImageModels ? (
              <div className="space-y-1">
                <SearchableSelect
                  value={form.imageModel}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, imageModel: value }))}
                  options={imageModelOptions.map((model) => ({ value: model }))}
                  placeholder="Select an image model"
                  searchPlaceholder="Search image models"
                  emptyText="No image models available"
                />
              </div>
            ) : null}
            <Input
              value={form.imageModel}
              placeholder={editingConfig?.defaultImageModel ?? "Enter an image model name"}
              onChange={(event) => setForm((prev) => ({ ...prev, imageModel: event.target.value }))}
            />
            <div className="text-xs text-muted-foreground">
              Image generation uses this provider's OpenAI-compatible image API.
            </div>
          </div>

          <div className="rounded-xl border border-dashed bg-muted/10 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Request limits</div>
            <ProviderRequestLimitFields
              concurrencyLimit={form.concurrencyLimit}
              requestIntervalMs={form.requestIntervalMs}
              onChange={(value) => setForm((prev) => ({ ...prev, ...value }))}
            />
          </div>

          {testResult ? <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{testResult}</div> : null}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
