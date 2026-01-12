import { render, screen } from '@testing-library/react';
import App from './App';

test('renders System Biblioteki title', () => {
  render(<App />);
  const title = screen.getByText(/system biblioteki/i);
  expect(title).toBeInTheDocument();
});
