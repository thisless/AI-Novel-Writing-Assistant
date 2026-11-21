import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  previewPrompt,
  testRunPrompt,
  type PromptCatalogItem,
  type PromptPreviewPayload,
  type PromptTestRunPayload,
  type PromptTestRunResult,
  type PromptTemplateJson,
} from "@/api/promptWorkbench";
import { useSSE } from "@/hooks/useSSE";
import type { PromptSlotDrafts } from "../promptWorkbenchTypes";

interface PreviewNovel {
  id: string;
  title?: string | null;
}

interface PreviewChapter {
  id: string;
  title?: string | null;
  order?: number | null;
  content?: string | null;
  expectation?: string | null;
  targetWordCount?: number | null;
  taskSheet?: string | null;
}

function buildPreviewExtraContextBlocks(prompt: PromptCatalogItem) {
  if (prompt.id !== "audit.chapter.light" && prompt.id !== "audit.chapter.full") {
    return [];
  }
  return [
    {
      id: "chapter_mission",
      group: "chapter_mission",
      priority: 100,
      content: [
        "Chapter mission: Sample chapter",
        "Objective: Have the protagonist discover a code in the old warehouse and confirm that someone is closing in.",
        "Expectation: Advance the investigation, create external pressure, and end with a pursuit hook.",
        "Must advance",
        "- The protagonist discovers a code on the wall and determines that it points to the Old City archive.",
        "- Footsteps approach outside, forcing the protagonist to make an immediate choice.",
        "Must preserve",
        "- The code is a real clue, not a hallucination or ordinary graffiti.",
      ].join("\n"),
    },
    {
      id: "chapter_boundary",
      group: "chapter_boundary",
      priority: 99,
      required: true,
      content: [
        "Chapter boundary:",
        "Exclusive event: The protagonist finds a code left by the previous investigator in the old warehouse for the first time.",
        "Entry state: The protagonist enters the old warehouse alone, not yet knowing what the code means.",
        "Ending state: The protagonist confirms that the code points to the Old City archive and realizes the pursuer is already outside.",
        "Next chapter entry state: Before being discovered, the protagonist must decide whether to take the evidence or set a trap and investigate.",
        "Do not cross",
        "- Do not reveal the true leader of the Old City organization in this chapter.",
        "- Do not have the pursuer fully explain the code system.",
        "Protected reveals",
        "- The previous investigator's true identity.",
      ].join("\n"),
    },
    {
      id: "structure_obligations",
      group: "structure_obligations",
      priority: 94,
      required: true,
      content: [
        "Structure obligations",
        "- Check whether the chapter includes a clue discovery, mounting pressure, and an end-of-chapter choice.",
        "- Check that the protagonist's motivation is consistent and that they do not guess the code without evidence.",
        "- Check whether the ending creates new suspense or pursuit pressure.",
      ].join("\n"),
    },
    {
      id: "local_state",
      group: "local_state",
      priority: 89,
      content: "Local state before review:\nThe protagonist is inside the old warehouse. A pursuer is approaching, and the code's meaning has not yet been fully confirmed.",
    },
    {
      id: "world_rules",
      group: "world_rules",
      priority: 84,
      content: "Relevant world rules\n- Only a few investigators and members of the underground organization know the Old City code system.",
    },
  ];
}

function buildPreviewExecutionMetadata(
  prompt: PromptCatalogItem,
  hasRealChapterContext: boolean,
): Record<string, unknown> | undefined {
  if (hasRealChapterContext) {
    return undefined;
  }
  const extraContextBlocks = buildPreviewExtraContextBlocks(prompt);
  if (extraContextBlocks.length === 0) {
    return undefined;
  }
  return { extraContextBlocks };
}

