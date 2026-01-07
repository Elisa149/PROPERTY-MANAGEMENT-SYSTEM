# ⚡ Animation Quick Start Guide

## 5-Minute Setup

Want to add animated counters and progress bars to your page? Here's how!

---

## Step 1: Import Components (30 seconds)

```jsx
import AnimatedCounter from '../components/common/AnimatedCounter';
import AnimatedProgressBar from '../components/common/AnimatedProgressBar';
```

---

## Step 2: Add Currency Formatter (30 seconds)

```jsx
const formatCurrency = (amount) => {
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  } catch (error) {
    return `UGX ${(amount || 0).toLocaleString()}`;
  }
};
```

---

## Step 3: Use in Your Component (2 minutes)

### Example 1: Simple Counter
```jsx
<AnimatedCounter
  value={150000}
  formatCurrency={formatCurrency}
  variant="h4"
  color="success.main"
/>
```

### Example 2: Progress Bar
```jsx
<AnimatedProgressBar
  value={75000}
  total={100000}
  label="Payment Collection"
  showAmount={true}
  formatCurrency={formatCurrency}
  color="auto"
/>
```

### Example 3: Complete Card
```jsx
<Card>
  <CardContent>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <MonetizationOn sx={{ color: 'success.main', mr: 1 }} />
      <Typography variant="h6">Total Collected</Typography>
    </Box>
    
    <AnimatedCounter
      value={250000}
      formatCurrency={formatCurrency}
      variant="h4"
      color="success.main"
      sx={{ fontWeight: 'bold' }}
    />
    
    <Typography variant="body2" color="text.secondary">
      From 45 payments
    </Typography>
    
    <Box sx={{ mt: 2 }}>
      <AnimatedProgressBar
        value={45}
        total={50}
        label="Payment Rate"
        color="success"
        height={8}
      />
    </Box>
  </CardContent>
</Card>
```

---

## Common Use Cases

### 1. Dashboard Stats
```jsx
<AnimatedCounter
  value={totalProperties}
  variant="h3"
  color="primary.main"
/>
```

### 2. Revenue Display
```jsx
<AnimatedCounter
  value={revenue}
  formatCurrency={formatCurrency}
  variant="h4"
  color="success.main"
/>
```

### 3. Percentage Display
```jsx
<AnimatedCounter
  value={85.5}
  suffix="%"
  decimals={1}
  variant="h5"
  color="info.main"
/>
```

### 4. Collection Progress
```jsx
<AnimatedProgressBar
  value={collected}
  total={expected}
  label="Collection Rate"
  showAmount={true}
  formatCurrency={formatCurrency}
  color="auto"
  height={12}
/>
```

### 5. Success Rate
```jsx
<AnimatedProgressBar
  value={completed}
  total={total}
  label="Success Rate"
  color="success"
  height={10}
/>
```

---

## Props Cheat Sheet

### AnimatedCounter
| Prop | Type | Default | Example |
|------|------|---------|---------|
| `value` | number | 0 | `150000` |
| `formatCurrency` | function | - | `formatCurrency` |
| `variant` | string | 'h4' | `'h3'` |
| `color` | string | 'primary.main' | `'success.main'` |
| `suffix` | string | '' | `'%'` |
| `decimals` | number | 0 | `2` |
| `duration` | number | 1500 | `2000` |

### AnimatedProgressBar
| Prop | Type | Default | Example |
|------|------|---------|---------|
| `value` | number | 0 | `75000` |
| `total` | number | 100 | `100000` |
| `label` | string | '' | `'Progress'` |
| `showAmount` | boolean | false | `true` |
| `formatCurrency` | function | - | `formatCurrency` |
| `color` | string | 'primary' | `'auto'` |
| `height` | number | 12 | `16` |
| `variant` | string | 'default' | `'detailed'` |

---

## Color Options

```jsx
// Theme colors
color="primary"   // Blue
color="success"   // Green
color="warning"   // Orange
color="error"     // Red
color="info"      // Light Blue

// Auto color (changes based on percentage)
color="auto"      // 0-49% red, 50-74% orange, 75-99% blue, 100% green
```

---

## Variants

### Progress Bar Variants

**Default** - Standard with labels
```jsx
variant="default"
```

**Minimal** - Clean, simple
```jsx
variant="minimal"
```

**Detailed** - Rich card with gradient
```jsx
variant="detailed"
```

---

## Tips & Tricks

### 1. Add Hover Effect to Cards
```jsx
<Card
  sx={{
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  }}
>
  {/* Your content */}
</Card>
```

