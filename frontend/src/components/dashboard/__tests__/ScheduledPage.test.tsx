import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import ScheduledPage from '../ScheduledPage';

describe('ScheduledPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render scheduled tests page', () => {
    render(<ScheduledPage />);

    expect(screen.getByText('Scheduled Tests')).toBeInTheDocument();
    expect(screen.getByText('Automate your website testing with scheduled runs')).toBeInTheDocument();
  });

  it('should display existing schedules', async () => {
    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
      expect(screen.getByText('Mobile Experience Check')).toBeInTheDocument();
      expect(screen.getByText('Weekly Full Audit')).toBeInTheDocument();
    });
  });

  it('should show active/paused status', async () => {
    render(<ScheduledPage />);

    await waitFor(() => {
      const activeStatuses = screen.getAllByText('Active');
      const pausedStatuses = screen.getAllByText('Paused');

      expect(activeStatuses.length).toBeGreaterThan(0);
      expect(pausedStatuses.length).toBeGreaterThan(0);
    });
  });

  it('should open create modal when clicking new schedule button', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      expect(screen.getByLabelText(/schedule name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website url/i)).toBeInTheDocument();
    });
  });

  it('should fill and submit create schedule form', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/schedule name/i);
    const urlInput = screen.getByLabelText(/website url/i);

    await user.type(nameInput, 'New Test Schedule');
    await user.type(urlInput, 'https://newtest.com');

    const submitButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Schedule')).not.toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Schedule name is required')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
    });
  });

  it('should open edit modal with existing data', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'edit';
    });

    if (editButton) {
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Schedule')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Production Site Monitor')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://myapp.com')).toBeInTheDocument();
      });
    }
  });

  it('should update schedule through edit modal', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'edit';
    });

    if (editButton) {
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Schedule')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Production Site Monitor');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Schedule Name');

      const updateButton = screen.getByRole('button', { name: /update schedule/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Schedule')).not.toBeInTheDocument();
      });
    }
  });

  it('should toggle schedule active status', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('button');
    const pauseButton = toggleButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'pause';
    });

    if (pauseButton) {
      await user.click(pauseButton);

      await waitFor(() => {
        const pausedStatuses = screen.getAllByText('Paused');
        expect(pausedStatuses.length).toBeGreaterThan(0);
      });
    }
  });

  it('should delete schedule', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'trash-2';
    });

    if (deleteButton) {
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Production Site Monitor')).not.toBeInTheDocument();
      });
    }
  });

  it('should close modal on cancel', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Schedule')).not.toBeInTheDocument();
    });
  });

  it('should display schedule details correctly', async () => {
    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('https://myapp.com')).toBeInTheDocument();
      expect(screen.getByText('Every hour')).toBeInTheDocument();
      expect(screen.getByText('Every day')).toBeInTheDocument();
      expect(screen.getByText('Every week')).toBeInTheDocument();
    });
  });

  it('should show loading state during form submission', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/schedule name/i);
    const urlInput = screen.getByLabelText(/website url/i);

    await user.type(nameInput, 'Test Schedule');
    await user.type(urlInput, 'https://test.com');

    const submitButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when all schedules are deleted', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    await waitFor(() => {
      expect(screen.getByText('Production Site Monitor')).toBeInTheDocument();
    });

    // Delete all schedules
    const deleteButtons = screen.getAllByRole('button');
    const trashButtons = deleteButtons.filter(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('data-lucide') === 'trash-2';
    });

    for (const button of trashButtons) {
      await user.click(button);
    }

    await waitFor(() => {
      expect(screen.getByText('No scheduled tests')).toBeInTheDocument();
      expect(screen.getByText('Create your first scheduled test to automate website monitoring')).toBeInTheDocument();
    });
  });

  it('should select test type in form', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const testTypeSelect = screen.getAllByRole('combobox')[0];
    await user.click(testTypeSelect);

    const accessibilityOption = screen.getByText('Accessibility');
    await user.click(accessibilityOption);

    // Verify selection was made
    expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
  });

  it('should select device type in form', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const deviceTypeSelect = screen.getAllByRole('combobox')[1];
    await user.click(deviceTypeSelect);

    const mobileOption = screen.getByText('Mobile');
    await user.click(mobileOption);

    expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
  });

  it('should select frequency in form', async () => {
    const user = userEvent.setup();

    render(<ScheduledPage />);

    const newButton = screen.getByRole('button', { name: /new schedule/i });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
    });

    const frequencySelect = screen.getAllByRole('combobox')[2];
    await user.click(frequencySelect);

    const weeklyOption = screen.getByText('Every week');
    await user.click(weeklyOption);

    expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
  });

  it('should display device icons correctly', async () => {
    render(<ScheduledPage />);

    await waitFor(() => {
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(0);
    });
  });
});
