# Modern Styling & Animation Guide

## Overview
This guide explains the modern styling system with animations and hover effects implemented in the Property Management System.

## Theme Configuration

### Location
- **Main Theme**: `frontend/src/theme/theme.js`
- **Animations**: `frontend/src/theme/animations.js`
- **Global Styles**: `frontend/src/index.css`

### Color Palette
The system maintains the original color scheme:
- **Primary**: `#1976d2` (Blue)
- **Secondary**: `#dc004e` (Pink/Red)
- **Success**: `#4caf50` (Green)
- **Error**: `#ef5350` (Red)
- **Warning**: `#ff9800` (Orange)
- **Info**: `#03a9f4` (Light Blue)

## Animations

### Available Keyframe Animations

#### 1. Fade In
```jsx
className="animate-fade-in"
```
Smoothly fades in elements from bottom to top.

#### 2. Slide In Right
```jsx
className="animate-slide-in-right"
```
Slides elements in from the right side.

#### 3. Slide In Left
```jsx
className="animate-slide-in-left"
```
Slides elements in from the left side.

#### 4. Scale In
```jsx
className="animate-scale-in"
```
Scales elements from 95% to 100% size.

#### 5. Pulse
```jsx
className="animate-pulse"
```
Creates a pulsing effect (good for alerts/notifications).

#### 6. Bounce
```jsx
className="animate-bounce"
```
Bounces elements up and down.

### Stagger Animation for Lists
Automatically staggers animations for list items:

```jsx
<Box>
  {items.map((item, index) => (
    <Card key={item.id} className="stagger-item">
      {/* Content */}
    </Card>
  ))}
</Box>
```

## Hover Effects

### Material-UI Components
All Material-UI components now have enhanced hover effects built into the theme:

#### Buttons
- **Lift effect**: Buttons raise up on hover
- **Shadow enhancement**: Shadows become more prominent
- **Active state**: Buttons press down when clicked

```jsx
<Button variant="contained">
  Hover me
</Button>
```

#### Cards
- **Elevation change**: Cards lift up slightly
- **Shadow enhancement**: More prominent shadows on hover

```jsx
<Card>
  {/* Content */}
</Card>
```

#### Icon Buttons
- **Scale effect**: Icons grow slightly on hover
- **Background highlight**: Subtle background color appears

```jsx
<IconButton>
  <EditIcon />
</IconButton>
```

#### Table Rows
- **Background highlight**: Rows highlight on hover
- **Smooth transition**: Color changes smoothly

```jsx
<TableRow hover>
  <TableCell>Content</TableCell>
</TableRow>
```

#### Chips
- **Scale effect**: Chips grow slightly on hover

```jsx
<Chip label="Tag" />
```

### Custom Hover Classes

#### Hover Lift
```jsx
<Box className="hover-lift">
  {/* Content lifts up on hover */}
</Box>
```

#### Hover Glow
```jsx
<Box className="hover-glow">
  {/* Content glows on hover */}
</Box>
```

#### Hover Scale
```jsx
<Box className="hover-scale">
  {/* Content scales up on hover */}
</Box>
```

## Enhanced Scrollbar

Custom styled scrollbar with:
- **Gradient color**: Matches primary theme color
- **Smooth transitions**: Color transitions on hover
- **Glow effect**: Subtle glow on hover
- **Cross-browser support**: Works in Chrome, Firefox, Safari

## Using Animations in Code

### Method 1: CSS Classes (Recommended)
```jsx
import { Box } from '@mui/material';

function MyComponent() {
  return (
    <Box className="animate-fade-in hover-lift">
      <Card>Content</Card>
    </Box>
  );
}
```

### Method 2: Import Animation Utilities
```jsx
import { hoverEffects, animations } from '../theme/animations';
import { Box } from '@mui/material';

function MyComponent() {
  return (
    <Box sx={{ ...animations.fadeIn, ...hoverEffects.lift }}>
      <Card>Content</Card>
    </Box>
  );
}
```

### Method 3: Inline with sx Prop
```jsx
<Card 
  sx={{
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    },
  }}
>
  Content
</Card>
```

## Gradient Backgrounds

### Available Gradient Classes

```jsx
<Box className="gradient-primary">
  {/* Blue gradient */}
</Box>

<Box className="gradient-success">
  {/* Green gradient */}
</Box>

<Box className="gradient-warning">
  {/* Orange gradient */}
</Box>

<Box className="gradient-error">
  {/* Red gradient */}
</Box>
```

## Glass Morphism Effect

Create glassmorphic UI elements:

```jsx
<Box className="glass-effect" sx={{ p: 3 }}>
  {/* Semi-transparent with blur effect */}
</Box>
```

## Best Practices

### 1. Performance
- Use CSS transforms instead of changing `top`, `left`, `width`, or `height`
- Prefer `transform` and `opacity` for animations (GPU accelerated)
- Avoid animating too many elements simultaneously

### 2. Accessibility
- Respect `prefers-reduced-motion` for users who prefer less animation
- Ensure hover effects don't hide important information
- Maintain sufficient color contrast

### 3. Consistency
- Use theme-provided animations and transitions
- Stick to the 0.3s duration for most transitions
- Use easing functions from the theme

### 4. Subtlety
- Keep animations subtle and purposeful
- Don't overuse animations
- Animations should enhance, not distract

## Examples

### Animated Card Grid
```jsx
import { Grid, Card, CardContent } from '@mui/material';

function Dashboard() {
  return (
    <Grid container spacing={3}>
      {items.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={item.id}>
          <Card className="stagger-item hover-lift">
            <CardContent>
              {item.content}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
```

### Animated Page Container
```jsx
import { Box, Typography } from '@mui/material';

function MyPage() {
  return (
    <Box className="page-container">
      <Box className="page-header">
        <Typography variant="h4" className="animate-slide-in-left">
          Dashboard
        </Typography>
      </Box>
      
      <Box className="animate-fade-in">
        {/* Page content */}
      </Box>
    </Box>
  );
}
```

### Interactive Button
```jsx
import { Button } from '@mui/material';

function ActionButton() {
  return (
    <Button 
      variant="contained" 
      className="hover-glow"
      sx={{
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
      }}
    >
      Click Me
    </Button>
  );
}
```

## Transition Timings

All transitions use the following timing values:
- **Fast**: 150ms (micro-interactions)
- **Standard**: 300ms (most animations)
- **Slow**: 500ms (page transitions)

## Browser Support

The styling system supports:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Troubleshooting

### Animations not showing
1. Check that `index.css` is imported in `main.jsx`
2. Verify the theme is wrapped around your app
3. Clear browser cache

### Hover effects not working
1. Ensure the theme is properly imported
2. Check that components are using Material-UI components
3. Verify no conflicting CSS

### Performance issues
1. Reduce the number of animated elements
2. Use `will-change` CSS property sparingly
3. Avoid animating during page load

## Additional Resources

- Material-UI Theme Documentation: https://mui.com/material-ui/customization/theming/
- CSS Animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations
- Performance Best Practices: https://web.dev/animations/

