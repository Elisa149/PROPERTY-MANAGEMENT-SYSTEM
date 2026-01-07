/**
 * Animation utilities and keyframes for the application
 * Modern animations while maintaining classic elegance
 */

// Keyframe animations
export const keyframes = {
  // Fade in animation
  fadeIn: `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  // Slide in from right
  slideInRight: `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  // Slide in from left
  slideInLeft: `
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  // Scale in animation
  scaleIn: `
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,

  // Pulse animation
  pulse: `
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
  `,

  // Shimmer effect
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `,

  // Bounce animation
  bounce: `
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }
  `,

  // Rotate animation
  rotate: `
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
};

// Animation styles that can be applied to components
export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.4s ease-out',
  },

  slideInRight: {
    animation: 'slideInRight 0.4s ease-out',
  },

  slideInLeft: {
    animation: 'slideInLeft 0.4s ease-out',
  },

  scaleIn: {
    animation: 'scaleIn 0.3s ease-out',
  },

  pulse: {
    animation: 'pulse 2s ease-in-out infinite',
  },

  bounce: {
    animation: 'bounce 1s ease-in-out infinite',
  },

  rotate: {
    animation: 'rotate 1s linear infinite',
  },
};

// Transition utilities
export const transitions = {
  default: 'all 0.3s ease-in-out',
  fast: 'all 0.15s ease-in-out',
  slow: 'all 0.5s ease-in-out',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// Hover effects
export const hoverEffects = {
  lift: {
    transition: transitions.smooth,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  },

  glow: {
    transition: transitions.smooth,
    '&:hover': {
      boxShadow: '0 0 20px rgba(25, 118, 210, 0.4)',
    },
  },

  scale: {
    transition: transitions.smooth,
    '&:hover': {
      transform: 'scale(1.02)',
    },
  },

  scaleDown: {
    transition: transitions.fast,
    '&:active': {
      transform: 'scale(0.98)',
    },
  },

  brighten: {
    transition: transitions.smooth,
    '&:hover': {
      filter: 'brightness(1.1)',
    },
  },

  underline: {
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '0%',
      height: '2px',
      backgroundColor: 'currentColor',
      transition: 'width 0.3s ease-in-out',
    },
    '&:hover::after': {
      width: '100%',
    },
  },
};

// Card hover effects
export const cardHoverEffects = {
  elevate: {
    transition: transitions.smooth,
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    },
  },

  subtle: {
    transition: transitions.smooth,
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
  },

  border: {
    transition: transitions.smooth,
    border: '2px solid transparent',
    '&:hover': {
      borderColor: 'primary.main',
    },
  },
};

// Button hover effects
export const buttonHoverEffects = {
  lift: {
    transition: transitions.smooth,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },

  expand: {
    transition: transitions.smooth,
    '&:hover': {
      transform: 'scale(1.05)',
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },

  glow: {
    transition: transitions.smooth,
    '&:hover': {
      boxShadow: '0 0 16px rgba(25, 118, 210, 0.5)',
    },
  },
};

// Loading animations
export const loadingAnimations = {
  shimmer: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 2s infinite',
  },

  pulse: {
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

// Stagger animations for lists
export const staggerAnimation = (index, delay = 0.1) => ({
  animation: 'fadeIn 0.4s ease-out',
  animationDelay: `${index * delay}s`,
  animationFillMode: 'both',
});

