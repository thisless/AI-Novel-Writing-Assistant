import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider, ProviderAuthMode, ReasoningEffort } from "@ai-novel/shared/types/llm";
import {
  type APIKeyStatus,
  createCustomProvider,
  deleteCustomProvider,
  getAPIKeySettings,
  getProviderBalances,
  previewCustomProviderModels,
  refreshProviderBalance,
  refreshProviderModelList,
  saveAPIKeySetting,
  testLLMConnection,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import ProviderConfigDialog, { type ProviderFormState } from "./components/ProviderConfigDialog";
import ProviderSettingsSection from "./components/ProviderSettingsSection";
import SettingsActionResult from "./SettingsActionResult";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

function formatConnectionTestResult(response: Awaited<ReturnType<typeof testLLMConnection>>): string {
  const latency = response.data?.latency ?? 0;
  const plain = response.data?.plain;
  const structured = response.data?.structured;
  const plainText = plain
    ? plain.ok
      ? `Standard connectivity healthy${plain.latency != null ? ` (${plain.latency} ms)` : ""}`
      : `Standard connectivity failed${plain.error ? `: ${plain.error}` : ""}`
    : "Standard connectivity not tested";
  const structuredText = structured
    ? structured.ok
      ? `Structured output healthy${structured.strategy ? `, strategy: ${structured.strategy}` : ""}${structured.reasoningForcedOff ? ", reasoning forced off" : ""}`
      : `Structured output failed${structured.errorCategory ? `, category: ${structured.errorCategory}` : ""}${structured.error ? `: ${structured.error}` : ""}`
    : "Structured output not tested";
  return `Connection successful, total time ${latency} ms · ${plainText} · ${structuredText}`;
}

export default function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState("");
  const [isCreatingCustomProvider, setIsCreatingCustomProvider] = useState(false);
  const [form, setForm] = useState<ProviderFormState>({
    displayName: "",
    key: "",
    model: "",
    imageModel: "",
    baseURL: "",
    authMode: "bearer",
    concurrencyLimit: "0",
    requestIntervalMs: "0",
  });
  const [dialogTestResult, setDialogTestResult] = useState("");
  const [providerTestResults, setProviderTestResults] = useState<Record<string, string>>({});
  const [actionResult, setActionResult] = useState("");
  const [previewModels, setPreviewModels] = useState<string[]>([]);
  const [previewModelsResult, setPreviewModelsResult] = useState("");

  const apiKeySettingsQuery = useQuery({
    queryKey: queryKeys.settings.apiKeys,
    queryFn: getAPIKeySettings,
  });

  const providerBalancesQuery = useQuery({
    queryKey: queryKeys.settings.apiKeyBalances,
    queryFn: getProviderBalances,
  });

  const providerConfigs = useMemo(() => apiKeySettingsQuery.data?.data ?? [], [apiKeySettingsQuery.data?.data]);
  const editingConfig = useMemo(
    () => providerConfigs.find((item) => item.provider === editingProvider),
    [editingProvider, providerConfigs],
  );
  const isDialogOpen = isCreatingCustomProvider || Boolean(editingProvider);
  const isCustomDialog = isCreatingCustomProvider || editingConfig?.kind === "custom";
  const modelOptions = editingConfig?.models ?? [];
  const selectableModels = isCreatingCustomProvider ? previewModels : modelOptions;
  const resetDialogState = () => {
    setEditingProvider("");
    setIsCreatingCustomProvider(false);
    setForm({
      displayName: "",
      key: "",
      model: "",
      imageModel: "",
      baseURL: "",
      authMode: "bearer",
      concurrencyLimit: "0",
      requestIntervalMs: "0",
    });
    setDialogTestResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const invalidateProviderQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeys }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances }),
      queryClient.invalidateQueries({ queryKey: queryKeys.llm.providers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.quickSetup }),
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.firstNovel }),
    ]);
  };

  const updateProviderModelsInCache = (provider: string, models: string[], currentModel: string) => {
    queryClient.setQueryData<ApiResponse<APIKeyStatus[]>>(queryKeys.settings.apiKeys, (previous) => {
      if (!previous?.data) {
        return previous;
      }
      return {
        ...previous,
        data: previous.data.map((item) => item.provider === provider
          ? {
            ...item,
            models,
            currentModel,
          }
          : item),
      };
    });
  };

  const invalidateProviderAuxiliaryQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances }),
      queryClient.invalidateQueries({ queryKey: queryKeys.llm.providers }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: {
      provider: LLMProvider;
      displayName?: string;
      key?: string;
      model?: string;
      imageModel?: string;
      baseURL?: string;
      authMode?: ProviderAuthMode;
      concurrencyLimit?: number;
      requestIntervalMs?: number;
    }) =>
      saveAPIKeySetting(payload.provider, {
        displayName: payload.displayName,
        key: payload.key,
        model: payload.model,
        imageModel: payload.imageModel,
        baseURL: payload.baseURL,
        authMode: payload.authMode,
        concurrencyLimit: payload.concurrencyLimit,
        requestIntervalMs: payload.requestIntervalMs,
      }),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Saved.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to save.");
    },
  });

  const createCustomProviderMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      key?: string;
      model?: string;
      imageModel?: string;
      baseURL: string;
      authMode?: ProviderAuthMode;
      concurrencyLimit?: number;
      requestIntervalMs?: number;
    }) => createCustomProvider(payload),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Custom provider created.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to create custom provider.");
    },
  });

  const previewCustomProviderModelsMutation = useMutation({
    mutationFn: (payload: { key?: string; baseURL: string; authMode?: ProviderAuthMode }) => previewCustomProviderModels(payload),
    onSuccess: (response) => {
      const models = response.data?.models ?? [];
      setPreviewModels(models);
      setPreviewModelsResult(response.message ?? `Retrieved ${models.length} models.`);
      setForm((prev) => ({
        ...prev,
        model: prev.model.trim() || models[0] || "",
      }));
    },
    onError: (error) => {
      setPreviewModels([]);
      setPreviewModelsResult(error instanceof Error ? error.message : "Failed to retrieve the model list.");
    },
  });

  const deleteCustomProviderMutation = useMutation({
    mutationFn: (provider: LLMProvider) => deleteCustomProvider(provider),
    onSuccess: async (response) => {
      resetDialogState();
      setActionResult(response.message ?? "Custom provider deleted.");
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to delete custom provider.");
    },
  });

  const removeProviderMutation = useMutation({
    mutationFn: async (provider: APIKeyStatus) => {
      if (provider.kind === "custom") {
        return deleteCustomProvider(provider.provider);
      }
      return saveAPIKeySetting(provider.provider, { isActive: false });
    },
    onSuccess: async (response, provider) => {
      setActionResult(response.message ?? (provider.kind === "builtin" ? "Provider removed from the list." : "Custom provider deleted."));
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to remove provider.");
    },
  });

  const testMutation = useMutation({
    mutationFn: testLLMConnection,
  });

  const refreshModelsMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderModelList(provider),
    onSuccess: async (response, provider) => {
      const count = response.data?.models?.length ?? 0;
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      if (response.data) {
        updateProviderModelsInCache(response.data.provider, response.data.models, response.data.currentModel);
      }
      setActionResult(`${providerName} model list refreshed (${count}).`);
      await invalidateProviderAuxiliaryQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to refresh the model list.");
    },
  });

  const modelControlsMutation = useMutation({
    mutationFn: (payload: {
      provider: LLMProvider;
      reasoningEnabled?: boolean;
      reasoningEffort?: ReasoningEffort;
      hiddenModels?: string[];
      message: string;
    }) => saveAPIKeySetting(payload.provider, {
      reasoningEnabled: payload.reasoningEnabled,
      reasoningEffort: payload.reasoningEffort,
      hiddenModels: payload.hiddenModels,
    }),
    onSuccess: async (_response, variables) => {
      const providerName = providerConfigs.find((item) => item.provider === variables.provider)?.name ?? variables.provider;
      setActionResult(`${providerName}：${variables.message}`);
      await invalidateProviderQueries();
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to update model settings.");
    },
  });

  const refreshBalanceMutation = useMutation({
    mutationFn: (provider: LLMProvider) => refreshProviderBalance(provider),
    onSuccess: async (response, provider) => {
      const providerName = providerConfigs.find((item) => item.provider === provider)?.name ?? provider;
      setActionResult(response.message ?? `${providerName} balance refreshed.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.apiKeyBalances });
    },
    onError: (error) => {
      setActionResult(error instanceof Error ? error.message : "Failed to refresh the balance.");
    },
  });

  const openBuiltInDialog = (provider: LLMProvider) => {
    const config = providerConfigs.find((item) => item.provider === provider);
    if (!config) {
      return;
    }
    setIsCreatingCustomProvider(false);
    setEditingProvider(provider);
    setForm({
      displayName: config.displayName ?? config.name,
      key: "",
      model: config.currentModel,
      imageModel: config.currentImageModel ?? config.defaultImageModel ?? "",
      baseURL: config.currentBaseURL,
      authMode: config.currentAuthMode,
      concurrencyLimit: String(config.concurrencyLimit ?? 0),
      requestIntervalMs: String(config.requestIntervalMs ?? 0),
    });
    setDialogTestResult("");
    setActionResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const openCreateCustomDialog = () => {
    setEditingProvider("");
    setIsCreatingCustomProvider(true);
    setForm({
      displayName: "",
      key: "",
      model: "",
      imageModel: "",
      baseURL: "",
      authMode: "bearer",
      concurrencyLimit: "0",
      requestIntervalMs: "0",
    });
    setDialogTestResult("");
    setActionResult("");
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const clearPreviewModels = () => {
    setPreviewModels([]);
    setPreviewModelsResult("");
  };

  const handlePreviewCustomModels = () => {
    setPreviewModelsResult("");
    previewCustomProviderModelsMutation.mutate({
      key: form.key.trim() ? form.key : undefined,
      baseURL: form.baseURL.trim(),
      authMode: form.authMode,
    });
  };

  const handleSubmitProviderDialog = () => {
    if (isCreatingCustomProvider) {
      createCustomProviderMutation.mutate({
        name: form.displayName.trim(),
        key: form.key.trim() ? form.key : undefined,
        model: form.model.trim() || undefined,
        imageModel: form.imageModel.trim(),
        baseURL: form.baseURL.trim(),
        authMode: form.authMode,
        concurrencyLimit: Number.parseInt(form.concurrencyLimit, 10) || 0,
        requestIntervalMs: Number.parseInt(form.requestIntervalMs, 10) || 0,
      });
      return;
    }
    if (!editingProvider) {
      return;
    }
    saveMutation.mutate({
      provider: editingProvider,
      displayName: isCustomDialog ? form.displayName.trim() || undefined : undefined,
      key: form.key.trim() ? form.key : undefined,
      model: form.model.trim() || undefined,
      imageModel: form.imageModel.trim(),
      baseURL: form.baseURL,
      authMode: isCustomDialog ? form.authMode : undefined,
      concurrencyLimit: Number.parseInt(form.concurrencyLimit, 10) || 0,
      requestIntervalMs: Number.parseInt(form.requestIntervalMs, 10) || 0,
    });
  };

  const handleProviderCardTest = (provider: APIKeyStatus) => {
    setProviderTestResults((prev) => ({
      ...prev,
      [provider.provider]: "",
    }));
    testMutation.mutate(
      {
        provider: provider.provider,
        model: provider.currentModel || undefined,
        baseURL: provider.currentBaseURL || undefined,
      },
      {
        onSuccess: (response) => {
          setProviderTestResults((prev) => ({
            ...prev,
            [provider.provider]: formatConnectionTestResult(response),
          }));
        },
        onError: (error) => {
          setProviderTestResults((prev) => ({
            ...prev,
            [provider.provider]: error instanceof Error ? error.message : "Connection test failed.",
          }));
        },
      },
    );
  };

  const handleTestProviderDialog = () => {
    testMutation.mutate(
      {
        provider: editingProvider || "custom_preview",
        apiKey: form.key.trim() ? form.key : undefined,
        model: form.model.trim() || undefined,
        baseURL: form.baseURL.trim() ? form.baseURL : undefined,
        authMode: isCustomDialog ? form.authMode : undefined,
        probeMode: "both",
      },
      {
        onSuccess: (response) => {
          setDialogTestResult(formatConnectionTestResult(response));
        },
        onError: (error) => {
          setDialogTestResult(error instanceof Error ? error.message : "Connection test failed.");
        },
      },
    );
  };

  const handleDeleteCustomProvider = () => {
    if (!editingProvider || !editingConfig) {
      return;
    }
    if (!window.confirm(`Delete custom provider ${editingConfig.name}?`)) {
      return;
    }
    deleteCustomProviderMutation.mutate(editingProvider);
  };

  const handleRemoveProvider = (provider: APIKeyStatus) => {
    const label = provider.kind === "builtin" ? "Remove from list" : "Delete";
    if (!window.confirm(`${label} ${provider.name}?`)) {
      return;
    }
    removeProviderMutation.mutate(provider);
  };

  const isSavingProvider = saveMutation.isPending || createCustomProviderMutation.isPending;
  const providerSubmitDisabled = isSavingProvider
    || previewCustomProviderModelsMutation.isPending
    || (!isCreatingCustomProvider && !form.model.trim())
    || (isCustomDialog && !form.displayName.trim())
    || (isCreatingCustomProvider && !form.baseURL.trim())
    || (!isCustomDialog && editingConfig?.requiresApiKey !== false && !form.key.trim() && !editingConfig?.isConfigured);
  const providerSubmitLabel = isSavingProvider ? "Saving…" : isCreatingCustomProvider ? "Create provider" : "Save";

  return (
    <div className={AUTO_DIRECTOR_MOBILE_CLASSES.settingsPageRoot}>
      <div className="space-y-4">
        <ProviderSettingsSection
          embedded={embedded}
          providers={providerConfigs}
          balances={providerBalancesQuery.data?.data ?? []}
          isBalanceLoading={providerBalancesQuery.isLoading}
          testingProvider={testMutation.isPending ? testMutation.variables?.provider : undefined}
          providerTestResults={providerTestResults}
          refreshingModelProvider={refreshModelsMutation.isPending ? refreshModelsMutation.variables : undefined}
          refreshingBalanceProvider={refreshBalanceMutation.isPending ? refreshBalanceMutation.variables : undefined}
          reasoningProvider={modelControlsMutation.isPending ? modelControlsMutation.variables?.provider : undefined}
          onCreateCustomProvider={openCreateCustomDialog}
          onRemoveProvider={handleRemoveProvider}
          onOpenConfig={openBuiltInDialog}
          onTest={handleProviderCardTest}
          onRefreshModels={(provider) => {
            setActionResult("");
            refreshModelsMutation.mutate(provider);
          }}
          onRefreshBalance={(provider) => {
            setActionResult("");
            refreshBalanceMutation.mutate(provider);
          }}
          onSetReasoning={(provider, reasoningEnabled, reasoningEffort) => {
            setActionResult("");
            const effortLabel = reasoningEffort === "low" ? "Low" : reasoningEffort === "max" ? "Maximum" : "High";
            modelControlsMutation.mutate({
              provider,
              reasoningEnabled,
              reasoningEffort,
              message: reasoningEnabled ? `Reasoning effort set to ${effortLabel}.` : "Reasoning disabled.",
            });
          }}
          onSetHiddenModels={(provider, hiddenModels, message) => {
            setActionResult("");
            modelControlsMutation.mutate({ provider, hiddenModels, message });
          }}
          removingProvider={removeProviderMutation.isPending ? removeProviderMutation.variables?.provider : undefined}
        />
      </div>

      <SettingsActionResult message={actionResult} />

      <ProviderConfigDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialogState();
          }
        }}
        isCreatingCustomProvider={isCreatingCustomProvider}
        isCustomDialog={isCustomDialog}
        editingConfig={editingConfig}
        form={form}
        setForm={setForm}
        selectableModels={selectableModels}
        previewModelsResult={previewModelsResult}
        isPreviewingModels={previewCustomProviderModelsMutation.isPending}
        onClearPreviewModels={clearPreviewModels}
        onPreviewModels={handlePreviewCustomModels}
        onSubmit={handleSubmitProviderDialog}
        submitDisabled={providerSubmitDisabled}
        submitLabel={providerSubmitLabel}
        onTest={handleTestProviderDialog}
        testDisabled={testMutation.isPending || !form.model.trim() || !form.baseURL.trim()}
        testResult={dialogTestResult}
        onDeleteCustomProvider={handleDeleteCustomProvider}
        deleteDisabled={deleteCustomProviderMutation.isPending}
        deleteLabel={deleteCustomProviderMutation.isPending ? "Deleting…" : "Delete"}
      />
    </div>
  );
}
