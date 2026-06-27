import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

// ---------------------------------------------------------------------------
// Hoisted mock variables — must use vi.hoisted so they're available inside
// the vi.mock factory closures (which are hoisted before import declarations).
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  setPersona: vi.fn(),
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
  register: mocks.register,
}));

vi.mock('@/lib/auth/persona', () => ({
  setPersona: mocks.setPersona,
  dashboardHref: mocks.dashboardHref,
}));

// The Input component does not use forwardRef so react-hook-form's ref
// callback is never attached to the underlying <input>. We mock it with a
// proper forwardRef wrapper that mirrors the original's label→id derivation.
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

import RegisterForm from './RegisterForm';

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

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dashboardHref.mockReturnValue('/dashboard/parent');
  });

  it('renders email, password, and confirm-password fields', () => {
    render(<RegisterForm role="parent" />);
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('shows validation error when email is invalid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });
  });

  it('shows validation error when password is too short (< 8 chars)', async () => {
    const user = userEvent.setup();
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 8 characters')
      ).toBeInTheDocument();
    });
  });

  it("shows validation error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'different99');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it('calls register() with correct args on valid submit', async () => {
    const user = userEvent.setup();
    mocks.register.mockResolvedValueOnce(undefined);
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith(
        'parent@example.com',
        'securepass1',
        'parent'
      );
    });
  });

  it('shows error banner when register() throws', async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValueOnce(new Error('Registration failed'));
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      // The server-error banner has role="alert" and contains the generic message
      const alerts = screen.getAllByRole('alert');
      const serverAlert = alerts.find((el) =>
        el.textContent?.includes('Something went wrong')
      );
      expect(serverAlert).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting (loading state)', async () => {
    const user = userEvent.setup();
    let resolveRegister!: () => void;
    mocks.register.mockReturnValueOnce(
      new Promise<void>((res) => {
        resolveRegister = res;
      })
    );
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      // While submitting, the button text changes to "…" and is disabled
      expect(screen.getByRole('button', { name: '…' })).toBeDisabled();
    });
    resolveRegister();
  });

  it('redirects to dashboard on success', async () => {
    const user = userEvent.setup();
    mocks.register.mockResolvedValueOnce(undefined);
    mocks.dashboardHref.mockReturnValue('/dashboard/parent');
    render(<RegisterForm role="parent" />);
    await user.type(screen.getByLabelText('Email'), 'parent@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepass1');
    await user.type(screen.getByLabelText('Confirm password'), 'securepass1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(mocks.setPersona).toHaveBeenCalledWith('parent');
      expect(mocks.push).toHaveBeenCalledWith('/dashboard/parent');
    });
  });
});