### 2. Replay Animation
```jsx
const [key, setKey] = useState(0);

<AnimatedCounter
  key={key}  // Change key to replay
  value={value}
/>

<Button onClick={() => setKey(k => k + 1)}>
  Replay
</Button>
```

### 3. Conditional Colors
```jsx
<AnimatedCounter
  value={amount}
  color={amount > 0 ? 'success.main' : 'error.main'}
/>
```

### 4. Format Large Numbers
```jsx
// For millions
<AnimatedCounter
  value={2500000}
  formatCurrency={formatCurrency}
/>
// Shows: UGX 2,500,000
```

### 5. Multiple Progress Bars
```jsx
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
  <AnimatedProgressBar value={50} total={100} label="Task 1" />
  <AnimatedProgressBar value={75} total={100} label="Task 2" />
  <AnimatedProgressBar value={100} total={100} label="Task 3" />
</Box>
```

---

## Common Patterns

### Pattern 1: Stat Card with Progress
```jsx
<Card>
  <CardContent>
    <Typography variant="h6">Total Collected</Typography>
    <AnimatedCounter value={amount} formatCurrency={formatCurrency} />
    <AnimatedProgressBar value={amount} total={expected} />
  </CardContent>
</Card>
```

### Pattern 2: Comparison Display
```jsx
<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
  <Box>
    <Typography>This Month</Typography>
    <AnimatedCounter value={thisMonth} formatCurrency={formatCurrency} />
  </Box>
  <Box>
    <Typography>Last Month</Typography>
    <AnimatedCounter value={lastMonth} formatCurrency={formatCurrency} />
  </Box>
</Box>
```

### Pattern 3: Status Dashboard
```jsx
<Grid container spacing={3}>
  <Grid item xs={12} md={4}>
    <Card>
      <CardContent>
        <AnimatedCounter value={total} />
        <AnimatedProgressBar value={completed} total={total} />
      </CardContent>
    </Card>
  </Grid>
  {/* More cards... */}
</Grid>
```

---

## Testing Your Animations

### 1. Check in Browser
```bash
npm start
# Navigate to your page
# Watch animations play on load
```

### 2. Test Different Values
```jsx
// Test with 0
<AnimatedCounter value={0} />

// Test with large numbers
<AnimatedCounter value={9999999} />

// Test with decimals
<AnimatedCounter value={85.5} decimals={1} />
```

### 3. Test Responsiveness
```
Desktop: Works ✓
Tablet:  Works ✓
Mobile:  Works ✓
```

---

## Troubleshooting

### Animation doesn't play?
```jsx
// ❌ Wrong (string)
<AnimatedCounter value="150000" />

// ✅ Correct (number)
<AnimatedCounter value={150000} />
```

### Progress bar shows wrong percentage?
```jsx
// Make sure total > 0
<AnimatedProgressBar
  value={50}
  total={100}  // Must be > 0
/>
```

### Currency not formatting?
```jsx
// Make sure to pass the function
<AnimatedCounter
  value={150000}
  formatCurrency={formatCurrency}  // Don't forget this!
/>
```

---

## Next Steps

1. ✅ Try the examples above
2. 📖 Read full docs: `ANIMATED_PAYMENT_BALANCE_FEATURES.md`
3. 🎮 Test in demo page: `AnimationDemoPage.jsx`
4. 🎨 Customize for your needs
5. 🚀 Deploy to production

---

## Need Help?

- 📚 Full Documentation: `docs/ANIMATED_PAYMENT_BALANCE_FEATURES.md`
- 🎨 Visual Guide: `docs/ANIMATION_VISUAL_GUIDE.md`
- 🎮 Demo Page: `frontend/src/pages/AnimationDemoPage.jsx`
- 💻 Source Code: `frontend/src/components/common/`

---

## Quick Reference

```jsx
// Counter
<AnimatedCounter value={123} />

// Counter with currency
<AnimatedCounter value={123} formatCurrency={formatCurrency} />

// Counter with percentage
<AnimatedCounter value={85.5} suffix="%" decimals={1} />

// Progress bar
<AnimatedProgressBar value={50} total={100} />

// Progress with currency
<AnimatedProgressBar 
  value={50000} 
  total={100000} 
  showAmount={true}
  formatCurrency={formatCurrency}
/>

// Detailed progress card
<AnimatedProgressBar 
  value={75000} 
  total={100000}
  variant="detailed"
  showAmount={true}
  formatCurrency={formatCurrency}
/>
```

---

**That's it! You're ready to add beautiful animations to your app! 🎉**

---

**Last Updated**: January 2026
**Version**: 1.0.0

