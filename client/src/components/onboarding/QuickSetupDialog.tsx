import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Loader2,
  PlugZap,
  ServerCog,
  Sparkles,
} from "lucide-react";
import type {
  CompleteQuickSetupRequest,
  QuickSetupProviderOption,
  QuickSetupStatus,
} from "@ai-novel/shared/types/onboarding";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { completeQuickSetup } from "@/api/onboarding";
import { previewCustomProviderModels } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLLMStore } from "@/store/llmStore";
import {
  shouldInitializeProviderSelection,
  shouldShowFirstNovelHandoff,
} from "./creationSetupState";

interface QuickSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: QuickSetupStatus | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  forceConfiguration?: boolean;
}

interface SetupForm {
  providerKind: "builtin" | "custom";
  provider: LLMProvider | "";
  customProviderName: string;
  apiKey: string;
  baseURL: string;
  model: string;
}

const EMPTY_FORM: SetupForm = {
  providerKind: "builtin",
  provider: "",
  customProviderName: "",
  apiKey: "",
  baseURL: "",
  model: "",
};

function providerDescription(provider: QuickSetupProviderOption): string {
  if (provider.id === "deepseek") return "Recommended: DeepSeek Flash for high-quality Chinese long-form writing and fast responses";
  if (provider.id === "ollama") return "Use a local model. No API key required.";
  if (provider.id === "openai") return "A good fit for general planning, drafting, and structured tasks";
  return provider.configured ? "Already configured. You can test it and set it as the global default." : "Configure this provider for the full novel production workflow.";
}

