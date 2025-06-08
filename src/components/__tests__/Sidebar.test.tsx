import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../Sidebar';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, className }: any) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Sidebar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation section with all items', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByText('My Files')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('Shared Links')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('New Upload')).toBeInTheDocument();
    expect(screen.getByText('New Folder')).toBeInTheDocument();
  });

  it('renders settings section', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active navigation item for exact match', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-accent', 'text-accent-foreground', 'font-medium');
  });

  it('highlights active navigation item for path prefix match', () => {
    mockUsePathname.mockReturnValue('/dashboard/files/123');
    render(<Sidebar />);
    
    const filesLink = screen.getByRole('link', { name: /my files/i });
    expect(filesLink).toHaveClass('bg-accent', 'text-accent-foreground', 'font-medium');
  });

  it('does not highlight dashboard for nested paths', () => {
    mockUsePathname.mockReturnValue('/dashboard/files');
    render(<Sidebar />);
    
    const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i });
    expect(dashboardLink).not.toHaveClass('bg-accent', 'text-accent-foreground', 'font-medium');
    expect(dashboardLink).toHaveClass('text-muted-foreground');
  });

  it('highlights settings when on settings page', () => {
    mockUsePathname.mockReturnValue('/dashboard/settings');
    render(<Sidebar />);
    
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toHaveClass('bg-accent', 'text-accent-foreground', 'font-medium');
  });

  it('renders all navigation links with correct hrefs', () => {
    render(<Sidebar />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /upload file/i })).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: /my files/i })).toHaveAttribute('href', '/dashboard/files');
    expect(screen.getByRole('link', { name: /folders/i })).toHaveAttribute('href', '/dashboard/folders');
    expect(screen.getByRole('link', { name: /shared links/i })).toHaveAttribute('href', '/dashboard/shared');
    expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/dashboard/analytics');
  });

  it('renders quick action links with correct hrefs', () => {
    render(<Sidebar />);
    
    expect(screen.getByRole('link', { name: /new upload/i })).toHaveAttribute('href', '/upload');
    expect(screen.getByRole('link', { name: /new folder/i })).toHaveAttribute('href', '/dashboard/folders/new');
  });

  it('renders settings link with correct href', () => {
    render(<Sidebar />);
    
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<Sidebar className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders all expected icons', () => {
    render(<Sidebar />);
    
    // Check that icons are rendered (they should have the lucide icon classes)
    const links = screen.getAllByRole('link');
    
    // Each navigation item should have an icon
    const navigationLinks = links.slice(0, 6); // 6 navigation items
    navigationLinks.forEach(link => {
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4');
    });
    
    // Quick action links should have icons
    const quickActionLinks = links.slice(6, 8); // 2 quick action items
    quickActionLinks.forEach(link => {
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4');
    });
    
    // Settings link should have an icon
    const settingsLink = links[8]; // Settings link
    const settingsIcon = settingsLink.querySelector('svg');
    expect(settingsIcon).toBeInTheDocument();
    expect(settingsIcon).toHaveClass('h-4', 'w-4');
  });

  it('applies hover classes correctly', () => {
    render(<Sidebar />);
    
    const uploadLink = screen.getByRole('link', { name: /upload file/i });
    expect(uploadLink).toHaveClass('hover:bg-accent');
  });

  it('maintains accessibility with proper heading structure', () => {
    render(<Sidebar />);
    
    const navigationHeading = screen.getByRole('heading', { name: /navigation/i });
    const quickActionsHeading = screen.getByRole('heading', { name: /quick actions/i });
    
    expect(navigationHeading).toBeInTheDocument();
    expect(quickActionsHeading).toBeInTheDocument();
  });
});
