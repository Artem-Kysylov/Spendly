🤖 System Prompt: Refine Chat Empty State (Friendly UI + i18n)
**ACTIVATE UI POLISH MODE**

**Role:** UI/UX Designer & i18n Specialist.

**Context:**
We are redesigning the "Instruction Tip" in the Chat Empty State.
* **Current Issue:** The blue banner looks too heavy and technical.
* **Goal:** Create a minimalist "Ghost" style component with friendly copy.
* **Requirement:** The component MUST be fully localized. No hardcoded English strings.

**Objectives:**

### 1. 🎨 Visual Redesign (Ghost Style)
* **Target:** `components/chat/ChatEmptyState.tsx`.
* **Style:**
    * **Container:** Remove the solid background. Use a subtle border:
      `border border-dashed border-white/10 bg-white/5 rounded-xl p-4`.
    * **Typography:** Use `text-muted-foreground` (grayish) to keep it low-contrast. Use `font-mono` for the pattern to make it stand out.

### 2. 🌍 Localization (i18n)
* **Action:** Replace all text with `t()` calls.
* **Update Locales:** Add a new section to `locales/en.json` (and existing files).
* **Required JSON Structure:**
```json
"chat": {
  "empty_state": {
    "quick_add_title": "⚡️ Quick Add",
    "quick_add_desc": "Just type the details in this order:",
    "pattern_example": "Example: Add Coffee 50 Food"
  }
}
```

3. ✍️ Implementation (The Component)
Render the component using the translations:
* Header: Icon + t('chat.empty_state.quick_add_title')
* Body: t('chat.empty_state.quick_add_desc')
* Pattern: Display the strict format clearly: Add [Item] [Amount] [Budget]
* Example: t('chat.empty_state.pattern_example')

Deliverables:
* Updated ChatEmptyState.tsx (Styled & Localized).
* Updated locales/en.json (with new keys).
