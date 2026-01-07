import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

// Animated counter for numbers
const AnimatedCounter = ({
  value = 0,
  duration = 1500,
  formatCurrency,
  variant = 'h4',
  color = 'primary.main',
  suffix = '',
  prefix = '',
  decimals = 0,
  ...props
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const steps = 60;
    const increment = value / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setCount(increment * currentStep);
      } else {
        clearInterval(timer);
        setCount(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  const formattedValue = formatCurrency
    ? formatCurrency(count)
    : `${prefix}${count.toFixed(decimals)}${suffix}`;

  return (
    <Typography variant={variant} color={color} {...props}>
      {formattedValue}
    </Typography>
  );
};

export default AnimatedCounter;

