import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('renders with testid', () => {
    render(<Logo />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('shows wordmark when showWordmark is true', () => {
    render(<Logo showWordmark />);
    expect(screen.getByText(/IDEA POP/i)).toBeInTheDocument();
  });

  it('hides wordmark when showWordmark is false', () => {
    render(<Logo showWordmark={false} />);
    expect(screen.queryByText(/IDEA POP/i)).not.toBeInTheDocument();
  });

  it('shows wordmark by default', () => {
    render(<Logo />);
    expect(screen.getByText(/IDEA POP/i)).toBeInTheDocument();
  });
});