function buildPreviewPromptInput(
  prompt: PromptCatalogItem,
  previewNovel?: PreviewNovel | null,
  previewChapter?: PreviewChapter | null,
): Record<string, unknown> {
  if (prompt.id === "audit.chapter.light" || prompt.id === "audit.chapter.full") {
    const chapterContent = previewChapter
      ? previewChapter.content?.trim()
        || previewChapter.taskSheet?.trim()
        || previewChapter.expectation?.trim()
        || "This chapter has no text yet."
      : "The protagonist enters the old warehouse and finds a code left on the wall by the previous investigator. Footsteps approach outside; before being discovered, the protagonist must determine what the code points to.";
    return {
      novelTitle: previewNovel?.title || "Sample novel",
      chapterTitle: previewChapter
        ? `Chapter ${previewChapter.order ?? "?"}: ${previewChapter.title || "Untitled chapter"}`
        : "Sample chapter",
      requestedTypes: ["plot", "character", "continuity"],
      storyModeContext: previewNovel
        ? "Preview this novel using its chapter mission, chapter boundaries, and structural obligations."
        : "This serialized novel needs to keep conflicts moving and end chapters with hooks.",
      content: chapterContent,
      ragContext: "No additional retrieved context.",
    };
  }

  if (prompt.id === "novel.chapter.writer") {
    const targetWordCount = previewChapter?.targetWordCount ?? 3000;
    const softMinWordCount = Math.max(800, Math.round(targetWordCount * 0.86));
    const softMaxWordCount = Math.max(softMinWordCount + 200, Math.round(targetWordCount * 1.14));
    return {
      novelTitle: previewNovel?.title || "Sample novel",
      chapterOrder: previewChapter?.order ?? 1,
      chapterTitle: previewChapter?.title || "Sample chapter",
      mode: "draft",
      targetWordCount,
      minWordCount: softMinWordCount,
      maxWordCount: softMaxWordCount,
    };
  }

  if (prompt.id === "novel.short_story.segment.write") {
    return {
      originalIdea: "A girl who can hear lies meets the one person whose honesty she cannot judge.",
      understanding: "Create a crisis of trust by making her truth-detection fail, then resolve the relationship and reveal the truth through one complete incident.",
      direction: { id: "preview", title: "The Silent Testimony", premise: "A girl must work with a witness she cannot read.", coreExperience: "Suspense and trust", protagonist: "A girl who can hear lies", centralConflict: "Her ability fails as danger draws near", endingPromise: "Reveal why her ability failed", styleKeywords: ["Fast opening", "Progressive reveals"] },
      plan: { title: "The Silent Testimony", targetWordCount: 8000, endingPromise: "Uncover the truth", segments: [] },
      segment: { order: 1, purpose: "Establish the anomaly and pressure to cooperate", targetWordCount: 2600, openingState: "Her ability has always been reliable", openingHook: "The one silence", immediateGoal: "Determine whether the witness can be trusted", progressionBeats: ["Danger approaches", "Forced cooperation"], turningPoint: "Her ability has not failed", payoff: "Discover the first layer of truth", closingPull: "The real lie comes from someone close", closingState: "The two form a temporary alliance" },
      previousContinuity: "",
      previousContentTail: "",
    };
  }

  if (prompt.id === "novel.chapter_editor.workspace_diagnosis") {
    return {
      chapterTitle: "Sample chapter",
      chapterMission: "Have the protagonist discover a key clue.",
      volumePositionLabel: "Middle of Volume 1",
      volumePhaseLabel: "Conflict unfolds",
      paceDirective: "Move the story forward faster",
      previousChapterBridge: "The previous chapter left a clue to follow.",
      nextChapterBridge: "The next chapter begins a direct confrontation.",
      activePlotThreads: ["Find the archive"],
      paragraphs: [{ index: 1, text: "The protagonist enters the old warehouse." }],
      openIssues: [],
    };
  }

  if (prompt.id === "bookAnalysis.character.profile") {
    return {
      generationDepth: "standard",
      selectedDimensions: ["basic", "personality", "arc"],
      character: {
        name: "Lin Che",
        role: "Protagonist",
        briefDescription: "A young investigator forced to follow a code found in an old warehouse.",
        importance: "high",
        occurringChapters: ["Chapter 1"],
      },
      characterSystemContext: "The protagonist drives the discovery of the Old City's secrets.",
      notesText: "In Chapter 1, Lin Che finds a code in the old warehouse and realizes someone is following him.",
      ragEvidenceText: "",
    };
  }

  if (prompt.id === "bookAnalysis.character.generate") {
    return {
      generationDepth: "standard",
      selectedDimensions: ["basic", "personality", "arc"],
      characterNames: ["Lin Che", "Shen Wu"],
      characterSystemContext: "The main characters form a web of relationships around the Old City's secrets and the pressure of being pursued.",
      notesText: "Lin Che finds a code, while Shen Wu knows about the Old City. They do not trust each other yet.",
    };
  }

  if (prompt.id === "image.novel_cover.brief") {
    return {
      sourcePrompt: "An old city warehouse, a code on the wall, footsteps outside, and a suspenseful portrait-format cover.",
      title: "The Old City Code",
      description: "A young investigator discovers a life-changing code in an abandoned Old City warehouse.",
      targetAudience: "Readers who enjoy urban suspense and gripping opening hooks.",
      bookSellingPoint: "Every chapter advances through a clue that can be investigated.",
      competingFeel: "Tense and restrained, with a cool cinematic look.",
      first30ChapterPromise: "Uncover the organization behind the Old City code and draw the protagonist into a larger conspiracy.",
      commercialTags: ["Urban suspense", "Clue investigation", "High-pressure opening"],
      genreLabel: "Urban suspense",
      primaryStoryModeLabel: "Clue-driven progression",
      secondaryStoryModeLabel: "Identity mystery",
      worldName: "Old City",
      worldSummary: "A seemingly quiet old district crossed by a hidden network of clues.",
      styleTone: "Cool, restrained, and vivid",
      narrativePovLabel: "Third-person limited",
      pacePreferenceLabel: "Moderately fast",
      emotionIntensityLabel: "Restrained intensity",
    };
  }

  if (prompt.id === "novel.character.castAuto.relations") {
    return {
      storyInput: "The protagonist follows a code through the Old City, gradually uncovering secrets kept by those around him and pressure from an organization.",
      optionTitle: "Old City investigation cast",
      optionSummary: "The protagonist, a source of clues, and the source of pressure form a web of mutual suspicion around the Old City's secrets.",
      protagonistName: "Lin Che",
      memberNames: ["Lin Che", "Shen Wu", "Gu Heng"],
      memberRosterText: "Lin Che: The protagonist, a young investigator.\nShen Wu: A source of clues who knows where the Old City code came from.\nGu Heng: The source of pressure, trying to stop the investigation.",
    };
  }

  if (prompt.id === "world.layer.generate") {
    return {
      layerKey: "foundation",
      targetFields: ["background", "geography"],
      worldName: "Old City",
      worldType: "Urban supernatural",
      templateName: "Urban suspense",
      templateDescription: "A secret order has operated for years beneath the surface of an ordinary city.",
      classicElements: ["Old district", "Underground organization", "Coded clues"],
      pitfalls: ["Do not explain every mystery at once", "Do not leave the rules as abstract concepts"],
      axioms: "The Old City's code system is real and influences how characters act.",
      summary: "The Old City consists of ordinary neighborhoods and a hidden network of clues.",
      blueprintPromptBlock: "The main settings are an abandoned warehouse, old streets, and a concealed archive.",
      existingJson: "{}",
      ragContext: "No additional references.",
    };
  }

  if (prompt.id === "world.layer.localize") {
    return {
      layerKey: "foundation",
      layerFields: ["background", "geography"],
      sourcePayloadJson: JSON.stringify({
        background: "Old city has a hidden clue network.",
        geography: "Warehouse district, old streets, archive station.",
      }),
    };
  }

  if (prompt.id === "writingFormula.extract.stream") {
    return {
      extractLevel: "standard",
      focusAreas: ["Pacing", "Sentence structure", "Imagery"],
      sourceText: "The footsteps outside stopped. Lin Che held his breath, fingertips brushing the code on the wall. He suddenly understood: it was not a warning, but an invitation.",
    };
  }

  if (prompt.id === "novel.chapter_editor.rewrite_candidates") {
    return {
      operation: "polish",
      operationLabel: "Polish selected passage",
      scope: "selection",
      customInstruction: "",
      selectedText: "The footsteps outside stopped. Lin Che held his breath, fingertips brushing the code on the wall.",
      beforeParagraphs: ["Only one flickering light remained in the old warehouse."],
      afterParagraphs: ["The next second, someone gently pushed the iron door open from outside."],
      goalSummary: "Have the protagonist discover a key clue and use external pressure to create tension at the chapter's end.",
      chapterSummary: "The protagonist enters the old warehouse, finds a code, and realizes the pursuer is closing in.",
      styleSummary: "Cool and restrained, with clear physical details.",
      characterStateSummary: "The protagonist is wary but still willing to risk continuing the investigation.",
      worldConstraintSummary: "The Old City code is a real clue, not a hallucination or ordinary graffiti.",
      macroContextSummary: "This chapter draws the protagonist across the first threshold into the Old City's secrets.",
      resolvedIntentSummary: "Make the passage feel more natural and heighten suspense.",
      constraintsText: "Do not change these facts: the code exists, someone is approaching outside, and the protagonist is investigating.",
    };
  }

  return {
    goal: "Preview the prompt",
    messages: [],
    contextMode: "novel",
    novelId: "novel-1",
    chapterTitle: "Sample chapter",
    chapterMission: "Have the protagonist discover a key clue.",
  };
}

