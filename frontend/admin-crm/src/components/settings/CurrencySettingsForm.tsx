// Currency Settings Form Component
// Following the pattern from PaymentGatewayFormDialog.tsx

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  Chip,
  OutlinedInput,
  Divider,
  Card,
  CardContent,
  Button,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useForm, Controller } from 'react-hook-form';
import { Save as SaveIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { useSupportedCurrencies } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import type { CurrencySettings, CurrencySettingsFormData } from '../../types/currency.types';

interface CurrencySettingsFormProps {
  settings: CurrencySettings;
  onSubmit: (data: CurrencySettingsFormData) => void;
  loading?: boolean;
}

export const CurrencySettingsForm: React.FC<CurrencySettingsFormProps> = ({
  settings,
  onSubmit,
  loading = false,
}) => {
  const { data: supportedCurrencies = [] } = useSupportedCurrencies();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CurrencySettingsFormData>({
    defaultValues: {
      defaultCurrency: settings.defaultCurrency,
      enabledCurrencies: settings.enabledCurrencies,
      displayFormat: settings.displayFormat,
      decimalPlaces: settings.decimalPlaces.toString(),
      thousandsSeparator: settings.thousandsSeparator,
      decimalSeparator: settings.decimalSeparator,
      autoFormat: settings.autoFormat,
      compactFormat: settings.compactFormat,
    },
  });

  const watchedValues = watch();
  const previewAmount = 1234567.89;

  // Ensure default currency is in enabled currencies
  const handleDefaultCurrencyChange = (event: SelectChangeEvent<string>) => {
    const newDefaultCurrency = event.target.value;
    setValue('defaultCurrency', newDefaultCurrency);
    
    const currentEnabled = watchedValues.enabledCurrencies;
    if (!currentEnabled.includes(newDefaultCurrency)) {
      setValue('enabledCurrencies', [...currentEnabled, newDefaultCurrency]);
    }
  };

  const handleEnabledCurrenciesChange = (event: SelectChangeEvent<string[]>) => {
    const newEnabledCurrencies = event.target.value as string[];
    setValue('enabledCurrencies', newEnabledCurrencies);
    
    // If default currency is not in enabled currencies, don't change it
    // The form validation will catch this
  };

  const onFormSubmit = (data: CurrencySettingsFormData) => {
    onSubmit(data);
  };

  // Get preview formatted amount
  const getPreviewAmount = () => {
    try {
      return formatCurrency(previewAmount, watchedValues.defaultCurrency, {
        showSymbol: watchedValues.displayFormat !== 'code',
        showCode: watchedValues.displayFormat !== 'symbol',
        minimumFractionDigits: parseInt(watchedValues.decimalPlaces, 10) || 0,
        maximumFractionDigits: parseInt(watchedValues.decimalPlaces, 10) || 0,
      });
    } catch {
      return 'Preview unavailable';
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Primary Currency Settings */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Primary Currency
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="defaultCurrency"
              control={control}
              rules={{ required: 'Default currency is required' }}
              render={({ field }) => (
                <FormControl sx={{ minWidth: 200 }} error={!!errors.defaultCurrency}>
                  <InputLabel>Default Currency</InputLabel>
                  <Select
                    {...field}
                    label="Default Currency"
                    onChange={handleDefaultCurrencyChange}
                  >
                    {supportedCurrencies.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="enabledCurrencies"
              control={control}
              rules={{
                required: 'At least one currency must be enabled',
                validate: (value) =>
                  value.includes(watchedValues.defaultCurrency) ||
                  'Default currency must be in enabled currencies',
              }}
              render={({ field }) => (
                <FormControl sx={{ minWidth: 300 }} error={!!errors.enabledCurrencies}>
                  <InputLabel>Enabled Currencies</InputLabel>
                  <Select
                    {...field}
                    multiple
                    label="Enabled Currencies"
                    onChange={handleEnabledCurrenciesChange}
                    input={<OutlinedInput label="Enabled Currencies" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((code) => {
                          const currency = supportedCurrencies.find(c => c.code === code);
                          return (
                            <Chip 
                              key={code} 
                              label={`${currency?.symbol || ''} ${code}`} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {supportedCurrencies.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>
          {(errors.defaultCurrency || errors.enabledCurrencies) && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errors.defaultCurrency?.message || errors.enabledCurrencies?.message}
            </Alert>
          )}
        </Box>

        <Divider />

        {/* Display Format Settings */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Display Format
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Controller
              name="displayFormat"
              control={control}
              render={({ field }) => (
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Format</InputLabel>
                  <Select {...field} label="Format">
                    <MenuItem value="symbol">Symbol Only (₱)</MenuItem>
                    <MenuItem value="code">Code Only (PHP)</MenuItem>
                    <MenuItem value="both">Both (₱ PHP)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="decimalPlaces"
              control={control}
              rules={{
                required: 'Decimal places is required',
                min: { value: 0, message: 'Must be 0 or greater' },
                max: { value: 4, message: 'Must be 4 or less' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Decimal Places"
                  type="number"
                  inputProps={{ min: 0, max: 4 }}
                  sx={{ width: 150 }}
                  error={!!errors.decimalPlaces}
                  helperText={errors.decimalPlaces?.message}
                />
              )}
            />

            <Controller
              name="thousandsSeparator"
              control={control}
              render={({ field }) => (
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Thousands Separator</InputLabel>
                  <Select {...field} label="Thousands Separator">
                    <MenuItem value=",">Comma (1,234)</MenuItem>
                    <MenuItem value=".">Period (1.234)</MenuItem>
                    <MenuItem value=" ">Space (1 234)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="decimalSeparator"
              control={control}
              render={({ field }) => (
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Decimal Separator</InputLabel>
                  <Select {...field} label="Decimal Separator">
                    <MenuItem value=".">Period (1.23)</MenuItem>
                    <MenuItem value=",">Comma (1,23)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        </Box>

        <Divider />

        {/* Behavior Settings */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Behavior
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Controller
              name="autoFormat"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Automatically format currency inputs"
                />
              )}
            />
            <Controller
              name="compactFormat"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Use compact format for large amounts (1K, 1M)"
                />
              )}
            />
          </Box>
        </Box>

        {/* Preview */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PreviewIcon color="primary" />
              <Box>
                <Typography variant="subtitle2">Preview</Typography>
                <Typography variant="h6" color="primary">
                  {getPreviewAmount()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sample amount: {previewAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Philippine Business Context Alert */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Philippine Business Context:</strong> Most Philippine businesses don't use decimal places 
            for peso amounts (e.g., ₱1,500 instead of ₱1,500.00). The default setting of 0 decimal places 
            is optimized for local business practices.
          </Typography>
        </Alert>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isDirty}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              },
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </form>
  );
};