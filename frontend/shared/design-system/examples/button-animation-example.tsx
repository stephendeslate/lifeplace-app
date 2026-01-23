// Button, AnimatedElement, and IconButton Usage Examples
// Comprehensive demonstration of all new components

import React from 'react';
import { Box, Stack, Typography, Container } from '@mui/material';
import {
  Button,
  AnimatedElement,
  IconButton,
  FadeIn,
  SlideUp,
  ZoomIn,
  BounceIn,
  Reveal,
  BlurIn,
} from '../index';

// Example icons (replace with actual icons from @mui/icons-material)
const EditIcon = () => <span>✏️</span>;
const DeleteIcon = () => <span>🗑️</span>;
const AddIcon = () => <span>➕</span>;
const FavoriteIcon = () => <span>❤️</span>;

export const ButtonExamples: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" gutterBottom>
        Button Component Examples
      </Typography>

      {/* Button Variants */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Button Variants
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <Button variant="primary">Primary Sage</Button>
          <Button variant="secondary">Secondary Sage</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="terracotta">Terracotta</Button>
          <Button variant="gold">Gold</Button>
        </Stack>
      </Box>

      {/* Button Sizes */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Button Sizes
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="primary" size="small">
            Small
          </Button>
          <Button variant="primary" size="medium">
            Medium
          </Button>
          <Button variant="primary" size="large">
            Large
          </Button>
        </Stack>
      </Box>

      {/* Button with Icons */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Buttons with Icons
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <Button variant="primary" startIcon={<AddIcon />}>
            Add Item
          </Button>
          <Button variant="secondary" endIcon={<EditIcon />}>
            Edit
          </Button>
          <Button variant="terracotta" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Loading States */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Loading States
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <Button variant="primary" loading>
            Loading...
          </Button>
          <Button variant="secondary" loading>
            Processing
          </Button>
          <Button variant="terracotta" loading size="small">
            Small Loading
          </Button>
        </Stack>
      </Box>

      {/* Disabled States */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Disabled States
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <Button variant="primary" disabled>
            Disabled Primary
          </Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
          <Button variant="outline" disabled>
            Disabled Outline
          </Button>
        </Stack>
      </Box>

      {/* Full Width */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Full Width Button
        </Typography>
        <Button variant="primary" fullWidth>
          Full Width Button
        </Button>
      </Box>
    </Container>
  );
};

export const IconButtonExamples: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" gutterBottom>
        IconButton Component Examples
      </Typography>

      {/* IconButton Variants */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          IconButton Variants
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <IconButton icon={<EditIcon />} ariaLabel="Edit" variant="default" />
          <IconButton icon={<FavoriteIcon />} ariaLabel="Favorite" variant="sage" />
          <IconButton icon={<DeleteIcon />} ariaLabel="Delete" variant="terracotta" />
          <IconButton icon={<AddIcon />} ariaLabel="Add" variant="gold" />
          <IconButton icon={<EditIcon />} ariaLabel="Success" variant="success" />
          <IconButton icon={<EditIcon />} ariaLabel="Warning" variant="warning" />
          <IconButton icon={<DeleteIcon />} ariaLabel="Error" variant="error" />
        </Stack>
      </Box>

      {/* IconButton Sizes */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          IconButton Sizes
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton icon={<EditIcon />} ariaLabel="Small edit" size="small" variant="sage" />
          <IconButton icon={<EditIcon />} ariaLabel="Medium edit" size="medium" variant="sage" />
          <IconButton icon={<EditIcon />} ariaLabel="Large edit" size="large" variant="sage" />
        </Stack>
      </Box>

      {/* Disabled IconButtons */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Disabled IconButtons
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
          <IconButton icon={<EditIcon />} ariaLabel="Disabled edit" variant="sage" disabled />
          <IconButton icon={<DeleteIcon />} ariaLabel="Disabled delete" variant="terracotta" disabled />
        </Stack>
      </Box>
    </Container>
  );
};

export const AnimatedElementExamples: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" gutterBottom>
        AnimatedElement Component Examples
      </Typography>

      <Typography variant="body1" paragraph>
        Scroll down to see the animations trigger
      </Typography>

      {/* Fade In */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <FadeIn duration={600} delay={0}>
          <Box sx={{ p: 4, bgcolor: 'primary.light', borderRadius: 2 }}>
            <Typography variant="h5">Fade In Animation</Typography>
            <Typography>This element fades in when it comes into view</Typography>
          </Box>
        </FadeIn>
      </Box>

      {/* Slide Up */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <SlideUp duration={600} delay={100}>
          <Box sx={{ p: 4, bgcolor: 'secondary.light', borderRadius: 2 }}>
            <Typography variant="h5">Slide Up Animation</Typography>
            <Typography>This element slides up from below</Typography>
          </Box>
        </SlideUp>
      </Box>

      {/* Zoom In */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <ZoomIn duration={600} delay={200}>
          <Box sx={{ p: 4, bgcolor: 'success.light', borderRadius: 2 }}>
            <Typography variant="h5">Zoom In Animation</Typography>
            <Typography>This element zooms in from small to normal size</Typography>
          </Box>
        </ZoomIn>
      </Box>

      {/* Bounce In */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <BounceIn duration={800} delay={0}>
          <Box sx={{ p: 4, bgcolor: 'warning.light', borderRadius: 2 }}>
            <Typography variant="h5">Bounce In Animation</Typography>
            <Typography>This element bounces into view with a playful effect</Typography>
          </Box>
        </BounceIn>
      </Box>

      {/* Reveal */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <Reveal duration={1000} delay={100}>
          <Box sx={{ p: 4, bgcolor: 'info.light', borderRadius: 2 }}>
            <Typography variant="h5">Reveal Animation</Typography>
            <Typography>This element reveals from left to right</Typography>
          </Box>
        </Reveal>
      </Box>

      {/* Blur In */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <BlurIn duration={800} delay={0}>
          <Box sx={{ p: 4, bgcolor: 'error.light', borderRadius: 2 }}>
            <Typography variant="h5">Blur In Animation</Typography>
            <Typography>This element transitions from blurry to sharp</Typography>
          </Box>
        </BlurIn>
      </Box>

      {/* Custom Animation with all animations */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <Typography variant="h5" gutterBottom>
          All Animation Types
        </Typography>
        <Stack spacing={3}>
          <AnimatedElement animation="fadeIn" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>fadeIn</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideUp" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideUp</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideDown" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideDown</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideLeft" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideLeft</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideRight" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideRight</Box>
          </AnimatedElement>

          <AnimatedElement animation="scaleUp" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>scaleUp</Box>
          </AnimatedElement>

          <AnimatedElement animation="scaleDown" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>scaleDown</Box>
          </AnimatedElement>

          <AnimatedElement animation="zoomIn" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>zoomIn</Box>
          </AnimatedElement>

          <AnimatedElement animation="zoomOut" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>zoomOut</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideUpFade" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideUpFade</Box>
          </AnimatedElement>

          <AnimatedElement animation="slideDownFade" duration={500}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>slideDownFade</Box>
          </AnimatedElement>

          <AnimatedElement animation="reveal" duration={800}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>reveal</Box>
          </AnimatedElement>

          <AnimatedElement animation="blur" duration={800}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>blur</Box>
          </AnimatedElement>

          <AnimatedElement animation="bounceIn" duration={800}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>bounceIn</Box>
          </AnimatedElement>
        </Stack>
      </Box>

      {/* Looping Animations */}
      <Box sx={{ mb: 6, minHeight: '200px' }}>
        <Typography variant="h5" gutterBottom>
          Looping Animations
        </Typography>
        <Stack direction="row" spacing={4}>
          <AnimatedElement animation="float" triggerOnce={false}>
            <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
              Float
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="sway" triggerOnce={false}>
            <Box sx={{ p: 3, bgcolor: 'secondary.main', color: 'white', borderRadius: 2 }}>
              Sway
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="pulse" triggerOnce={false}>
            <Box sx={{ p: 3, bgcolor: 'success.main', color: 'white', borderRadius: 2 }}>
              Pulse
            </Box>
          </AnimatedElement>
        </Stack>
      </Box>
    </Container>
  );
};

export const CombinedExample: React.FC = () => {
  const handleButtonClick = () => {
    console.log('Button clicked!');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h3" gutterBottom>
        Combined Component Example
      </Typography>

      <AnimatedElement animation="slideUpFade" duration={800}>
        <Box
          sx={{
            p: 6,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 3,
          }}
        >
          <FadeIn delay={300}>
            <Typography variant="h4" gutterBottom>
              Modern Call-to-Action Section
            </Typography>
          </FadeIn>

          <SlideUp delay={500}>
            <Typography variant="body1" paragraph>
              Experience the power of our new design system with beautiful animations,
              accessible buttons, and modern aesthetics.
            </Typography>
          </SlideUp>

          <ZoomIn delay={700}>
            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button variant="primary" size="large" onClick={handleButtonClick}>
                Get Started
              </Button>
              <Button variant="outline" size="large">
                Learn More
              </Button>
              <IconButton
                icon={<FavoriteIcon />}
                ariaLabel="Add to favorites"
                variant="sage"
                size="large"
              />
            </Stack>
          </ZoomIn>
        </Box>
      </AnimatedElement>
    </Container>
  );
};

// Main demo component
export const DesignSystemDemo: React.FC = () => {
  return (
    <Box>
      <ButtonExamples />
      <IconButtonExamples />
      <AnimatedElementExamples />
      <CombinedExample />
    </Box>
  );
};

export default DesignSystemDemo;
