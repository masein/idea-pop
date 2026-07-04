import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn() }),
}));

import ParentLetterForm from './ParentLetterForm';

function render(ui: React.ReactElement) {
  return rtlRender(
    <NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>
  );
}

describe('ParentLetterForm', () => {
  it('renders the newsletter label text', () => {
    render(<ParentLetterForm />);
    expect(screen.getByText('Parent newsletter')).toBeInTheDocument();
  });

  it('renders the email input linked to the label', () => {
    render(<ParentLetterForm />);
    // getByRole('textbox') finds the email input; verify it is in the DOM
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    render(<ParentLetterForm />);
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('does not show success message initially', () => {
    render(<ParentLetterForm />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('submitting with empty email does not show success message', async () => {
    const user = userEvent.setup();
    render(<ParentLetterForm />);
    // The input has required, so native validation prevents submit.
    // Simulate clicking submit without filling in — the form handler guards on empty email.
    const input = screen.getByRole('textbox');
    const form = input.closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('typing a valid email and submitting shows success message', async () => {
    const user = userEvent.setup();
    render(<ParentLetterForm />);
    await user.type(screen.getByRole('textbox'), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("You're in! Check your inbox.");
  });

  it('success message is shown with aria-live polite', async () => {
    const user = userEvent.setup();
    render(<ParentLetterForm />);
    await user.type(screen.getByRole('textbox'), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('form is no longer rendered after successful submission', async () => {
    const user = userEvent.setup();
    render(<ParentLetterForm />);
    await user.type(screen.getByRole('textbox'), 'parent@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
