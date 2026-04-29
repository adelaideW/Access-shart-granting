/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.tsx';
import { SnackbarToneIcon } from '../components/SnackbarToneIcon.tsx';
import { inferToastTone } from '../lib/snackbarTone.ts';

function assertNoErrorBoundary() {
  expect(screen.queryByText(/Something went wrong/i)).toBeNull();
}

describe('inferToastTone', () => {
  it('classifies error, warning, success, and info messages', () => {
    expect(inferToastTone('Could not copy link')).toBe('error');
    expect(inferToastTone('is already matched with another address')).toBe('warning');
    expect(inferToastTone('2 people/groups selected')).toBe('success');
    expect(inferToastTone('Next step')).toBe('info');
  });
});

describe('SnackbarToneIcon', () => {
  it('renders all four tones (guards missing lucide imports)', () => {
    const {container} = render(
      <>
        {(['success', 'warning', 'error', 'info'] as const).map((tone) => (
          <div key={tone}>
            <SnackbarToneIcon tone={tone} className="w-4 h-4" />
          </div>
        ))}
      </>,
    );
    expect(container.querySelectorAll('svg').length).toBe(4);
  });
});

describe('Snackbar integration (App)', () => {
  it('shows error tone from Copy link without crashing the tree', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', {...navigator, clipboard: {writeText}});

    render(<App />);
    assertNoErrorBoundary();

    await user.click(screen.getByRole('button', {name: /Copy link/i}));
    expect(await screen.findByText(/Could not copy link/i)).toBeInTheDocument();
    assertNoErrorBoundary();

    vi.unstubAllGlobals();
  });

  it('shows success tone after bulk Add commit without crashing', async () => {
    const user = userEvent.setup();
    render(<App />);
    assertNoErrorBoundary();

    await user.click(screen.getByRole('button', {name: /Bulk add list/i}));
    const dialog = screen.getByRole('dialog', {name: /Bulk add individuals/i});
    expect(dialog).toBeInTheDocument();

    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    const addFooter = within(dialog).getByRole('button', {name: /^Add$/});
    await waitFor(() => expect(addFooter).toBeEnabled());

    await user.click(addFooter);
    expect(await screen.findByText(/people\/groups selected/i)).toBeInTheDocument();
    assertNoErrorBoundary();
  });

  it('shows warning tone on duplicate bulk match without crashing (regression)', async () => {
    const user = userEvent.setup();
    render(<App />);
    assertNoErrorBoundary();

    await user.click(screen.getByRole('button', {name: /Bulk add list/i}));
    const dialog = screen.getByRole('dialog', {name: /Bulk add individuals/i});
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    await user.click(within(dialog).getByDisplayValue('Avery Lee'));
    await user.click(screen.getByRole('button', {name: /^Harry Porter$/}));

    expect(await screen.findByText(/already matched with another address/i)).toBeInTheDocument();
    assertNoErrorBoundary();
  });

  it('shows info tone for a generic toast without crashing (Vitest hook)', async () => {
    render(<App />);
    assertNoErrorBoundary();
    const w = window as Window & { __ACCESS_APP_TEST__?: { enqueueToast: (m: string) => void } };
    await waitFor(() => expect(w.__ACCESS_APP_TEST__).toBeDefined());
    w.__ACCESS_APP_TEST__!.enqueueToast('Illustrative note: this panel is a prototype');
    expect(await screen.findByText(/Illustrative note/i)).toBeInTheDocument();
    expect(inferToastTone('Illustrative note: this panel is a prototype')).toBe('info');
    assertNoErrorBoundary();
  });
});
