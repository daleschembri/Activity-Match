import type { Transition, Variants } from "framer-motion";

export const easeOut = [0.32, 0.72, 0, 1] as const;

export const pageTransition: Transition = {
  duration: 0.3,
  ease: easeOut,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
};

export const TAB_PATHS = ["/", "/plans", "/chats", "/notifications", "/create/describe", "/profile"];

export function isTabPath(path: string): boolean {
  return TAB_PATHS.includes(path) || path.startsWith("/create");
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeOut },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.26, ease: easeOut },
  },
};

export const messageIn: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSoft,
  },
};

export const discoverCardEnter: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSoft,
  },
};

export function discoverCardExit(direction: "left" | "right" | "up"): Variants {
  if (direction === "left") {
    return {
      exit: {
        opacity: 0,
        x: -320,
        rotate: -10,
        transition: { duration: 0.32, ease: easeOut },
      },
    };
  }
  if (direction === "right") {
    return {
      exit: {
        opacity: 0,
        x: 320,
        rotate: 10,
        transition: { duration: 0.32, ease: easeOut },
      },
    };
  }
  return {
    exit: {
      opacity: 0,
      y: -180,
      scale: 0.92,
      transition: { duration: 0.3, ease: easeOut },
    },
  };
}

export function getPageVariants(from: string, to: string, isPop: boolean, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  if (isTabPath(from) && isTabPath(to) && from !== to) {
    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -6 },
    };
  }

  if (isPop) {
    return {
      initial: { opacity: 0, x: -16 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 16 },
    };
  }

  return {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  };
}
