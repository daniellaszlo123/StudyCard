# StudyCard Developer Documentation

This document serves as a comprehensive developer guide for **StudyCard**, a modern, lightweight flashcard application designed to run cross-platform on **Windows** and **Android**. It outlines the project's current state, architecture, core abstractions, and build pipelines to assist future developers or AI agents in modifying and improving the application.

---

## 🚀 Technology Stack

- **Framework:** [Svelte 5](https://svelte.dev/) (using Svelte Runes for reactive states).
- **Tooling & Bundler:** [Vite](https://vite.dev/) + TypeScript (strict compilation).
- **Styling:** Premium Vanilla CSS (located in `src/app.css`) featuring custom CSS variables, responsive mobile adaptations, 3D card flips, and custom scrollbars.
- **CSV/TXT Parser:** [PapaParse](https://www.papaparse.com/) for CSV parsing.
- **Desktop Wrapper:** [Tauri v2](https://tauri.app/) for native Windows packaging and desktop installer generation.
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
│   │   │   ├── BankDetail.svelte     # Question bank CRUD, exam configurations, stats review
│   │   │   ├── BankList.svelte       # Question bank dashboard, CSV/TXT uploader
│   │   │   ├── BankExam.svelte       # Multiple-choice exam player, grading, overall feedback
│   │   │   ├── DeckDetail.svelte     # Card list, CRUD forms, shuffler, mode launcher
│   │   │   ├── DeckList.svelte       # Dashboard, CSV/TXT upload dropzone, deck creator
│   │   │   ├── ExamMode.svelte       # Quiz taking, percentage grading, mistake logs
│   │   │   └── PracticeMode.svelte   # Interactive 3D card flips with hotkeys
│   │   ├── locales/           # i18n JSON locales
│   │   │   ├── en.json               # English translation terms
│   │   │   └── hu.json               # Hungarian translation terms
│   │   ├── bankStorage.svelte.ts # Global reactive Question Bank CRUD & statistics store
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
- **`bankStore` ([bankStorage.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/bankStorage.svelte.ts)):**
  Exports a reactive `banks` array and a global `stats` record tracking question answer history. Handles CRUD logic for banks and questions, persisting data to `localStorage` under keys `studycard_banks` and `studycard_bank_stats`. Auto-populates sample banks for Geography and Web Programming if empty.
- **`i18n` ([i18n.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/i18n.svelte.ts)):**
  Exposes a reactive `locale` property (switching triggers UI re-renders) and a translation function `t(key, params)` that dynamically evaluates string overrides (e.g. `{current} of {total}`).
- **`toastStore` ([toast.svelte.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/toast.svelte.ts)):**
  Manages temporary alert popups with automatic 3-second fade timeouts.

### 2. CSV & TXT Parser Delimiters
The application parses CSV and TXT files for both Decks and Question Banks:
- **For Decks:** `DeckList.svelte` processes a 2-column format. Delimiters are forced to semicolon (`;`) for `.txt` files or auto-detected for `.csv` files.
- **For Question Banks:** `BankList.svelte` processes a 3-column format representing:
  1. Column 1: Question
  2. Column 2: Possible Options (choices separated by `|`, `;` or `,` in order of preference)
  3. Column 3: Correct Answer
- **Header Skippers:** Columns starting with keywords like *front*, *back*, *question*, *choices*, *answer*, *correct* are recognized as metadata headers and are automatically skipped.
- **Quote Characters:** Quote parsing is disabled (`quoteChar: ''`) in `Papa.parse` to prevent unescaped quotes (e.g., HTML tags or conversational double quotes inside text fields) from merging lines and causing truncation or parsing errors.
- **Empty Field/Consecutive Delimiter Handling:** Parsed rows are filtered to remove any empty elements (via `row.map(s => s?.trim()).filter(Boolean)`) before column length verification. This ensures that consecutive delimiters (e.g., double semicolons `;;`) and trailing delimiters do not introduce empty fields that would cause questions or cards to be skipped. The parser retrieves the final column as the correct answer (or card back) from the last index of the filtered array.

### 3. Safe Card Text Layout Formatting
To render HTML formatting like line breaks safely, we filter all raw text using `formatCardText` from `utils.ts`:
1. It escapes dangerous HTML characters (`<`, `>`, `&`, `"`, `'`) to prevent layout breaks or scripting insertion.
2. It translates `<br>`, `<br/>`, and `<br />` strings back into safe `<br />` tags.
3. Content is rendered in components using Svelte's `{@html formatCardText(text)}` tag.

### 4. Card Scroll Wrapper and Centering
Inside `.flashcard-face`, the layout clears paddings and utilizes a dedicated child `.card-content-wrapper` styled with `overflow-y: auto`.
- Inside the wrapper, the `.card-content-text` is styled with `margin: auto`.
- This ensures short text blocks are vertically centered, while very long paragraphs scroll smoothly without overlapping absolute header badges or footer navigation prompts.

### 5. Multiple Choice Exam Generation & Difficulty Scoring
In `BankExam.svelte`, the user can configure a multiple-choice session.
- **Question Count:** The user can request an exam size of $N$ questions.
- **Difficulty Rating:** Each question's error rate is tracked dynamically:
  $$\text{Difficulty Score} = \frac{\text{wrongCount}}{\text{correctCount} + \text{wrongCount}}$$
- **Difficult Exam Selection:** In "Focus on Difficult Questions" mode, questions that have been answered incorrectly at least once (`wrongCount > 0`) are sorted descending by difficulty score and total wrong count.
- **Adaptive Backfilling:** If the bank contains fewer than $N$ questions with recorded mistakes, the exam is backfilled to the requested count of $N$ using remaining randomized questions from the bank.
- **Visual Feedback:** Options change colors instantly upon clicking (green for correct, red for incorrect along with highlighting the correct one), accompanied by a slide-by-slide progress counter and a full review list of mistakes at the end of the session. To improve usability in long exams, action buttons (Exit Exam, Restart Exam) are duplicated at both the top and bottom of the results screen.
- **Shuffle Possible Answers:** Users can toggle "Shuffle answer options" during exam setup. When enabled, the possible answers (choices) for each question are randomized per exam session. This is handled by cloning the question objects and shuffling their `choices` arrays dynamically in the exam player component, ensuring the original database/store records in `localStorage` remain intact and correctness comparison (which matches option strings) works seamlessly.

---

## ☁️ Cloud Sync and User Accounts

To support cross-platform synchronization of card decks, question banks, and progress stats without a complex backend, StudyCard integrates with a free Supabase instance.

### 1. Connection Credentials Setup
Developer can configure connection keys inside the [.env](file:///c:/Users/lolga/Documents/StudyCard/.env) file:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```
These are loaded dynamically in [config.ts](file:///c:/Users/lolga/Documents/StudyCard/src/lib/config.ts). If left blank, the application degrades gracefully to local-only mode, disabling the cloud account UI modal actions.

### 2. Username & Password Auth
End-users log in or register using a **Username** and **Password** (no emails are requested). Usernames are case-insensitively unique:
- The username is mapped to a local email format: `username.toLowerCase() + "@studycard.com"`.
- This handles case-insensitivity mapping (e.g. `User` and `user` resolve to the exact same database account name) and satisfies standard Supabase email requirements.
- The email confirmation requirement must be disabled on the Supabase project dashboard (Settings -> Auth -> Email Auth -> Confirm email = false).

### 3. Database Table Schema
Run the following SQL snippet in the Supabase Dashboard SQL Editor to set up the data table and Row Level Security:

```sql
create table if not exists studycard_sync (
  user_id uuid references auth.users not null primary key,
  decks jsonb default '[]'::jsonb,
  banks jsonb default '[]'::jsonb,
  stats jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table studycard_sync enable row level security;

-- Create policy for users to manage their own data row
create policy "Users can manage their own data"
  on studycard_sync for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 4. Sync Operations
- **Merge**: Automatically triggered upon successful login. Combines remote cloud card decks, question banks, and progress records with any local data. The combined set is then updated in local storage and pushed back to the cloud database.
- **Auto-Sync**: If active, local modifications (adding/editing cards, question attempts) automatically update the cloud record in the background.
- **Log Out**: Resets local state to generic default cards to ensure user privacy.

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

#### Method A: Command-Line (Fastest)
You can build the APK directly from your terminal. Since modern Android builds are sensitive to Java version mismatches (e.g. JDK 26 may fail), it is recommended to use Android Studio's bundled JDK 21.

1.  **Build and sync your web assets:**
    ```powershell
    npm run build
    npx cap sync
    ```
2.  **Compile the APK via Gradle Wrapper:**
    On Windows (PowerShell):
    ```powershell
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    cd android
    .\gradlew.bat assembleDebug
    cd ..
    ```
3.  **Retrieve the compiled APK at:**
    `android/app/build/outputs/apk/debug/app-debug.apk`

#### Method B: Android Studio GUI
1.  **Open Android Studio:**
    ```powershell
    npx cap open android
    ```
2.  **Let Android Studio sync Gradle.**
3.  Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4.  Retrieve the compiled file at:
    `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🖥️ Desktop Workflow (Tauri)

Tauri wraps the web application in a native lightweight desktop frame using a Rust backend.

### Configure Bundle Identifier
In `src-tauri/tauri.conf.json`, you must customize the `identifier` property:
```json
"identifier": "com.studycard.app"
```
*(Using the default `com.tauri.dev` identifier is disallowed by Tauri during the release build.)*

### Build Desktop Installers
To build the production app and package standalone Windows installers:
```powershell
npx tauri build
```
This script runs the Svelte production build and utilizes Cargo and WiX/NSIS toolchains to output the final installer packages at:
- **NSIS Setup:** `src-tauri/target/release/bundle/nsis/StudyCard_0.1.0_x64-setup.exe`
- **MSI Installer:** `src-tauri/target/release/bundle/msi/StudyCard_0.1.0_x64_en-US.msi`

> [!IMPORTANT]
> **Dependency Troubleshooting (`alloc-no-stdlib` conflict)**
> If the Cargo build fails compiling the `brotli` crate with duplicate/conflicting `alloc-no-stdlib` errors (v2.0.4 vs v3.0.0), this is due to `brotli-decompressor` auto-updating to a version requiring `alloc-no-stdlib` v3 while `brotli` itself remains compiled against v2.
>
> To resolve this conflict, downgrade/lock the `brotli-decompressor` version inside the `src-tauri` directory's `Cargo.lock` by running:
> ```powershell
> cargo update -p brotli-decompressor --precise 5.0.0
> ```

---

## 🔮 Roadmap / Future Extensions

Future developers might want to target these areas for improvements:

1.  **Spaced Repetition System (SRS):**
    Expand the `Card` interface in `types.ts` to include review intervals, ease factor, and next review timestamps (e.g. SuperMemo-2 algorithm) for smarter practice prompts.

