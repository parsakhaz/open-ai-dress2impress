## **Definitive Implementation Guide: "Dress To Impress (AI Styler)" POC v3.0**

**To the Developer:** Welcome to the project! This document contains everything you need to build the Proof of Concept (POC) from start to finish. Follow these steps in order. Read each step carefully before writing any code. This is your single source of truth.

### **Part 1: The Vision & Product Plan (The "Why")**

Before you write a line of code, understand what we are building and why.

#### **1.1. Project Goal**
"Dress To Impress: AI Styler" is a groundbreaking, browser-based fashion game that pits a human player's creativity against a cutting-edge AI stylist named **AURA**. The project's vision is to deliver the world's first LLM-driven multiplayer fashion game. The core "wow" factor is the user's ability to scan their own face and become a photorealistic fashion avatar, effectively putting *themselves* into the game.

#### **1.2. Core User Flow**
The entire user journey is a seamless, single-page application experience broken into four distinct phases:

1.  **Phase 0: Character Creation:** The user's entry point. They will use their webcam to take a photo, which we transform into four full-body avatar options. They pick one to proceed.
2.  **Phase 1: Shopping Spree (2 Minutes):** A timed phase where the user and the AI search for clothing items using a prompt-driven Amazon search tool to build their respective wardrobes for the round.
3.  **Phase 2: Styling Round (90 Seconds):** The main event. The user tries on clothes from their wardrobe. Each try-on is a call to the FASHN AI API. They can also use an "Edit with AI" tool to add accessories.
4.  **Phase 3: The Walkout & Evaluation:** The final outfits are sent to the Kling AI API to generate 5-second walkout videos. An AI Judge then evaluates both videos and declares a winner with scores and a detailed explanation.

#### **1.3. A Note on "Live-Only" Development**
Per the project requirements, this plan specifies a "live-only" implementation without mock logic in the final code.

**Your Actionable Advice:** Building a UI against live, asynchronous, and potentially slow/expensive APIs is challenging. It is **highly recommended** that during your personal development of the UI components (Steps 5 & 6), you create temporary mock files that return static, local data (e.g., from `/public/demo`). This will allow you to build and style the UI quickly without waiting for or paying for real API calls. Once the UI is complete, you can confidently wire it up to the live adapters detailed below.

### **Part 2: The Technical Blueprint (The "What")**

This section details the foundational structure of our application.

#### **2.1. Folder Structure**
Create the following folders and files inside your project. This structure is mandatory.

```text
/app
  /(app)
    /components/
      /ai/
        AIConsole.tsx
      /game/
        CenterStage.tsx
        HistoryStrip.tsx
        TopBar.tsx
      /panels/
        AmazonPanel.tsx
        EditWithAIPanel.tsx
      /ui/
        ToolsIsland.tsx
        VariantGrid.tsx
        WardrobeModal.tsx
    layout.tsx
    page.tsx
  /lib/
    /adapters/
      amazon.ts
      avatar.ts
      edit.ts
      fashn.ts
      judge.ts
      video.ts
    /data/
      db.ts
    /state/
      gameStore.ts
    /util/
      timers.ts
  /public/
    /demo/
      (This folder is for your temporary development assets)
  /types/
    index.d.ts```

#### **2.2. Data Model (Types & Database)**
1.  **TypeScript Types (`/types/index.d.ts`):**
    ```typescript
    export type GamePhase = 'CharacterSelect' | 'ShoppingSpree' | 'StylingRound' | 'WalkoutAndEval' | 'Results';
    export type Category = 'top' | 'bottom' | 'dress';

    export interface Character {
      id: string;
      avatarUrl: string;
    }

    export interface WardrobeItem {
      id: string;
      name: string;
      imageUrl: string;
      buyLink: string;
      price: string | null;
      source: 'amazon' | 'llm' | 'preset';
      category: Category;
    }

    export interface HistoryState {
      id: string;
      imageUrl: string;
      createdAt: number;
    }
    
    export interface AIEvent {
        type: 'thought' | 'tool_call';
        content: string;
        timestamp: number;
    }
    ```
