import { render, screen } from '@testing-library/react';
import Greeting from './Greeting';

describe('Greeting', () => {
  it('renders a greeting', () => {
    render(<Greeting name="World" />);
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });
});
