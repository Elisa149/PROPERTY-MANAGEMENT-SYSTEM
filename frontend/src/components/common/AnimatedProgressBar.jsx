import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';
import { keyframes } from '@mui/system';

// Keyframe for counter animation
const countUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Animated progress bar with percentage
const AnimatedProgressBar = ({
  value = 0, // Current value
  total = 100, // Total value
  label = '',
  showAmount = false,
  formatCurrency,
  color = 'primary',
  height = 12,
  animationDuration = 1500, // Duration in milliseconds
  showPercentage = true,
  variant = 'default', // 'default', 'minimal', 'detailed'
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  useEffect(() => {
    // Animate the progress bar
    const duration = animationDuration;
    const steps = 60; // 60 frames for smooth animation
    const increment = percentage / steps;
    const valueIncrement = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setAnimatedPercentage(Math.min(increment * currentStep, percentage));
        setAnimatedValue(Math.min(valueIncrement * currentStep, value));
      } else {
        clearInterval(timer);
        setAnimatedPercentage(percentage);
        setAnimatedValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, total, percentage, animationDuration]);

  // Determine color based on percentage
  const getColor = () => {
    if (color !== 'auto') return color;
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const dynamicColor = getColor();

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={animatedPercentage}
          color={dynamicColor}
          sx={{
            height: height,
            borderRadius: height / 2,
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            '& .MuiLinearProgress-bar': {
              borderRadius: height / 2,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
        />
      </Box>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `${dynamicColor}.light`,
            opacity: 0.2,
          }}
        />

        {label && (
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, position: 'relative' }}>
            {label}
          </Typography>
        )}

        <Box sx={{ mb: 2, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            {showAmount && formatCurrency ? (
              <>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    color: `${dynamicColor}.main`,
                    animation: `${countUp} 0.6s ease-out`,
                  }}
                >
                  {formatCurrency(animatedValue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {formatCurrency(total)}
                </Typography>
              </>
            ) : (
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  color: `${dynamicColor}.main`,
                  animation: `${countUp} 0.6s ease-out`,
                }}
              >
                {animatedPercentage.toFixed(1)}%
              </Typography>
            )}
          </Box>

          <LinearProgress
            variant="determinate"
            value={animatedPercentage}
            color={dynamicColor}
            sx={{
              height: height,
              borderRadius: height / 2,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                borderRadius: height / 2,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 10px ${dynamicColor}.main`,
              },
            }}
          />

          {showPercentage && showAmount && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 'bold', color: `${dynamicColor}.main` }}
              >
                {animatedPercentage.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Remaining amount */}
        {showAmount && total > value && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              pt: 2,
              borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Remaining:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(total - animatedValue)}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  }

  // Default variant
  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {showPercentage && (
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{
                color: `${dynamicColor}.main`,
                animation: `${countUp} 0.6s ease-out`,
              }}
            >
              {animatedPercentage.toFixed(1)}%
            </Typography>
          )}
        </Box>
      )}

      <LinearProgress
        variant="determinate"
        value={animatedPercentage}
        color={dynamicColor}
        sx={{
          height: height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          '& .MuiLinearProgress-bar': {
            borderRadius: height / 2,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      />

      {showAmount && formatCurrency && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(animatedValue)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatCurrency(total)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AnimatedProgressBar;