interface UsePromptPreviewInput {
  prompt: PromptCatalogItem | null;
  entrypoint: string;
  novelId?: string;
  chapterId?: string;
  previewNovel?: PreviewNovel | null;
  previewChapter?: PreviewChapter | null;
  slotOverrides: PromptSlotDrafts;
  templateDraft?: PromptTemplateJson;
}

export function usePromptPreview(input: UsePromptPreviewInput) {
  const {
    chapterId,
    entrypoint,
    novelId,
    previewChapter,
    previewNovel,
    prompt,
    slotOverrides,
    templateDraft,
  } = input;
  const [streamedTestRun, setStreamedTestRun] = useState<PromptTestRunResult | null>(null);
  const streamedTestRunRef = useRef<{
    prompt: PromptCatalogItem;
    llm?: PromptTestRunPayload["llm"];
    startedAt: number;
  } | null>(null);
  const testRunStream = useSSE({
    onDone: (outputText) => {
      const current = streamedTestRunRef.current;
      if (!current) {
        return;
      }
      setStreamedTestRun({
        prompt: current.prompt,
        outputType: "text",
        output: outputText,
        outputText,
        messages: [],
        context: {
          blocks: [],
          selectedBlockIds: [],
          droppedBlockIds: [],
          summarizedBlockIds: [],
          estimatedInputTokens: 0,
        },
        meta: {
          provider: current.llm?.provider,
          model: current.llm?.model,
          latencyMs: Date.now() - current.startedAt,
        },
        diagnostics: {
          missingRequiredGroups: [],
          resolverErrors: [],
          notes: [],
        },
      });
    },
  });

  const buildPayload = useCallback((): PromptPreviewPayload => {
    if (!prompt) {
      throw new Error("Select a prompt before generating a preview.");
    }
    const executionNovelId = novelId || undefined;
    const executionChapterId = novelId ? chapterId || previewChapter?.id : undefined;
    const hasRealChapterContext = Boolean(novelId && executionChapterId && previewChapter);
    return {
      promptKey: prompt.key,
      promptInput: buildPreviewPromptInput(prompt, previewNovel, previewChapter),
      executionContext: {
        entrypoint,
        novelId: executionNovelId,
        chapterId: executionChapterId,
        userGoal: "Preview the prompt",
        resourceBindings: {
          novelId: executionNovelId,
          ...(executionChapterId ? { chapterId: executionChapterId } : {}),
        },
        metadata: buildPreviewExecutionMetadata(prompt, hasRealChapterContext),
      },
      maxContextTokens: prompt.contextPolicy.maxTokensBudget,
      slotOverrides,
      templateDraft,
    };
  }, [
    chapterId,
    entrypoint,
    novelId,
    previewChapter,
    previewNovel,
    prompt,
    slotOverrides,
    templateDraft,
  ]);

  const previewMutation = useMutation({
    mutationFn: () => previewPrompt(buildPayload()),
  });

  const testRunMutation = useMutation({
    mutationFn: (llm?: PromptTestRunPayload["llm"]) => {
      const payload: PromptTestRunPayload = {
        ...buildPayload(),
        ...(llm ? { llm } : {}),
      };
      return testRunPrompt(payload);
    },
  });

  const hasTemplateDraft = Boolean(templateDraft);
  useEffect(() => {
    streamedTestRunRef.current = null;
    testRunStream.abort();
    previewMutation.reset();
    testRunMutation.reset();
    setStreamedTestRun(null);
  }, [prompt?.key, novelId, chapterId, entrypoint, hasTemplateDraft]);

  const generatePreview = useCallback(() => {
    previewMutation.mutate();
  }, [previewMutation]);

  const generateTestRun = useCallback((llm?: PromptTestRunPayload["llm"]) => {
    if (prompt?.outputType === "text") {
      testRunMutation.reset();
      setStreamedTestRun(null);
      streamedTestRunRef.current = { prompt, llm, startedAt: Date.now() };
      void testRunStream.start("/prompt-workbench/test-run/stream", {
        ...buildPayload(),
        ...(llm ? { llm } : {}),
      });
      return;
    }
    testRunMutation.mutate(llm);
  }, [buildPayload, prompt, testRunMutation, testRunStream]);

  return {
    generatePreview,
    generateTestRun,
    preview: previewMutation.data?.data ?? null,
    previewMutation,
    testRun: streamedTestRun ?? testRunMutation.data?.data ?? null,
    testRunStreamOutput: testRunStream.isStreaming ? testRunStream.content : "",
    isTestRunPending: testRunStream.isStreaming || testRunMutation.isPending,
    testRunError: (streamedTestRunRef.current ? testRunStream.error : null)
      ?? (testRunMutation.error instanceof Error ? testRunMutation.error.message : null),
    testRunMutation,
    resetPreview: previewMutation.reset,
  };
}