2.  **Database Schema (`/lib/data/db.ts`):**
    ```typescript
    import Dexie, { Table } from 'dexie';
    import type { Character, WardrobeItem, HistoryState } from '@/types';

    export class AppDatabase extends Dexie {
      characters!: Table<Character>;
      items!: Table<WardrobeItem>;
      history!: Table<HistoryState>;

      constructor() {
        super('DressToImpressDB');
        this.version(1).stores({
          characters: 'id',
          items: 'id, category',
          history: '++id, createdAt'
        });
      }
    }

    export const db = new AppDatabase();
    ```

#### **2.3. Global State (`/lib/state/gameStore.ts`)**
```typescript
import { create } from 'zustand';
import type { GamePhase, AIEvent } from '@/types';

interface GameState {
  phase: GamePhase;
  theme: string;
  timer: number;
  aiLog: AIEvent[];
  setPhase: (phase: GamePhase) => void;
  setTheme: (theme: string) => void;
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  logAIEvent: (event: AIEvent) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'CharacterSelect',
  theme: 'Streetwear Night Out',
  timer: 0,
  aiLog: [],
  setPhase: (phase) => set({ phase }),
  setTheme: (theme) => set({ theme }),
  setTimer: (time) => set({ timer: time }),
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  logAIEvent: (event) => set((state) => ({ aiLog: [...state.aiLog, event] })),
  resetGame: () => set({ phase: 'CharacterSelect', timer: 0, aiLog: [] }),
}));
```

### **Part 3: The Adapters - Connecting to Live Services (The "How")**

This section contains the exact, live-only code for communicating with all external APIs.

#### **3.1. Amazon Search Adapter (`/lib/adapters/amazon.ts`)**
```typescript
import axios from 'axios';
import type { WardrobeItem } from '@/types';

// --- CONFIGURATION ---
const API_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const API_HOST = process.env.NEXT_PUBLIC_RAPIDAPI_HOST;

export async function searchAmazon(query: string): Promise<WardrobeItem[]> {
  if (!API_KEY || !API_HOST) {
    throw new Error("RapidAPI credentials for Amazon search are not set.");
  }
  
  const options = {
    method: 'GET',
    url: `https://${API_HOST}/search`,
    params: {
      query: query,
      page: '1',
      country: 'US',
      sort_by: 'RELEVANCE',
      category_id: 'fashion',
    },
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    }
  };

  try {
    const response = await axios.request(options);
    const products = response.data?.data?.products;
    if (!products) return [];

    return products
      .map((product: any): WardrobeItem | null => {
        if (!product.asin || !product.product_title || !product.product_photo) {
          return null;
        }
        return {
          id: product.asin,
          name: product.product_title,
          imageUrl: product.product_photo,
          buyLink: product.product_url,
          price: product.product_price,
          source: 'amazon',
          // Note: The 'categorize' LLM call must be made separately to set this properly
          category: 'top', // Default placeholder category
        };
      })
      .filter((p: any): p is WardrobeItem => p !== null)
      .slice(0, 8); // Return top 8 results
  } catch (error) {
    console.error('[Amazon Adapter] API Error:', error);
    throw error; // Re-throw the error to be handled by the UI
  }
}
```

#### **3.2. FASHN AI (Try-On) Adapter (`/lib/adapters/fashn.ts`)**
This is an asynchronous polling API. We start a job and then check its status until it's done.
```typescript
import { pRateLimit } from 'p-ratelimit';

