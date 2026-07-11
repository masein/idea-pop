import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import PenguinMascot from './PenguinMascot';
import en from '../../messages/en.json';

function renderMascot(props: React.ComponentProps<typeof PenguinMascot> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PenguinMascot {...props} />
    </NextIntlClientProvider>,
  );
}

describe('PenguinMascot', () => {
  it('renders with default label', () => {
    renderMascot();
    expect(screen.getByRole('button', { name: 'Ask Me' })).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    renderMascot({ label: 'Help' });
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderMascot({ onClick });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the label text visibly inside the button', () => {
    renderMascot({ label: 'Ask Me' });
    const btn = screen.getByRole('button', { name: 'Ask Me' });
    expect(btn).toHaveTextContent('Ask Me');
  });
});
