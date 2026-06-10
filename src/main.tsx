import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import "./index.css"
import { queryClient } from "./lib/queryClient"
import { router } from "./router"
import { ensureSession } from "./lib/auth"

const root = createRoot(document.getElementById("root")!)

async function bootstrap() {
  try {
    // Establish the anonymous authenticated session before the app reads anything,
    // otherwise RLS denies every query.
    await ensureSession()
  } catch (err) {
    root.render(
      <StrictMode>
        <div className="text-destructive m-8 whitespace-pre-wrap text-sm">
          {(err as Error).message}
        </div>
      </StrictMode>,
    )
    return
  }

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
