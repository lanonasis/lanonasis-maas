
/**
 * Animation utilities for the application
 */

// Staggered animation for lists and grids
export const staggeredAnimation = (index: number, baseDelay: number = 0.05) => {
  return {
    initial: { opacity: 0, y: 15 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: baseDelay * index,
        duration: 0.4,
        ease: [0.19, 1, 0.22, 1] // ease-out-expo
      }
    },
    exit: { 
      opacity: 0,
      y: 15,
      transition: {
        duration: 0.3,
        ease: [0.445, 0.05, 0.55, 0.95] // ease-in-out-sine
      }
    }
  };
};

// Fade in animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.19, 1, 0.22, 1] // ease-out-expo
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.445, 0.05, 0.55, 0.95] // ease-in-out-sine
    }
  }
};

// Scale animation
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.19, 1, 0.22, 1] // ease-out-expo
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.445, 0.05, 0.55, 0.95] // ease-in-out-sine
    }
  }
};

// Page transition
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.19, 1, 0.22, 1], // ease-out-expo
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.445, 0.05, 0.55, 0.95] // ease-in-out-sine
    }
  }
};

// Blur in animation
export const blurIn = {
  initial: { opacity: 0, filter: "blur(5px)" },
  animate: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.19, 1, 0.22, 1] // ease-out-expo
    }
  },
  exit: { 
    opacity: 0,
    filter: "blur(5px)",
    transition: {
      duration: 0.3,
      ease: [0.445, 0.05, 0.55, 0.95] // ease-in-out-sine
    }
  }
};
