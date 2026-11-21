import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageAsset } from "@ai-novel/shared/types/image";
import type { BaseCharacter } from "@ai-novel/shared/types/novel";
import { CircleAlert, ImageIcon, LibraryBig, Sparkles, UsersRound } from "lucide-react";
import { deleteBaseCharacter, getBaseCharacterList, updateBaseCharacter } from "@/api/character";
import { deleteImageAsset, listImageAssets, setPrimaryImageAsset } from "@/api/images";
import { queryKeys } from "@/api/queryKeys";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import CharacterConversationWorkbench from "@/components/characterConversation/CharacterConversationWorkbench";
import {
  AssetLibraryEmptyState,
  AssetLibraryHeader,
  AssetLibraryRecommendation,
  AssetLibrarySection,
  AssetLibraryStatusGrid,
} from "@/components/assetLibrary";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "./components/CharacterCard";
import { CharacterCreateDialog } from "./components/CharacterCreateDialog";
import { CharacterEditDialog } from "./components/CharacterEditDialog";
import { CharacterImageDialog } from "./components/CharacterImageDialog";

type EditableBaseCharacter = Omit<BaseCharacter, "id" | "createdAt" | "updatedAt">;

export default function CharacterLibrary() {
  const queryClient = useQueryClient();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageCharacter, setSelectedImageCharacter] = useState<BaseCharacter | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<BaseCharacter | null>(null);
  const [conversationCharacter, setConversationCharacter] = useState<BaseCharacter | null>(null);

  const characterListQuery = useQuery({
    queryKey: queryKeys.baseCharacters.all,
    queryFn: () => getBaseCharacterList(),
  });

  const characters = characterListQuery.data?.data ?? [];

  const imageAssetQueries = useQueries({
    queries: characters.map((character) => ({
      queryKey: queryKeys.images.assets("character", character.id),
      queryFn: () => listImageAssets({ sceneType: "character", sceneId: character.id }),
      staleTime: 30_000,
    })),
  });

  const assetsByCharacter = useMemo(() => {
    const map = new Map<string, ImageAsset[]>();
    characters.forEach((character, index) => {
      map.set(character.id, imageAssetQueries[index]?.data?.data ?? []);
    });
    return map;
  }, [characters, imageAssetQueries]);
  const categoryCount = useMemo(
    () => new Set(characters.map((character) => character.category.trim()).filter(Boolean)).size,
    [characters],
  );
  const characterWithImageCount = useMemo(
    () => characters.filter((character) => (assetsByCharacter.get(character.id) ?? []).length > 0).length,
    [assetsByCharacter, characters],
  );
  const incompleteCharacterCount = useMemo(
    () => characters.filter((character) => (
      !character.personality.trim()
      || !character.background.trim()
      || !character.development.trim()
    )).length,
    [characters],
  );

  const setPrimaryMutation = useMutation({
    mutationFn: (assetId: string) => setPrimaryImageAsset(assetId),
    onSuccess: async (response) => {
      const baseCharacterId = response.data?.baseCharacterId;
      if (!baseCharacterId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.images.assets("character", baseCharacterId),
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteImageAsset(assetId),
    onSuccess: async (response) => {
      const baseCharacterId = response.data?.baseCharacterId;
      if (!baseCharacterId) {
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.images.assets("character", baseCharacterId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: EditableBaseCharacter;
    }) => updateBaseCharacter(characterId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.baseCharacters.detail(variables.characterId),
        }),
      ]);
      setEditDialogOpen(false);
      setEditingCharacter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (characterId: string) => deleteBaseCharacter(characterId),
    onSuccess: async (_, characterId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.images.assets("character", characterId),
        }),
      ]);
      if (selectedImageCharacter?.id === characterId) {
        setImageDialogOpen(false);
        setSelectedImageCharacter(null);
      }
      if (editingCharacter?.id === characterId) {
        setEditDialogOpen(false);
        setEditingCharacter(null);
      }
    },
  });

  const handleTaskCompleted = async (baseCharacterId: string) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.images.assets("character", baseCharacterId),
    });
  };

  const openImageDialog = (character: BaseCharacter) => {
    setSelectedImageCharacter(character);
    setImageDialogOpen(true);
  };

  const openEditDialog = (character: BaseCharacter) => {
    setEditingCharacter(character);
    setEditDialogOpen(true);
  };

  const handleDeleteCharacter = (character: BaseCharacter) => {
    const confirmed = window.confirm(`Delete character "${character.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(character.id);
  };

  return (
    <div className="space-y-5">
      <AssetLibraryHeader
        icon={UsersRound}
        context="Reusable across novels"
        title="Character Library"
        description="Save reusable character archetypes, core motivations, and portrait references. AI can use these foundations when you create a novel or develop its characters."
        actions={(
          <>
            <OpenInCreativeHubButton bindings={{}} label="Continue with the character library" />
            <CharacterCreateDialog />
          </>
        )}
      />

      <AssetLibraryStatusGrid
        items={[
          {
            key: "characters",
            label: "Reusable characters",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : characters.length,
            detail: characterListQuery.isPending
              ? "Loading character assets"
              : characterListQuery.isError
                ? "Reload to view"
                : characters.length > 0
                  ? "Available when planning novels and adding characters"
                  : "Create one to use in a new novel",
            icon: LibraryBig,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characters.length > 0 ? "success" : "neutral",
          },
          {
            key: "categories",
            label: "Character types",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : categoryCount,
            detail: "Organized by roles such as protagonists and supporting characters",
            icon: UsersRound,
          },
          {
            key: "images",
            label: "Characters with portraits",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : characterWithImageCount,
            detail: "At least one character portrait is saved",
            icon: ImageIcon,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characterWithImageCount > 0 ? "info" : "neutral",
          },
          {
            key: "incomplete",
            label: "Missing key details",
            value: characterListQuery.isPending || characterListQuery.isError ? "—" : incompleteCharacterCount,
            detail: "Personality, background, or character arc is missing",
            icon: CircleAlert,
            tone: characterListQuery.isPending || characterListQuery.isError
              ? "neutral"
              : characters.length === 0
                ? "neutral"
                : incompleteCharacterCount > 0 ? "warning" : "success",
          },
        ]}
      />

      <AssetLibraryRecommendation
        icon={Sparkles}
        title={characterListQuery.isPending
          ? "Organizing character assets"
          : characterListQuery.isError
            ? "Reload the character library"
            : characters.length === 0
              ? "Create your first reusable character"
              : incompleteCharacterCount > 0
                ? "Start by defining why the character acts and what they are willing to sacrifice"
                : "Character foundations are ready for novel planning"}
        description={characterListQuery.isPending
          ? "A next step will be recommended when loading is complete, based on character completeness."
          : characterListQuery.isError
            ? "Your existing characters are safe. Reload to continue managing them."
            : characters.length === 0
              ? "Start with a protagonist. Define their goal, weakness, and character arc to help AI create a more compelling character."
              : incompleteCharacterCount > 0
                ? `${incompleteCharacterCount} characters are missing key details. Filling them in gives chapter planning and dialogue a stronger foundation.`
                : "Bring the full library into Creative Hub, or keep developing portraits and dialogue for individual characters."}
        tone={characterListQuery.isError
          ? "danger"
          : characterListQuery.isPending || characters.length === 0
            ? "info"
            : incompleteCharacterCount > 0
              ? "warning"
              : "success"}
        action={characterListQuery.isError ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void characterListQuery.refetch()}>
            Reload
          </Button>
        ) : undefined}
      />

      <CharacterImageDialog
        open={imageDialogOpen}
        character={selectedImageCharacter}
        onOpenChange={(open) => {
          setImageDialogOpen(open);
          if (!open) {
            setSelectedImageCharacter(null);
          }
        }}
        onTaskCompleted={handleTaskCompleted}
      />

      <CharacterEditDialog
        open={editDialogOpen}
        character={editingCharacter}
        saving={updateMutation.isPending}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingCharacter(null);
          }
        }}
        onSubmit={(payload) => {
          if (!editingCharacter) {
            return;
          }
          updateMutation.mutate({
            characterId: editingCharacter.id,
            payload,
          });
        }}
      />

      {conversationCharacter ? (
        <CharacterConversationWorkbench
          subject={{ kind: "base_character", id: conversationCharacter.id, scopeKind: "base_library", scopeId: null }}
          characterName={conversationCharacter.name}
          defaultFullscreen
          closeOnExitFullscreen
          onClose={() => setConversationCharacter(null)}
        />
      ) : null}

      <AssetLibrarySection
        title="Character assets"
        description="Start with the details that shape story choices. Add portraits and further information whenever needed."
      >
        <div className="space-y-3">
          {characterListQuery.isLoading ? (
            <AssetLibraryEmptyState
              icon={UsersRound}
              title="Organizing character assets"
              description="Characters and portraits will appear here when loading is complete."
            />
          ) : null}

          {characterListQuery.isError ? (
            <AssetLibraryEmptyState
              icon={CircleAlert}
              title="Unable to load the character library"
              description="Your existing characters are safe. Reload the list to continue."
              action={(
                <Button type="button" variant="outline" onClick={() => void characterListQuery.refetch()}>
                  Reload
                </Button>
              )}
            />
          ) : null}

          {!characterListQuery.isLoading && !characterListQuery.isError ? (
            <>
              {characters.map((character, index) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  assets={assetsByCharacter.get(character.id) ?? []}
                  assetsLoading={imageAssetQueries[index]?.isLoading}
                  onGenerateImage={() => openImageDialog(character)}
                  onSetPrimary={(assetId) => setPrimaryMutation.mutate(assetId)}
                  onDeleteAsset={(asset) => deleteAssetMutation.mutateAsync(asset.id).then(() => undefined)}
                  onEdit={() => openEditDialog(character)}
                  onDelete={() => handleDeleteCharacter(character)}
                  onConversation={() => setConversationCharacter(character)}
                  settingPrimary={setPrimaryMutation.isPending}
                  deletingAssetId={deleteAssetMutation.variables ?? null}
                  deleting={deleteMutation.isPending && deleteMutation.variables === character.id}
                  extraActions={(
                    <OpenInCreativeHubButton
                      bindings={{ baseCharacterId: character.id }}
                      label="Continue with character"
                    />
                  )}
                />
              ))}
              {characters.length === 0 ? (
                <AssetLibraryEmptyState
                  icon={UsersRound}
                  title="No characters yet"
                  description="Select “Create Character” at the top of the page to start with a protagonist who has a clear goal and weakness."
                />
              ) : null}
            </>
          ) : null}
        </div>
      </AssetLibrarySection>
    </div>
  );
}
