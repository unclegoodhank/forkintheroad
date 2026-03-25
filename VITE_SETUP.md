# Vite + React Setup

Your project is now configured with Vite, React, and TypeScript.

## Quick Start

### Development

1. **Start the Vite dev server:**
   ```bash
   npm run dev
   ```
   This opens the React app at `http://localhost:5173` with hot module reload.

2. **In another terminal, start your Express server:**
   ```bash
   npm start
   ```
   This runs at `http://localhost:3000` and serves your API endpoints.

### Production

1. **Build the React app:**
   ```bash
   npm run build
   ```
   Creates an optimized `dist/` folder.

2. **Start the server:**
   ```bash
   npm start
   ```
   The Express server serves the built React app from `dist/`.

## Project Structure

```
src/
├── pages/           # Page components (Home, SecondPage, etc.)
├── components/      # Reusable components (Layout, etc.)
├── styles/          # CSS files
├── lib/             # Utilities (api.ts for API calls)
├── App.tsx          # Main app with routing
└── main.tsx         # Entry point
```

## API Integration

The API utility in `src/lib/api.ts` handles calls to your Express backend:

```typescript
import { api } from '../lib/api'

// Make API calls
const response = await api.get('/api/restaurants')
```

During development, requests to `/api/*` are proxied to `http://localhost:3000`.

## Adding Pages

1. Create a new file in `src/pages/MyPage.tsx`
2. Add the route in `src/App.tsx`:
   ```typescript
   <Route path="/mypage" element={<MyPage />} />
   ```
3. Add navigation in `src/components/Layout.tsx`

## Integrating Untitled UI Components

When ready to add Untitled UI components from Figma:
- Install shadcn/ui (component library based on Untitled UI)
- Import components and customize with your design tokens
- Build pages using the component library

## Environment Variables

Copy `.env.example` to `.env` and customize:
- `VITE_API_URL` — Your backend API URL
- Other server config (PORT, PASSWORD, SESSION_SECRET)

## Troubleshooting

- **Port already in use?** Change `server.port` in `vite.config.ts`
- **API calls fail?** Check that the Express server is running on port 3000
- **Build issues?** Run `npm run build` to check for TypeScript errors

## Next Steps

1. Replace placeholder pages with your actual content
2. Add Untitled UI components as needed
3. Connect your existing restaurant API endpoints
4. Test API integration with the sample Home page
