# Frontend Conventions & Component Reuse Policy

1. **Tailwind CSS Utility First:** All styling uses utility classes directly.
2. **Component Reuse:** Feature layouts must reuse primitives from `components/ui/` (buttons, badges, cards, dialogs, status indicators) to maintain visual consistency.
3. **No Mock Data in Production Components:** UI components fetch data from Express backend endpoints (`/api/v1/...`).
