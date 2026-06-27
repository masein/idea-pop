import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

const mockReplace = vi.fn();

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  usePathname: () => '/some-page',
  useRouter: () => ({ replace: mockReplace }),
}));

import LocaleSwitcher from './LocaleSwitcher';

function render(locale: 'en' | 'fa') {
  return rtlRender(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>
  );
}

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders EN button', () => {
    render('en');
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('renders فا button', () => {
    render('en');
    expect(screen.getByRole('button', { name: 'فا' })).toBeInTheDocument();
  });

  it('EN button is pressed when locale is en', () => {
    render('en');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('فا button is not pressed when locale is en', () => {
    render('en');
    expect(screen.getByRole('button', { name: 'فا' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('فا button is pressed when locale is fa', () => {
    render('fa');
    expect(screen.getByRole('button', { name: 'فا' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking فا button calls router.replace', async () => {
    const user = userEvent.setup();
    render('en');
    await user.click(screen.getByRole('button', { name: 'فا' }));
    expect(mockReplace).toHaveBeenCalledWith('/some-page', { locale: 'fa' });
  });

  it('clicking EN button calls router.replace', async () => {
    const user = userEvent.setup();
    render('fa');
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(mockReplace).toHaveBeenCalledWith('/some-page', { locale: 'en' });
  });
});
