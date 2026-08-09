import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigationType, useOutlet } from "react-router-dom";
import { getPageVariants, pageTransition } from "@/lib/motion";

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const navType = useNavigationType();
  const reducedMotion = useReducedMotion();
  const previousPath = useRef(location.pathname);

  const isPop = navType === "POP";
  const variants = getPageVariants(
    previousPath.current,
    location.pathname,
    isPop,
    reducedMotion ?? false,
  );

  useEffect(() => {
    previousPath.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="h-dvh overflow-hidden relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={pageTransition}
          className="absolute inset-0 h-full overflow-x-hidden overflow-y-auto overscroll-y-contain"
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