// --- CONFIGURATION ---
const API_KEY = process.env.NEXT_PUBLIC_FASHN_AI_API_KEY;
const BASE_URL = "https://api.fashn.ai/v1";
const limit = pRateLimit({ interval: 60000, rate: 10, concurrency: 4 });
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runSingleTryOn(characterImageUrl: string, clothingImageUrl: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("FASHN_API_KEY environment variable is not set.");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`
  };

  const inputData = {
    model_name: "tryon-v1.6",
    inputs: {
      model_image: characterImageUrl,
      garment_image: clothingImageUrl
    }
  };

  // Step 1: Start the prediction job
  const runResponse = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(inputData)
  });
  if (!runResponse.ok) throw new Error("FASHN AI: Failed to start prediction job.");
  const runData = await runResponse.json();
  const predictionId = runData.id;

  // Step 2: Poll for the result
  for (let i = 0; i < 30; i++) { // Poll for up to 90 seconds
    const statusResponse = await fetch(`${BASE_URL}/status/${predictionId}`, { headers });
    const statusData = await statusResponse.json();

    if (statusData.status === "completed") {
      // The output is an array, we'll take the first result.
      return statusData.output[0];
    } else if (["failed", "canceled"].includes(statusData.status)) {
      throw new Error(`FASHN AI: Prediction failed or was canceled. Reason: ${statusData.error}`);
    }
    await sleep(3000); // Wait 3 seconds between polls
  }

  throw new Error("FASHN AI: Prediction timed out after 90 seconds.");
}

export async function performTryOn(characterImageUrl: string, clothingImageUrl: string): Promise<string[]> {
  // We run 4 predictions in parallel to get 4 variants
  const promises = Array(4).fill(0).map(() => limit(() => runSingleTryOn(characterImageUrl, clothingImageUrl)));
  return Promise.all(promises);
}
```

#### **3.3. Kling AI (Video) Adapter (`/lib/adapters/video.ts`)**
This is also an asynchronous polling API.
```typescript
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ---
const ACCESS_KEY = process.env.NEXT_PUBLIC_KLING_ACCESS_KEY;
const SECRET_KEY = process.env.NEXT_PUBLIC_KLING_SECRET_KEY;
const API_HOST = 'https://api-singapore.klingai.com';
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- HELPER ---
function generateKlingToken() {
  if (!ACCESS_KEY || !SECRET_KEY) return null;
  const payload = {
    iss: ACCESS_KEY,
    exp: Math.floor(Date.now() / 1000) + 1800,
    nbf: Math.floor(Date.now() / 1000) - 5,
  };
  return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
}

// --- MAIN FUNCTION ---
export async function generateWalkoutVideo(finalImageURL: string): Promise<string> {
  const token = generateKlingToken();
  if (!token) {
    throw new Error("Kling AI credentials are not set.");
  }
  
  const external_task_id = uuidv4();

  // Step 1: Create the video generation task
  const createResponse = await fetch(`${API_HOST}/v1/videos/image2video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      model_name: "kling-v1-6",
      mode: "std",
      duration: "5",
      image: finalImageURL,
      prompt: "A fashion model walks forward on a runway, studio lighting, plain white background.",
      external_task_id: external_task_id
    }),
  });

  if (!createResponse.ok) throw new Error("Kling API: Failed to create task.");
  const createResult = await createResponse.json();
  const taskId = createResult.data.task_id;

  // Step 2: Poll for the result
  for (let i = 0; i < 30; i++) { // Poll for up to 150 seconds
    await sleep(5000);
    const pollToken = generateKlingToken();
    if (!pollToken) continue;

    const queryResponse = await fetch(`${API_HOST}/v1/videos/image2video/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${pollToken}` }
    });
    
    const queryResult = await queryResponse.json();
    if (queryResult.data.task_status === 'succeed') {
      return queryResult.data.task_result.videos[0].url;
    }
    if (queryResult.data.task_status === 'failed') {
      throw new Error(`Kling API: Video generation failed: ${queryResult.data.task_status_msg}`);
    }
  }

  throw new Error("Kling API: Video generation timed out.");
}
```

#### **3.4. OpenAI Adapters (`avatar.ts`, `edit.ts`, `judge.ts`)**
These are standard `fetch` calls. The prompts are the most important part. Create these files and implement the live logic using `fetch` to the OpenAI endpoints.

### **Part 4: The Prompts - The Brains of the Operation**

This section contains the exact, production-ready prompts.

#### **Prompt for `avatar.ts` and `edit.ts`**
*   **API Endpoint:** `v1/images/edits`
*   **Use Case: Avatar Generation** (Call 4x in parallel with this prompt)
    ```text
    ROLE
    You are a photo-editing AI. Transform the provided face photo into a single, full-body fashion model avatar.
    
    REQUIREMENTS
    1) Preserve the person’s facial likeness.
    2) Full-body, neutral forward-facing standing pose.
    3) Background: plain white seamless studio (#FFFFFF).
    4) Attire: simple, form-fitting, plain grey basics (tank top + leggings).
    5) Photorealistic, well-lit, high-resolution output.
    ```
*   **Use Case: General Image Editing** (Call 4x in parallel with this prompt)
    ```text
    ROLE
    Expert AI photo editor. Subtly edit an existing image based on user text. Do not change the person, pose, or existing clothes unless specifically asked.

    REQUIREMENTS
    1) Preserve the base image (face, body, pose).
    2) Apply the requested edit realistically (e.g., adding an accessory, changing an item's color).
    3) Match the lighting, shadows, and perspective of the original image.
    4) Keep the plain white background unchanged.
    ```

#### **Prompt for `judge.ts`**
*   **API Endpoint:** `v1/chat/completions` (with a vision-capable model)
*   **Use Case: Final Evaluation** (Provide this as the system prompt and enforce JSON output)
    ```text
    You are a world-renowned fashion judge. You will be shown a series of frames from two 5-second videos of two contestants for the theme: "{{theme}}".

    Evaluate each contestant on:
    1. Theme Adherence (How well it fits the theme)
    2. Style & Creativity (How original and stylish it is)
    3. Outfit Coordination (How well the pieces work together)

    Your response MUST be a single, valid JSON object and nothing else, with the following structure:
    {
      "scores": {
        "human": { "theme": number, "style": number, "coordination": number, "total": number },
        "ai": { "theme": number, "style": number, "coordination": number, "total": number }
      },
      "verdict": {
        "winner": "human" | "ai",
        "justification": "A sharp, concise, and decisive paragraph explaining your reasoning and crowning the winner."
      }
    }
    ```

### **Part 5: The Build Plan - Your Step-by-Step Task List**

Follow this list in order. This will build the project from the ground up.

1.  **Setup Project:** Complete all actions in **Step 0**.
2.  **Define Structure & Data:** Complete all actions in **Part 2** by creating the folder structure and pasting the code for types and the database.
3.  **Implement State:** Complete the global state management in **Part 2** by pasting the code for the Zustand store.
4.  **Implement Live Adapters:** Go to **Part 3** and create the adapter files (`amazon.ts`, `fashn.ts`, `video.ts`, etc.). Paste the complete, live-only code provided for each one.
5.  **Build UI Shells:** Create all the React components listed in the Folder Structure with placeholder content and styling. Focus on making the layout match the specification.
6.  **Wire UI to Adapters:** This is the main development loop.
    *   Start with the Character Creation flow. Wire the webcam "capture" button to the `generateAvatarFromSelfie` adapter.
    *   Display the results in the `VariantGrid`. Handle loading and error states.
    *   Continue this process for every feature: connect the Amazon search panel to `searchAmazon`, the try-on button to `performTryOn`, and so on.
7.  **Implement Game Logic (FSM):** Use the Zustand store (`useGameStore`) to control the application flow. Transitions between phases should be triggered by timers or user actions (e.g., confirming an avatar).
8.  **Final Polish:**
    *   Implement the `HistoryStrip` undo feature by saving to and reading from the Dexie `history` table.
    *   Ensure the `AIConsole` is properly displaying the AI's thought process.
    *   Test the full end-to-end flow with live API keys. Ensure all loading and error states are handled gracefully.

