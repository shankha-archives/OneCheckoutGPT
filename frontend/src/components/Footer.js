import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => (
  <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 2, mt: 4, textAlign: 'center' }}>
    <Typography variant="body2">
      &copy; {new Date().getFullYear()} OneCheckout. All rights reserved.
    </Typography>
  </Box>
);

export default Footer;