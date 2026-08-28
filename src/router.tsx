import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Native browser View Transitions API — crossfades only the DOM regions that actually
    // changed between navigations, so persistent layout chrome (e.g. the business dashboard
    // sidebar) isn't forced to unmount/remount the way a keyed AnimatePresence wrapper around
    // the root <Outlet/> would. No-ops gracefully in browsers without support.
    defaultViewTransition: true,
  });

  return router;
};
