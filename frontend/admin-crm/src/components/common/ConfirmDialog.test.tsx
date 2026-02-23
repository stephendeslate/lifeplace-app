import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfirmDialogProvider, useConfirmDialog, SimpleConfirmDialog } from './ConfirmDialog';

// Helper component to trigger confirm dialog via the hook
const TestComponent: React.FC<{
  onResult?: (result: boolean) => void;
  options?: {
    title?: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'delete';
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    autoFocus?: 'confirm' | 'cancel';
  };
}> = ({ onResult, options }) => {
  const { confirm, confirmDelete } = useConfirmDialog();

  const handleConfirm = async () => {
    const result = await confirm({
      message: options?.message || 'Are you sure?',
      title: options?.title,
      type: options?.type,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      showCancel: options?.showCancel,
      autoFocus: options?.autoFocus,
    });
    onResult?.(result);
  };

  const handleDelete = async () => {
    const result = await confirmDelete('Test Item');
    onResult?.(result);
  };

  const handleDeleteNoName = async () => {
    const result = await confirmDelete();
    onResult?.(result);
  };

  return (
    <div>
      <button onClick={handleConfirm}>Open Confirm</button>
      <button onClick={handleDelete}>Open Delete</button>
      <button onClick={handleDeleteNoName}>Open Delete No Name</button>
    </div>
  );
};

describe('ConfirmDialogProvider', () => {
  it('opens dialog when confirm is called', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });
  });

  it('returns true when confirmed', async () => {
    const onResult = vi.fn();

    render(
      <ConfirmDialogProvider>
        <TestComponent onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(true);
    });
  });

  it('returns false when cancelled', async () => {
    const onResult = vi.fn();

    render(
      <ConfirmDialogProvider>
        <TestComponent onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false);
    });
  });

  it('shows custom title and button text', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent
          options={{
            title: 'Custom Title',
            message: 'Custom message',
            confirmText: 'Yes, do it',
            cancelText: 'No, stop',
          }}
        />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(screen.getByText('Yes, do it')).toBeInTheDocument();
      expect(screen.getByText('No, stop')).toBeInTheDocument();
    });
  });

  it('shows delete warning alert for delete type', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent options={{ type: 'delete', message: 'Delete this?' }} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Delete this?')).toBeInTheDocument();
      expect(
        screen.getByText('This action is permanent and cannot be undone.'),
      ).toBeInTheDocument();
    });
  });

  it('confirmDelete shows delete dialog with item name', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Delete'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Are you sure you want to delete "Test Item"\? This action cannot be undone\./,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  it('confirmDelete shows generic message without item name', async () => {
    render(
      <ConfirmDialogProvider>
        <TestComponent />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByText('Open Delete No Name'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Are you sure you want to delete this item? This action cannot be undone.',
        ),
      ).toBeInTheDocument();
    });
  });
});

describe('useConfirmDialog outside provider', () => {
  it('throws when used outside ConfirmDialogProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      const BadComponent = () => {
        useConfirmDialog();
        return null;
      };
      render(<BadComponent />);
    }).toThrow('useConfirmDialog must be used within ConfirmDialogProvider');

    spy.mockRestore();
  });
});

describe('SimpleConfirmDialog', () => {
  it('renders when open', () => {
    render(
      <SimpleConfirmDialog
        open={true}
        message="Simple message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Simple message')).toBeInTheDocument();
    // Default title and confirmText are both "Confirm", so use role-based queries
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SimpleConfirmDialog
        open={false}
        message="Hidden message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();

    render(
      <SimpleConfirmDialog
        open={true}
        message="Confirm this"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();

    render(
      <SimpleConfirmDialog
        open={true}
        message="Cancel this"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows custom title and button text', () => {
    render(
      <SimpleConfirmDialog
        open={true}
        title="Custom Title"
        message="Custom message"
        confirmText="OK"
        cancelText="Nope"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });

  it('shows delete warning when type is delete', () => {
    render(
      <SimpleConfirmDialog
        open={true}
        message="Delete item?"
        type="delete"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });
});
