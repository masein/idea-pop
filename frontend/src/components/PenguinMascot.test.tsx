import { render, screen, fireEvent } from '@testing-library/react';
import PenguinMascot from './PenguinMascot';

describe('PenguinMascot', () => {
  it('renders with default label', () => {
    render(<PenguinMascot />);
    expect(screen.getByRole('button', { name: 'Ask Me' })).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<PenguinMascot label="Help" />);
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PenguinMascot onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the label text visibly inside the button', () => {
    render(<PenguinMascot label="Ask Me" />);
    const btn = screen.getByRole('button', { name: 'Ask Me' });
    expect(btn).toHaveTextContent('Ask Me');
  });
});
