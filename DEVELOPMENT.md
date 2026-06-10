# StudyCard Developer Documentation

This document serves as a comprehensive developer guide for **StudyCard**, a modern, lightweight flashcard application designed to run cross-platform on **Windows** and **Android**. It outlines the project's current state, architecture, core abstractions, and build pipelines to assist future developers or AI agents in modifying and improving the application.

---

## 🚀 Technology Stack

- **Framework:** [Svelte 5](https://svelte.dev/) (using Svelte Runes for reactive states).
- **Tooling & Bundler:** [Vite](https://vite.dev/) + TypeScript (strict compilation).
- **Styling:** Premium Vanilla CSS (located in `src/app.css`) featuring custom CSS variables, responsive mobile adaptations, 3D card flips, and custom scrollbars.
- **CSV/TXT Parser:** [PapaParse](https://www.papaparse.com/) for CSV parsing.
- **Mobile Wrapper:** [Capacitor](https://capacitorjs.com/) for native Android packaging.
- **Persistence:** Synchronous `localStorage` serialization.

---

## 📂 Project Structure Map

```text
StudyCard/
├── android/                   # Native Android Studio Gradle Project (Capacitor)
├── public/                    # Static assets (favicons, SVG icons)
├── src/
│   ├── assets/                # App asset icons
│   ├── lib/
│   │   ├── components/        # Svelte UI View Components
│   │   │   ├── DeckDetail.svelte     # Card list, CRUD forms, shuffler, mode launcher
│   │   │   ├── DeckList.svelte       # Dashboard, CSV/TXT upload dropzone, deck creator
│   │   │   ├── ExamMode.svelte       # Quiz taking, percentage grading, mistake logs
│   │   │   └── PracticeMode.svelte   # Interactive 3D card flips with hotkeys
│   │   ├── locales/           # i18n JSON locales
│   │   │   ├── en.json               # English translation terms
│   │   │   └── hu.json               # Hungarian translation terms
│   │   ├── i18n.svelte.ts     # Global reactive translation engine (Svelte 5)
│   │   ├── storage.svelte.ts  # Global reactive Deck/Card CRUD store & LocalStorage
│   │   ├── toast.svelte.ts    # Global reactive Toast notify store
│   │   ├── types.ts           # TypeScript type interfaces
│   │   └── utils.ts           # Text utility formatters (e.g., HTML line break translation)
│   ├── App.svelte             # Main UI layout, viewport switcher, global headers
│   ├── app.css                # Global premium CSS styling sheet
│   └── main.ts                # Application mount entrypoint
├── capacitor.config.ts        # Capacitor mobile metadata config
├── index.html                 # Entry HTML template with SEO tags
├── package.json               # Dependencies and script definitions
└── tsconfig.json              # TypeScript compilation rules
```

---

## 🏗️ Architectural Core Concepts

### 1. Svelte 5 Runes Reactivity
We use Svelte 5's runes for cross-file shared reactivity. By naming store files with `.svelte.ts` extensions, we write clean reactive states using `$state`, `$derived`, and getters/setters:

- **`deckStore` ([storage.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/storage.svelte.ts)):**
  Exports a reactive `decks` array. When a card is added, edited, or deleted, Svelte's reactive bindings automatically update the UI everywhere. Decks are saved using `JSON.stringify` to `localStorage` on modifications. Default sample decks (Nyelvek, Műveltség) are auto-populated if `localStorage` is empty.
- **`i18n` ([i18n.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/i18n.svelte.ts)):**
  Exposes a reactive `locale` property (switching triggers UI re-renders) and a translation function `t(key, params)` that dynamically evaluates string overrides (e.g. `{current} of {total}`).
- **`toastStore` ([toast.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/toast.svelte.ts)):**
  Manages temporary alert popups with automatic 3-second fade timeouts.

### 2. CSV & TXT Parser Delimiters
The deck uploader in `DeckList.svelte` accepts both `.csv` and `.txt` files.
- It extracts the file extension.
- **For `.txt` files:** It forces a semicolon (`;`) separator delimiter.
- **For `.csv` files:** It runs auto-detect for commas, semicolons, or tabs.
- Skips header columns if the first row matches standard headers (*front, back, question, definition, előlap, hátlap*).

### 3. Safe Card Text Layout Formatting
To render HTML formatting like line breaks safely, we filter all raw text using `formatCardText` from `utils.ts`:
1. It escapes dangerous HTML characters (`<`, `>`, `&`, `"`, `'`) to prevent layout breaks or scripting insertion.
2. It translates `<br>`, `<br/>`, and `<br />` strings back into safe `<br />` tags.
3. Content is rendered in components using Svelte's `{@html formatCardText(text)}` tag.

### 4. Card Scroll Wrapper and Centering
Inside `.flashcard-face`, the layout clears paddings and utilizes a dedicated child `.card-content-wrapper` styled with `overflow-y: auto`.
- Inside the wrapper, the `.card-content-text` is styled with `margin: auto`.
- This ensures short text blocks are vertically centered, while very long paragraphs scroll smoothly without overlapping absolute header badges or footer navigation prompts.

---

## 🛠️ Developer Workflows

### 💻 Web Development
To run the web app locally with Hot Module Replacement (HMR):
```powershell
npm install
npm run dev
```

To run diagnostics and verify types compile:
```powershell
npm run check
```

---

## 📱 Mobile Workflow (Android)

Capacitor wraps the web application in a native Gradle wrapper.

### Build and Synchronize Mobile Assets
Whenever you edit code in the Svelte project and want to test on Android:
1.  **Build the static website:**
    ```powershell
    npm run build
    ```
2.  **Sync assets into the Android native template:**
    ```powershell
    npx cap sync
    ```

### Compiling to APK
1.  **Open Android Studio:**
    ```powershell
    npx cap open android
    ```
2.  **Let Android Studio sync Gradle.**
3.  Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4.  Retreive the compiled file at:
    `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔮 Roadmap / Future Extensions

Future developers might want to target these areas for improvements:

1.  **Windows Desktop packaging (Tauri v2):**
    Install Rust and Visual Studio Build tools, run `npm install @tauri-apps/cli` and `npx tauri init` to bundle the app as a lightweight standalone Windows `.exe` installer.
2.  **Spaced Repetition System (SRS):**
    Expand the `Card` interface in `types.ts` to include review intervals, ease factor, and next review timestamps (e.g. SuperMemo-2 algorithm) for smarter practice prompts.
3.  **Supabase / Remote sync:**
    Configure a cloud database to synchronize decks across Windows and Android systems dynamically under a user profile account.
