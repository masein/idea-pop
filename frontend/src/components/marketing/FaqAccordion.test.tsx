import { render, screen } from '@testing-library/react';
import FaqAccordion from './FaqAccordion';

const faqItems = [
  { q: 'How is this different from YouTube?', a: 'Every video is one piece of a structured weekly challenge.' },
  { q: 'What age is Idea Pop for?', a: 'Ages 8 to 14.' },
  { q: 'Is it safe for kids?', a: 'Yes. No ads, no social feeds, no free chat.' },
];

describe('FaqAccordion', () => {
  it('renders all FAQ question texts', () => {
    render(<FaqAccordion items={faqItems} />);
    for (const item of faqItems) {
      expect(screen.getByText(item.q)).toBeInTheDocument();
    }
  });

  it('renders all FAQ answer texts in the DOM', () => {
    render(<FaqAccordion items={faqItems} />);
    for (const item of faqItems) {
      expect(screen.getByText(item.a)).toBeInTheDocument();
    }
  });

  it('renders the correct number of details elements', () => {
    render(<FaqAccordion items={faqItems} />);
    const details = document.querySelectorAll('details');
    expect(details.length).toBe(faqItems.length);
  });

  it('all details elements are closed by default (no open attribute)', () => {
    render(<FaqAccordion items={faqItems} />);
    const details = document.querySelectorAll('details');
    details.forEach((el) => {
      expect(el).not.toHaveAttribute('open');
    });
  });

  it('each question is rendered inside a summary element', () => {
    render(<FaqAccordion items={faqItems} />);
    const summaries = document.querySelectorAll('summary');
    expect(summaries.length).toBe(faqItems.length);
  });

  it('programmatically opening a details element exposes its answer', () => {
    render(<FaqAccordion items={faqItems} />);
    const firstSummary = screen.getByText(faqItems[0].q);
    const details = firstSummary.closest('details')!;
    // jsdom does not auto-toggle open on summary click; set it directly to test DOM structure
    details.setAttribute('open', '');
    expect(details).toHaveAttribute('open');
    expect(details.querySelector('p')!.textContent).toBe(faqItems[0].a);
  });
});
