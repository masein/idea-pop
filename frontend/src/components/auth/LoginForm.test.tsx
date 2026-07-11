import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

// ---------------------------------------------------------------------------
// Hoisted mock variables
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  reconcilePersona: vi.fn().mockReturnValue('parent'),
  dashboardHref: vi.fn().mockReturnValue('/dashboard/parent'),
  push: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/',
}));

vi.mock('@/lib/api/client', () => ({
  login: mocks.login,
}));

vi.mock('@/lib/auth/persona', () => ({
  reconcilePersona: mocks.reconcilePersona,
  dashboardHref: mocks.dashboardHref,
}));

// The Input component does not use forwardRef — mock it so react-hook-form's
// ref callback is properly attached to the underlying <input> element.
vi.mock('@/components/ui/Input', () => ({
  Input: React.forwardRef(function MockInput(
    {
      label,
      error,
      id,
      ...inputProps
    }: {
      label?: string;
      error?: string;
      id?: string;
      [key: string]: unknown;
    },
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const inputId =
      id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input id={inputId} ref={ref} {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)} />
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }),
  default: React.forwardRef(function MockInput(
    {
      label,
      error,
      id,
      ...inputProps
    }: {
      label?: string;
      error?: string;
      id?: string;
      [key: string]: unknown;
    },
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const inputId =
      id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input id={inputId} ref={ref} {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)} />
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }),
}));

// ---------------------------------------------------------------------------
// Import the component under test AFTER all vi.mock calls
// ---------------------------------------------------------------------------

import LoginForm from './LoginForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(ui: React.ReactElement) {
  return rtlRender(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
        mocks.dashboardHref.mockReturnValue('/dashboard/parent');
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows validation error for missing email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    // Submit without filling email — zod requires a valid email
    await user.type(screen.getByLabelText('Password'), 'somepassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });
  });

  it('calls login() with email and password on valid submit', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValueOnce({ account_id: 'a1', role: 'parent' });
        render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        'parent@example.com',
        'securepass1'
      );
    });
  });

  it('shows invalid-credentials error when login() throws "Login failed"', async () => {
    const user = userEvent.setup();
    mocks.login.mockRejectedValueOnce(new Error('Login failed'));
    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const serverAlert = alerts.find((el) =>
        el.textContent?.includes('Wrong email or password')
      );
      expect(serverAlert).toBeInTheDocument();
    });
  });

  it('routes by the ACCOUNT role, reconciling the persona cookie', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValueOnce({ account_id: 'a1', role: 'parent' });
    mocks.reconcilePersona.mockReturnValue('parent');
    mocks.dashboardHref.mockReturnValue('/dashboard/parent');
    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      // A stale kid-persona cookie must be overwritten by the real role.
      expect(mocks.reconcilePersona).toHaveBeenCalledWith('parent');
      expect(mocks.push).toHaveBeenCalledWith('/dashboard/parent');
    });
  });

  it('a teacher account lands on the teacher dashboard regardless of cookie', async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValueOnce({ account_id: 'a2', role: 'teacher' });
    mocks.reconcilePersona.mockReturnValue('teacher');
    mocks.dashboardHref.mockReturnValue('/dashboard/teacher');
    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 't@school.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(mocks.dashboardHref).toHaveBeenCalledWith('teacher');
      expect(mocks.push).toHaveBeenCalledWith('/dashboard/teacher');
    });
  });

  it('disables submit button while submitting (loading state)', async () => {
    const user = userEvent.setup();
    let resolveLogin!: () => void;
    mocks.login.mockReturnValueOnce(
      new Promise<void>((res) => {
        resolveLogin = res;
      })
    );
    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '…' })).toBeDisabled();
    });
    resolveLogin();
  });
});
