// frontend/admin-crm/src/components/analytics/DateRangeFilter.tsx
import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  TextField,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { DateRange } from '../../types/analytics.types';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onChange: (dateRange: DateRange) => void;
  presets?: {
    last7Days: () => void;
    last30Days: () => void;
    last90Days: () => void;
    thisYear: () => void;
    lastYear?: () => void;
  };
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onChange,
  presets,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handlePresetClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePresetSelect = (preset: () => void) => {
    preset();
    handleClose();
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <TextField
        type="date"
        label="Start Date"
        size="small"
        value={dateRange.startDate}
        onChange={(e) => onChange({ ...dateRange, startDate: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: 160 }}
      />
      <TextField
        type="date"
        label="End Date"
        size="small"
        value={dateRange.endDate}
        onChange={(e) => onChange({ ...dateRange, endDate: e.target.value })}
        InputLabelProps={{ shrink: true }}
        sx={{ width: 160 }}
      />

      {presets && (
        <>
          <Tooltip title="Quick date presets">
            <IconButton onClick={handlePresetClick} size="small">
              <CalendarTodayIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handlePresetSelect(presets.last7Days)}>Last 7 Days</MenuItem>
            <MenuItem onClick={() => handlePresetSelect(presets.last30Days)}>Last 30 Days</MenuItem>
            <MenuItem onClick={() => handlePresetSelect(presets.last90Days)}>Last 90 Days</MenuItem>
            <MenuItem onClick={() => handlePresetSelect(presets.thisYear)}>This Year</MenuItem>
            {presets.lastYear && (
              <MenuItem onClick={() => presets.lastYear && handlePresetSelect(presets.lastYear)}>
                Last 12 Months
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      {presets && (
        <ButtonGroup size="small" variant="outlined" sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button onClick={presets.last7Days}>7D</Button>
          <Button onClick={presets.last30Days}>30D</Button>
          <Button onClick={presets.last90Days}>90D</Button>
          <Button onClick={presets.thisYear}>YTD</Button>
        </ButtonGroup>
      )}
    </Box>
  );
};

export default DateRangeFilter;
