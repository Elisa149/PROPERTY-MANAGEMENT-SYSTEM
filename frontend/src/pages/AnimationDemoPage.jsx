import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  TrendingUp,
  MonetizationOn,
  Receipt,
} from '@mui/icons-material';

import AnimatedProgressBar from '../components/common/AnimatedProgressBar';
import AnimatedCounter from '../components/common/AnimatedCounter';

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

const AnimationDemoPage = () => {
  const [counterValue, setCounterValue] = useState(150000);
  const [progressValue, setProgressValue] = useState(75);
  const [progressTotal, setProgressTotal] = useState(100);
  const [variant, setVariant] = useState('default');
  const [color, setColor] = useState('auto');
  const [animationKey, setAnimationKey] = useState(0);

  const handleReplay = () => {
    setAnimationKey(prev => prev + 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          🎨 Animation Demo & Playground
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Test and preview all animated components with different configurations
        </Typography>
      </Box>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 600 }}>
          🎮 Control Panel
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
              Counter Value
            </Typography>
            <Slider
              value={counterValue}
              onChange={(e, v) => setCounterValue(v)}
              min={0}
              max={1000000}
              step={10000}
              sx={{ color: 'white' }}
            />
            <Typography variant="caption" sx={{ color: 'white' }}>
              {formatCurrency(counterValue)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
              Progress Value
            </Typography>
            <Slider
              value={progressValue}
              onChange={(e, v) => setProgressValue(v)}
              min={0}
              max={progressTotal}
              sx={{ color: 'white' }}
            />
            <Typography variant="caption" sx={{ color: 'white' }}>
              {progressValue} / {progressTotal}
            </Typography>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'white' }}>Variant</InputLabel>
              <Select
                value={variant}
                label="Variant"
                onChange={(e) => setVariant(e.target.value)}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="minimal">Minimal</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: 'white' }}>Color</InputLabel>
              <Select
                value={color}
                label="Color"
                onChange={(e) => setColor(e.target.value)}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
              >
                <MenuItem value="auto">Auto</MenuItem>
                <MenuItem value="primary">Primary</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleReplay}
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              Replay
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Demo Sections */}
      <Grid container spacing={3}>
        {/* Animated Counters Demo */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            💰 Animated Counters
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MonetizationOn sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Currency Counter</Typography>
              </Box>
              <AnimatedCounter
                key={`counter-currency-${animationKey}`}
                value={counterValue}
                formatCurrency={formatCurrency}
                variant="h3"
                color="success.main"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Animates from 0 to {formatCurrency(counterValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Number Counter</Typography>
              </Box>
              <AnimatedCounter
                key={`counter-number-${animationKey}`}
                value={Math.round(counterValue / 1000)}
                variant="h3"
                color="primary.main"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Simple number animation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Receipt sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Percentage Counter</Typography>
              </Box>
              <AnimatedCounter
                key={`counter-percent-${animationKey}`}
                value={(progressValue / progressTotal) * 100}
                suffix="%"
                decimals={1}
                variant="h3"
                color="info.main"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                With suffix and decimals
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Animated Progress Bars Demo */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            📊 Animated Progress Bars
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Default Variant
              </Typography>
              <AnimatedProgressBar
                key={`progress-default-${animationKey}`}
                value={progressValue}
                total={progressTotal}
                label="Collection Progress"
                showAmount={false}
                color={color}
                height={12}
                variant="default"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                With Currency Amounts
              </Typography>
              <AnimatedProgressBar
                key={`progress-currency-${animationKey}`}
                value={progressValue * 10000}
                total={progressTotal * 10000}
                label="Payment Collection"
                showAmount={true}
                formatCurrency={formatCurrency}
                color={color}
                height={12}
                variant="default"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Minimal Variant
              </Typography>
              <AnimatedProgressBar
                key={`progress-minimal-${animationKey}`}
                value={progressValue}
                total={progressTotal}
                color={color}
                height={16}
                variant="minimal"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Clean and simple design
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <AnimatedProgressBar
            key={`progress-detailed-${animationKey}`}
            value={progressValue * 10000}
            total={progressTotal * 10000}
            label="Detailed Progress Card"
            showAmount={true}
            formatCurrency={formatCurrency}
            color={color}
            height={16}
            variant="detailed"
          />
        </Grid>

        {/* Real-world Examples */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            🎯 Real-world Examples
          </Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MonetizationOn sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Total Collected
                </Typography>
              </Box>
              <AnimatedCounter
                key={`example-1-${animationKey}`}
                value={2500000}
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
                  key={`example-progress-1-${animationKey}`}
                  value={45}
                  total={50}
                  label="Payment Rate"
                  color="success"
                  height={8}
                  variant="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Receipt sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Invoice Payments
                </Typography>
              </Box>
              <AnimatedCounter
                key={`example-2-${animationKey}`}
                value={1800000}
                formatCurrency={formatCurrency}
                variant="h4"
                color="primary.main"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary">
                32 payments on invoices
              </Typography>
              <Box sx={{ mt: 2 }}>
                <AnimatedProgressBar
                  key={`example-progress-2-${animationKey}`}
                  value={32}
                  total={45}
                  label="Invoice Coverage"
                  color="primary"
                  height={8}
                  variant="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Collection Rate
                </Typography>
              </Box>
              <AnimatedCounter
                key={`example-3-${animationKey}`}
                value={87.5}
                suffix="%"
                decimals={1}
                variant="h4"
                color="info.main"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary">
                Of expected rent
              </Typography>
              <Box sx={{ mt: 2 }}>
                <AnimatedProgressBar
                  key={`example-progress-3-${animationKey}`}
                  value={87.5}
                  total={100}
                  label="Target Progress"
                  color="auto"
                  height={8}
                  variant="default"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Instructions */}
      <Paper sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          📖 How to Use
        </Typography>
        <Typography variant="body2" paragraph>
          1. Use the control panel above to adjust values and settings
        </Typography>
        <Typography variant="body2" paragraph>
          2. Click "Replay" to see the animations again with new values
        </Typography>
        <Typography variant="body2" paragraph>
          3. Try different variants and colors to see what works best for your use case
        </Typography>
        <Typography variant="body2">
          4. Check the documentation at <code>docs/ANIMATED_PAYMENT_BALANCE_FEATURES.md</code> for implementation details
        </Typography>
      </Paper>
    </Box>
  );
};

export default AnimationDemoPage;