export default function QuickSetupDialog(props: QuickSetupDialogProps) {
  const queryClient = useQueryClient();
  const llmStore = useLLMStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<SetupForm>(EMPTY_FORM);
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [customModelsMessage, setCustomModelsMessage] = useState("");
  const [showAllProviderChoices, setShowAllProviderChoices] = useState(false);

  useEffect(() => {
    if (props.open && props.forceConfiguration) {
      setStep(1);
    }
  }, [props.forceConfiguration, props.open]);

  const selectedProvider = useMemo(
    () => props.status?.providers.find((provider) => provider.id === form.provider) ?? null,
    [form.provider, props.status?.providers],
  );
  const recommendedProvider = useMemo(
    () => props.status?.providers.find((provider) => provider.id === props.status?.selectedProvider)
      ?? props.status?.providers.find((provider) => provider.id === "deepseek")
      ?? props.status?.providers[0]
      ?? null,
    [props.status?.providers, props.status?.selectedProvider],
  );
  const preferredProvider = selectedProvider ?? recommendedProvider;
  const providerChoices: QuickSetupProviderOption[] = showAllProviderChoices
    ? props.status?.providers ?? []
    : preferredProvider ? [preferredProvider] : [];
  const modelOptions = form.providerKind === "custom"
    ? customModels
    : selectedProvider?.models ?? [];

  useEffect(() => {
    if (!shouldInitializeProviderSelection({
      open: props.open,
      statusAvailable: Boolean(props.status),
      providerKind: form.providerKind,
      provider: form.provider,
    })) {
      return;
    }
    if (!props.status) return;
    const preferred = props.status.providers.find(
      (provider) => provider.id === props.status?.selectedProvider,
    ) ?? props.status.providers.find((provider) => provider.id === "deepseek")
      ?? props.status.providers[0];
    if (!preferred) return;
    setForm({
      providerKind: preferred.kind,
      provider: preferred.id,
      customProviderName: preferred.kind === "custom" ? preferred.name : "",
      apiKey: "",
      baseURL: preferred.currentBaseURL || preferred.defaultBaseURL,
      model: preferred.currentModel || preferred.defaultModel,
    });
  }, [form.provider, form.providerKind, props.open, props.status]);

  const completeMutation = useMutation({
    mutationFn: (payload: CompleteQuickSetupRequest) => completeQuickSetup(payload),
    onSuccess: async (response) => {
      if (response.data) {
        llmStore.setSelection({
          provider: response.data.provider,
          model: response.data.model,
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.quickSetup }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeys }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.llmSelection }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRoutes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.modelRouteConnectivity }),
        queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.firstNovel }),
      ]);
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => previewCustomProviderModels({
      key: form.apiKey.trim() || undefined,
      baseURL: form.baseURL.trim(),
    }),
    onSuccess: (response) => {
      const models = response.data?.models ?? [];
      setCustomModels(models);
      setCustomModelsMessage(models.length > 0 ? `Found ${models.length} available models.` : "The API returned no model list. You can enter a model manually.");
      setForm((current) => ({ ...current, model: current.model.trim() || models[0] || "" }));
    },
    onError: (error) => {
      setCustomModels([]);
      setCustomModelsMessage(error instanceof Error ? error.message : "Failed to fetch the model list. You can enter a model name manually.");
    },
  });

  const chooseProvider = (provider: QuickSetupProviderOption) => {
    setForm({
      providerKind: provider.kind,
      provider: provider.id,
      customProviderName: provider.kind === "custom" ? provider.name : "",
      apiKey: "",
      baseURL: provider.currentBaseURL || provider.defaultBaseURL,
      model: provider.currentModel || provider.defaultModel,
    });
    setCustomModels([]);
    setCustomModelsMessage("");
  };

  const chooseCustom = (continueToConnection = false) => {
    setForm({
      providerKind: "custom",
      provider: "",
      customProviderName: "",
      apiKey: "",
      baseURL: "",
      model: "",
    });
    setCustomModels([]);
    setCustomModelsMessage("");
    setShowAllProviderChoices(false);
    if (continueToConnection) {
      setStep(2);
    }
  };

  const canContinueProvider = form.providerKind === "custom" || Boolean(form.provider);
  const requiresApiKey = form.providerKind === "builtin" && selectedProvider?.requiresApiKey !== false;
  const hasSavedKey = selectedProvider?.configured === true;
  const canSubmit = Boolean(
    form.model.trim()
    && form.baseURL.trim()
    && (form.providerKind === "builtin" ? form.provider : form.customProviderName.trim())
    && (!requiresApiKey || form.apiKey.trim() || hasSavedKey),
  );
  const showFirstNovelHandoff = shouldShowFirstNovelHandoff({
    configurationSucceeded: completeMutation.isSuccess,
    forceConfiguration: props.forceConfiguration === true,
  });

  const submit = () => {
    setStep(3);
    completeMutation.mutate({
      providerKind: form.providerKind,
      ...(form.provider ? { provider: form.provider } : {}),
      ...(form.providerKind === "custom" ? { customProviderName: form.customProviderName.trim() } : {}),
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
      baseURL: form.baseURL.trim(),
      model: form.model.trim(),
    });
  };

  const footer = props.loading || props.error || (props.status?.readyForCreation && !props.forceConfiguration)
    ? null
    : step === 1
      ? (
          <Button onClick={() => setStep(2)} disabled={!canContinueProvider}>
            Enter connection details <ArrowRight className="h-4 w-4" />
          </Button>
        )
      : step === 2
        ? (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back to provider selection</Button>
              <Button onClick={submit} disabled={!canSubmit}>Test and finish setup <PlugZap className="h-4 w-4" /></Button>
            </>
          )
        : completeMutation.isSuccess
          ? (
              showFirstNovelHandoff
                ? (
                    <>
                      <Button variant="outline" asChild><Link to="/help">View the writing guide</Link></Button>
                      <Button asChild><Link to="/novels/auto-director">Start your first novel with one sentence <ArrowRight className="h-4 w-4" /></Link></Button>
                    </>
                  )
                : (
                    <>
                      <Button variant="outline" asChild><Link to="/settings">View advanced settings</Link></Button>
                      <Button onClick={() => props.onOpenChange(false)}>Start creating <Sparkles className="h-4 w-4" /></Button>
                    </>
                  )
            )
          : completeMutation.isError
            ? (
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Edit configuration</Button>
              )
            : null;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <AppDialogContent
        className="max-w-3xl"
        title="Set up your AI writing environment"
        description="Configure one text model to automatically prepare task routing for planning, drafting, review, and repair."
        footer={footer}
        footerClassName="gap-2"
      >
        <div className="mb-6 grid grid-cols-3 gap-2">
          {[
            { index: 1, label: "Choose provider" },
            { index: 2, label: "Connect model" },
            { index: 3, label: "Test and finish" },
          ].map((item) => (
            <div key={item.index} className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              step === item.index ? "border-primary bg-primary/5 text-primary" : step > item.index ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-muted-foreground",
            )}>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">
                  {step > item.index ? <Check className="h-3 w-3" /> : item.index}
                </span>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {props.loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking your writing environment
          </div>
        ) : props.error ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <CircleAlert className="h-9 w-9 text-amber-600" />
            <div>
              <div className="font-semibold">Unable to load model settings</div>
              <div className="mt-1 text-sm text-muted-foreground">Reload to check whether your environment is ready for writing.</div>
            </div>
            <Button variant="outline" onClick={props.onRetry}>Reload</Button>
          </div>
        ) : props.status?.readyForCreation && !props.forceConfiguration && !completeMutation.isSuccess ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <div>
              <div className="text-lg font-semibold">Your writing environment is ready</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {props.status.selectedProvider} · {props.status.selectedModel}. All {props.status.routeCoverage.total} core task types are ready.
              </div>
            </div>
            <Button onClick={() => props.onOpenChange(false)}>Continue creating</Button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">{showAllProviderChoices ? "Choose a built-in model provider" : "Start with a recommended provider"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {showAllProviderChoices
                  ? "Choose a provider, then enter its connection details."
                  : "Configure one text model to get started. You can add other providers later."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {providerChoices.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={cn(
                    "rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5",
                    form.provider === provider.id && "border-primary bg-primary/5 ring-1 ring-primary/20",
                  )}
                  onClick={() => chooseProvider(provider)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{provider.name}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{providerDescription(provider)}</div>
                    </div>
                    {form.provider === provider.id
                      ? <Badge>Selected</Badge>
                      : provider.configured ? <Badge variant="outline">Configured</Badge> : null}
                  </div>
                <div className="mt-3 text-xs text-muted-foreground">Recommended model: {provider.currentModel || provider.defaultModel}</div>
              </button>
              ))}
              {!showAllProviderChoices ? (
                <button
                  type="button"
                  className="rounded-xl border border-dashed p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => setShowAllProviderChoices(true)}
                >
                  <div className="flex items-center gap-2 font-semibold"><PlugZap className="h-4 w-4" /> View all built-in providers</div>
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">Choose a provider where you already have an account, then enter its connection details.</div>
                </button>
              ) : null}
              <button
                type="button"
                className={cn(
                  "rounded-xl border border-dashed p-4 text-left transition hover:border-primary/50 hover:bg-primary/5",
                  form.providerKind === "custom" && !form.provider && "border-primary bg-primary/5 ring-1 ring-primary/20",
                )}
                onClick={() => chooseCustom(true)}
              >
                <div className="flex items-center gap-2 font-semibold"><ServerCog className="h-4 w-4" /> Add a custom provider <ArrowRight className="h-4 w-4" /></div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">Add a separate provider configuration for a relay service, local gateway, or OpenAI-compatible API.</div>
              </button>
            </div>
            {showAllProviderChoices ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllProviderChoices(false)}>
                <ArrowLeft className="h-4 w-4" /> Back to recommendations
              </Button>
            ) : null}
          </div>
        ) : step === 2 ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">{form.providerKind === "custom" ? "Add a custom provider" : `Connect ${selectedProvider?.name ?? "model provider"}`}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Your API key is stored locally or in the server's secret store and will not be shown in the completion summary.</p>
              {form.providerKind === "custom" ? (
                <p className="mt-1 text-xs text-muted-foreground">The provider name, API URL, and model will be saved separately without replacing any built-in provider.</p>
              ) : null}
            </div>
            {form.providerKind === "custom" ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Provider name</span>
                <Input value={form.customProviderName} placeholder="For example: My model gateway" onChange={(event) => setForm((current) => ({ ...current, customProviderName: event.target.value }))} />
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4" /> API key {requiresApiKey ? "" : "(optional)"}</span>
              <Input
                type="password"
                autoComplete="off"
                value={form.apiKey}
                placeholder={hasSavedKey ? "Leave blank to keep using the saved key" : requiresApiKey ? "Enter API key" : "Optional for local endpoints"}
                onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">API URL</span>
              <Input value={form.baseURL} placeholder="https://api.example.com/v1" onChange={(event) => setForm((current) => ({ ...current, baseURL: event.target.value }))} />
            </label>
            {form.providerKind === "custom" ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => previewMutation.mutate()} disabled={!form.baseURL.trim() || previewMutation.isPending}>
                  {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerCog className="h-4 w-4" />}
                  Fetch model list
                </Button>
                {customModelsMessage ? <span className="text-xs text-muted-foreground">{customModelsMessage}</span> : null}
              </div>
            ) : null}
            {modelOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {modelOptions.slice(0, 8).map((model) => (
                  <button
                    key={model}
                    type="button"
                    className={cn("rounded-full border px-3 py-1.5 text-xs", form.model === model && "border-primary bg-primary/10 text-primary")}
                    onClick={() => setForm((current) => ({ ...current, model }))}
                  >
                    {model}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Text model</span>
              <Input value={form.model} placeholder="Select a model above or enter a model name" onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} />
            </label>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
              After setup, this model will be the initial default for core tasks such as planning, drafting, review, repair, replanning, and summaries.
            </div>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
            {completeMutation.isPending ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Testing text and structured output</div>
                  <div className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">After testing, the system will prepare all core writing tasks automatically. You do not need to configure each route separately.</div>
                </div>
              </>
            ) : completeMutation.isSuccess ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-700" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Writing environment configured</div>
                  <div className="mt-2 text-sm text-muted-foreground">{completeMutation.data.data?.model} is ready for the full novel production workflow.</div>
                </div>
                {showFirstNovelHandoff ? (
                  <div className="w-full max-w-xl rounded-2xl border border-primary/15 bg-primary/[0.035] p-5 text-left shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-primary">Start your first novel</div>
                      <Link to="/settings" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Configure more models</Link>
                    </div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">Start with a story idea</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Tell AI what you want to write. It will suggest directions, then help you develop the story, world, characters, and first chapter.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {["Share your idea", "Choose a direction", "Read the first chapter"].map((label, index) => (
                        <div key={label} className="rounded-xl border bg-background/80 px-3 py-2.5 text-sm font-medium">
                          <span className="mr-2 text-primary">{index + 1}</span>{label}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                  <CircleAlert className="h-8 w-8 text-amber-700" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Model test failed</div>
                  <div className="mt-2 max-w-lg text-sm leading-6 text-destructive">
                    {completeMutation.error instanceof Error ? completeMutation.error.message : "Check the API key, URL, and model name, then try again."}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
