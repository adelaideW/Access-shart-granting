/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.tsx';

function assertNoErrorBoundary() {
  expect(screen.queryByText(/Something went wrong/i)).toBeNull();
}

async function openBulkModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', {name: /Bulk add list/i}));
  const dialog = screen.getByRole('dialog', {name: /Bulk add individuals/i});
  expect(dialog).toBeInTheDocument();
  return dialog;
}

describe('Bulk add individuals flow', () => {
  it('1 smoke: textarea visible; Import disabled when empty', async () => {
    const user = userEvent.setup();
    render(<App />);
    assertNoErrorBoundary();
    const dialog = await openBulkModal(user);
    expect(within(dialog).getByPlaceholderText(/Paste details here/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', {name: 'Import'})).toBeDisabled();
  });

  it('2 imports two emails and pre-matches directory people', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));
    expect(within(dialog).getByDisplayValue('harry.porter@company.com')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('avery.lee@company.com')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Harry Porter')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Avery Lee')).toBeInTheDocument();
    assertNoErrorBoundary();
  });

  it('3 regression: matching the same person on two rows does not blank the page', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    await user.click(within(dialog).getByDisplayValue('Avery Lee'));
    await user.click(screen.getByRole('button', {name: /^Harry Porter$/}));

    expect(document.querySelectorAll('[data-bulk-warning="true"]').length).toBe(2);
    expect(within(dialog).getByRole('button', {name: /^Add$/})).toBeDisabled();
    expect(within(dialog).getByDisplayValue('harry.porter@company.com')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('avery.lee@company.com')).toBeInTheDocument();
    expect(await screen.findByText(/already matched with another address/i)).toBeInTheDocument();
    assertNoErrorBoundary();
  });

  it('4 resolving duplicate match re-enables footer Add', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    await user.click(within(dialog).getByDisplayValue('Avery Lee'));
    await user.click(screen.getByRole('button', {name: /^Harry Porter$/}));
    expect(within(dialog).getByRole('button', {name: /^Add$/})).toBeDisabled();

    const harryInputs = within(dialog).getAllByDisplayValue('Harry Porter');
    expect(harryInputs.length).toBeGreaterThanOrEqual(2);
    const row2People = harryInputs[1]!;
    await user.click(row2People);
    fireEvent.change(row2People, {target: {value: 'Noah'}});
    const noahOption = await screen.findByRole('button', {name: /^Noah Kim$/});
    await user.click(noahOption);

    expect(document.querySelectorAll('[data-bulk-warning="true"]').length).toBe(0);
    expect(within(dialog).getByRole('button', {name: /^Add$/})).toBeEnabled();
    assertNoErrorBoundary();
  });

  it('5 empty identifier disables footer Add', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    const idInput = within(dialog).getByDisplayValue('harry.porter@company.com');
    await user.clear(idInput);
    expect(within(dialog).getByRole('button', {name: /^Add$/})).toBeDisabled();
    assertNoErrorBoundary();
  });

  it('6 Add row five times after one import: six distinct rows, unique ids, one dropdown at a time', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('E1001');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));
    for (let i = 0; i < 5; i++) {
      await user.click(within(dialog).getByRole('button', {name: /Add row/i}));
    }
    expect(within(dialog).getAllByRole('button', {name: /Remove row/i})).toHaveLength(6);

    const table = within(dialog).getByRole('table');
    const tbodyRows = table.querySelectorAll('tbody tr');
    expect(tbodyRows.length).toBeGreaterThanOrEqual(6);
    const heading = within(dialog).getByRole('heading', {name: /Bulk add individuals/i});

    for (let r = 0; r < 6; r++) {
      const row = tbodyRows[r] as HTMLElement;
      const people = within(row).getAllByRole('textbox')[1]!;
      await user.click(people);
      await waitFor(() => expect(document.querySelectorAll('[data-bulk-menu]').length).toBe(1));
      fireEvent.mouseDown(heading);
      await waitFor(() => expect(document.querySelectorAll('[data-bulk-menu]').length).toBe(0));
    }

    assertNoErrorBoundary();
  });

  it('7 two rows as external user does not show duplicate warnings', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('unknown1@outside.com{Enter}unknown2@outside.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    const externalLabel = /Send to external user/i;
    const peopleInputs = within(dialog).getAllByPlaceholderText(externalLabel);
    expect(peopleInputs).toHaveLength(2);
    for (const input of peopleInputs) {
      await user.click(input);
      const externalButtons = screen.getAllByRole('button', {name: externalLabel});
      await user.click(externalButtons[0]!);
    }
    expect(document.querySelectorAll('[data-bulk-warning="true"]').length).toBe(0);
    assertNoErrorBoundary();
  });

  it('8 Upload CSV seeds four rows including unmatched external email', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    await user.click(within(dialog).getByRole('button', {name: /Upload CSV/i}));
    const table = within(dialog).getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(5);
    expect(within(dialog).getByDisplayValue('unknown.user@outside.com')).toBeInTheDocument();
    assertNoErrorBoundary();
  });

  it('9 clicking outside people selector closes dropdown', async () => {
    const user = userEvent.setup();
    const sendExternal = /Send to external user/i;
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));

    await user.click(within(dialog).getByDisplayValue('Harry Porter'));
    expect(screen.getByRole('button', {name: sendExternal})).toBeInTheDocument();

    fireEvent.mouseDown(within(dialog).getByRole('heading', {name: /Bulk add individuals/i}));
    await waitFor(() =>
      expect(screen.queryByRole('button', {name: sendExternal})).not.toBeInTheDocument(),
    );
    assertNoErrorBoundary();
  });

  it('10 footer Add merges chips and closes the dialog', async () => {
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openBulkModal(user);
    const paste = within(dialog).getByPlaceholderText(/Paste details here/i);
    await user.click(paste);
    await user.keyboard('harry.porter@company.com{Enter}avery.lee@company.com');
    await user.click(within(dialog).getByRole('button', {name: 'Import'}));
    const footerAdd = within(dialog).getByRole('button', {name: /^Add$/});
    await waitFor(() => expect(footerAdd).toBeEnabled());
    await user.click(footerAdd);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', {name: /Bulk add individuals/i})).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/people\/groups selected/i)).toBeInTheDocument();
    expect(screen.getAllByText('Harry Porter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Avery Lee').length).toBeGreaterThanOrEqual(1);
    const snackbar = document.querySelector('[data-snackbar-root]');
    expect(snackbar).toBeTruthy();
    expect(snackbar?.getAttribute('data-snackbar-tone')).toBe('success');
    assertNoErrorBoundary();
  });
});
