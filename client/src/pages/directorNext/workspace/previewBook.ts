import type { CharacterTimeline } from "@ai-novel/shared/types/novel";
import type { WorkspaceBook } from "./model";

export const previewBook: WorkspaceBook = {
  novel: { id: "preview", title: "The Moving City", creationExperience: "simple", estimatedChapterCount: 30 },
  materials: {
    description: "Lin Du, a gatekeeper with no memory, must protect a city that moves at every dawn. He must identify those who approach its gates and uncover the city's connection to his forgotten past.",
    characterCount: 3, volumeCount: 1, openQualityDebtCount: 0,
    story: {
      coreSellingPoint: "A city that moves, a gatekeeper with amnesia, and a price to pay every time the gates open.",
      readingPromise: "Follow Lin Du as he identifies each visitor and uncovers the truth behind the city's movements, one choice at a time.",
      first30ChapterPromise: "From guarding the first gate to actively searching for the city's origins.",
      protagonistFantasy: "A forgotten man who becomes the city's one reliable protector through his own judgment.",
    },
    world: { name: "The Mistlands and the Moving City", summary: "Beyond the city lies a mistland with no fixed roads. The city moves at dawn, and bells determine when its gates may open. Travelers bearing the old city mark may request entry." },
    characters: [
      { id: "lin", name: "Lin Du", role: "Protagonist", storyFunction: "His choices as gatekeeper connect the secrets within the city to those beyond it.", currentGoal: "Discover the origin of the old city mark", personality: "Cautious and perceptive, yet willing to take responsibility under pressure." },
      { id: "shen", name: "Shen Zhi", role: "Companion", storyFunction: "She brings clues about the mistlands and forces Lin Du to reconsider the rules for opening the gates.", currentGoal: "Find her missing brother", personality: "Direct and decisive, but slow to trust." },
      { id: "elder", name: "The Bell Tower Keeper", role: "Guide", storyFunction: "He guards the city's rules and knows the past Lin Du has lost.", currentGoal: null, personality: "Quiet and restrained." },
    ],
    volumes: [{ id: "v1", order: 1, title: "Volume 1 · Visitors in the Mist", summary: "A stranger's arrival disrupts the gatekeeper's routine. Lin Du must make his first choice between protecting the city and pursuing his memories.", mainPromise: "Reveal the connection between the old city mark and the gatekeeper.", chapterCount: 3 }],
  },
  chapters: [
    { id: "c1", order: 1, title: "The Moving City", status: "completed", wordCount: 328, updatedAt: "2026-10-02T08:00:00Z", qualityDebt: null,
      content: "Lin Du woke to a faint tremor beneath his feet.\n\nBeyond the window, the bell tower leaned to one side, then slowly righted itself. The city was moving. In the streets, people gathered their drying laundry and a baker wedged her oven in place, as if this were just another ordinary morning.\n\nOnly Lin Du could not remember where he was.\n\nA yellowed sheet of paper lay on the table. Someone had pressed hard over its final line: Do not open the gates before the bell rings.\n\nLin Du touched the key at his waist. The metal was cold, yet a familiar sting rose in his palm. Three knocks sounded beyond the city gate. He looked up and saw someone standing in the mist.\n\nThe stranger raised a hand. On its back was the same mark engraved on the key." },
    { id: "c2", order: 2, title: "The Traveler Outside the Gate", status: "completed", wordCount: 245, updatedAt: "2026-10-02T08:10:00Z", qualityDebt: null,
      content: "\"My name is Shen Zhi,\" the stranger said. \"I'm not here to hide from the mist.\"\n\nLin Du watched her through the narrow window in the gate. Her sleeve was torn and pale mud clung to her shoes, but she kept her right hand raised, as if she knew he would recognize the mark.\n\n\"Then why are you here?\"\n\n\"To find someone. Someone who entered this city three years ago.\"\n\nThe bell tower rang once. Lin Du turned. The old keeper stood at the top, watching. He neither nodded nor shook his head; he only rested a hand on the bell rope.\n\nLin Du fitted the key into the lock.\n\n\"Once you're inside,\" he said, \"tell me where you got that mark.\" " },
    { id: "c3", order: 3, title: "After the Bell", status: "waiting_writing", wordCount: 0, content: null, updatedAt: "2026-10-02T08:10:00Z", qualityDebt: null },
  ],
};

export const previewCharacterHistory: Record<string, CharacterTimeline[]> = {
  lin: [
    { id: "h1", novelId: "preview", characterId: "lin", chapterId: "c1", chapterOrder: 1, title: "Taking Up the Gatekeeper's Duty", content: "He wakes with no memory and guards the gate by the rules on the paper. The mark on his key feels strangely familiar.", source: "chapter", createdAt: "2026-10-02T08:00:00Z", updatedAt: "2026-10-02T08:00:00Z" },
    { id: "h2", novelId: "preview", characterId: "lin", chapterId: "c2", chapterOrder: 2, title: "From Suspicion to Questions", content: "He lets Shen Zhi into the city and asks where her mark came from. His goal shifts from guarding the gate to investigating the connection between himself and the mark.", source: "chapter", createdAt: "2026-10-02T08:10:00Z", updatedAt: "2026-10-02T08:10:00Z" },
  ],
  shen: [{ id: "h3", novelId: "preview", characterId: "shen", chapterId: "c2", chapterOrder: 2, title: "Entering the Moving City", content: "She tells Lin Du she is searching for someone who went missing and is allowed into the city because of the mark on her hand.", source: "chapter", createdAt: "2026-10-02T08:10:00Z", updatedAt: "2026-10-02T08:10:00Z" }],
  elder: [],
};
