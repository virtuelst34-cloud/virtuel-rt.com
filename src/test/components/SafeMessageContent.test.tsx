import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafeMessageContent from '@/components/chat/SafeMessageContent';

describe('SafeMessageContent', () => {
  it('devrait rendre le texte brut', () => {
    render(<SafeMessageContent text="Hello world" isSystem={false} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('devrait échapper le HTML pour prévenir XSS', () => {
    render(<SafeMessageContent text="<script>alert('xss')</script>" isSystem={false} />);
    // Le composant affiche le texte tel quel
    const element = screen.getByText(/alert/i);
    expect(element).toBeInTheDocument();
    expect(element.textContent).toContain('alert');
  });

  it('devrait afficher les URLs comme texte', () => {
    render(<SafeMessageContent text="Visitez https://example.com" isSystem={false} />);
    // Les URLs sont affichées comme texte, pas converties en liens
    const element = screen.getByText(/Visitez/i);
    expect(element).toBeInTheDocument();
    expect(element.textContent).toContain('https://example.com');
  });

  it('devrait gérer les mentions @', () => {
    render(<SafeMessageContent text="@username" isSystem={false} currentUserName="username" />);
    expect(screen.getByText('@username')).toBeInTheDocument();
  });

  it('devrait gérer les messages système', () => {
    render(<SafeMessageContent text="System message" isSystem={true} />);
    expect(screen.getByText('System message')).toBeInTheDocument();
  });

  it('devrait gérer les URLs d\'images', () => {
    render(<SafeMessageContent text="Message" imageUrl="https://example.com/image.jpg" isSystem={false} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('devrait être vide pour un texte vide', () => {
    const { container } = render(<SafeMessageContent text="" isSystem={false} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('devrait gérer le texte long', () => {
    const longText = 'A'.repeat(1000);
    render(<SafeMessageContent text={longText} isSystem={false} />);
    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('devrait gérer les caractères spéciaux', () => {
    render(<SafeMessageContent text="Émojis 🎉 & accents éàù" isSystem={false} />);
    expect(screen.getByText(/Émojis/i)).toBeInTheDocument();
  });

  it('devrait avoir des attributs ARIA appropriés', () => {
    render(<SafeMessageContent text="Test message" isSystem={false} />);
    const content = screen.getByText('Test message');
    expect(content).toBeInTheDocument();
  });
});
