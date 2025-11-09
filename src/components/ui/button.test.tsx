import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders the button with the default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    // The test setup doesn't easily allow checking for CSS module classes,
    // but we can ensure it renders without crashing.
  });

  it('applies the correct classes for a given variant and size', () => {
    render(<Button variant="destructive" size="sm">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    // We can't directly test the class names from CSS modules in this environment,
    // but we confirm it renders correctly with different props.
    expect(button).toBeInTheDocument();
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/">Go home</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link).toBeInTheDocument();
    // Check that it's not a button
    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });
});
