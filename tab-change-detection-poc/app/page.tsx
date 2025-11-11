'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  Pause as PauseIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

export default function TabDetector() {
  const [visibilityState, setVisibilityState] = useState<string>('loading...');
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [focusEvents, setFocusEvents] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    lastEventTime: 0,
    eventCount: 0
  });
  
  const eventCountRef = useRef(0);
  const lastVisibilityChangeRef = useRef<number>(Date.now());

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      const state = document.visibilityState;
      const timestamp = Date.now();
      const timeSinceLastChange = timestamp - lastVisibilityChangeRef.current;
      
      setVisibilityState(state);
      eventCountRef.current += 1;
      
      // Count tab switches (only when coming from hidden state)
      if (state === 'visible') {
        setTabSwitchCount(prev => prev + 1);
        setFocusEvents(prev => [
          `🔄 Tab became visible at ${new Date().toLocaleTimeString()} (after ${timeSinceLastChange}ms)`,
          ...prev.slice(0, 9) // Keep last 10 events
        ]);
      } else {
        setFocusEvents(prev => [
          `⚫ Tab became hidden at ${new Date().toLocaleTimeString()}`,
          ...prev.slice(0, 9)
        ]);
      }

      lastVisibilityChangeRef.current = timestamp;
      
      setPerformanceMetrics({
        lastEventTime: timestamp,
        eventCount: eventCountRef.current
      });

      // Log to console for debugging
      console.log(`Visibility changed: ${state}`, {
        timestamp,
        timeSinceLastChange,
        totalEvents: eventCountRef.current
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set initial state
    setVisibilityState(document.visibilityState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Window focus/blur events
  useEffect(() => {
    const handleFocus = () => {
      const timestamp = Date.now();
      eventCountRef.current += 1;
      
      setFocusEvents(prev => [
        `🎯 Window focused at ${new Date().toLocaleTimeString()}`,
        ...prev.slice(0, 9)
      ]);

      setPerformanceMetrics(prev => ({
        ...prev,
        lastEventTime: timestamp,
        eventCount: eventCountRef.current
      }));

      console.log('Window focused', { timestamp });
    };

    const handleBlur = () => {
      const timestamp = Date.now();
      eventCountRef.current += 1;
      
      setFocusEvents(prev => [
        `⏸️ Window blurred at ${new Date().toLocaleTimeString()}`,
        ...prev.slice(0, 9)
      ]);

      setPerformanceMetrics(prev => ({
        ...prev,
        lastEventTime: timestamp,
        eventCount: eventCountRef.current
      }));

      console.log('Window blurred', { timestamp });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Monitor potential performance impact
      if (performanceMetrics.eventCount > 100) {
        console.warn('High event count detected:', performanceMetrics.eventCount);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [performanceMetrics.eventCount]);

  const getStatusColor = () => {
    switch (visibilityState) {
      case 'visible': return 'success';
      case 'hidden': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (visibilityState) {
      case 'visible': return <VisibilityIcon />;
      case 'hidden': return <VisibilityOffIcon />;
      default: return <RefreshIcon />;
    }
  };

  const getStatusText = () => {
    switch (visibilityState) {
      case 'visible': return 'Tab Visible';
      case 'hidden': return 'Tab Hidden';
      default: return 'Loading...';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="grey.900" gutterBottom>
          Browser Tab/Window Detection POC
        </Typography>
        <Typography variant="body1" color="grey.600" sx={{ mb: 4 }}>
          Testing Page Visibility API and focus detection capabilities
        </Typography>

        {/* Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h3" color="grey.700" gutterBottom>
                  Current Status
                </Typography>
                <Chip
                  icon={getStatusIcon()}
                  label={getStatusText()}
                  color={getStatusColor()}
                  variant="filled"
                  sx={{ 
                    fontSize: '0.9rem',
                    py: 1,
                    '& .MuiChip-icon': { fontSize: '1.2rem' }
                  }}
                />
                <Typography variant="body2" color="grey.500" sx={{ mt: 1 }}>
                  Raw state: {visibilityState}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h3" color="grey.700" gutterBottom>
                  Tab Switches
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RefreshIcon color="primary" />
                  <Typography variant="h4" component="div" color="primary.main" fontWeight="bold">
                    {tabSwitchCount}
                  </Typography>
                </Box>
                <Typography variant="body2" color="grey.500" sx={{ mt: 1 }}>
                  Times tab became visible
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" component="h3" color="grey.700" gutterBottom>
                  Performance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="action" />
                  <Typography variant="h6" component="div" color="grey.700">
                    {performanceMetrics.eventCount} events
                  </Typography>
                </Box>
                <Typography variant="body2" color="grey.500" sx={{ mt: 1 }}>
                  Last: {new Date(performanceMetrics.lastEventTime).toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Real-time Events */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h3" color="grey.700" gutterBottom>
              Real-time Event Log
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                maxHeight: 300, 
                overflow: 'auto',
                bgcolor: 'grey.50'
              }}
            >
              {focusEvents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PauseIcon sx={{ color: 'grey.400', fontSize: 40, mb: 1 }} />
                  <Typography variant="body2" color="grey.500">
                    Switch tabs or windows to see events...
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {focusEvents.map((event, index) => (
                    <ListItem key={index} divider={index < focusEvents.length - 1}>
                      <ListItemText 
                        primary={event}
                        primaryTypographyProps={{
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </CardContent>
        </Card>
        {/* API Information */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="grey.600">
              <strong>APIs used:</strong> document.visibilityState, visibilitychange, 
              window.focus, window.blur
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}