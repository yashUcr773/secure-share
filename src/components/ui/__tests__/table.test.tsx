import { render, screen } from '@testing-library/react'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption 
} from '../table'

const SimpleTable = () => (
  <Table>
    <TableCaption>A list of users</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>John Doe</TableCell>
        <TableCell>john@example.com</TableCell>
        <TableCell>Admin</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Jane Smith</TableCell>
        <TableCell>jane@example.com</TableCell>
        <TableCell>User</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell colSpan={3}>Total: 2 users</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
)

describe('Table', () => {
  describe('Basic Rendering', () => {
    it('renders table with all components', () => {
      render(<SimpleTable />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('A list of users')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Role')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Total: 2 users')).toBeInTheDocument()
    })

    it('renders table container with correct classes', () => {
      render(<SimpleTable />)
      
      const table = screen.getByRole('table')
      const container = table.parentElement
      
      expect(container).toHaveClass('relative', 'w-full', 'overflow-x-auto')
      expect(container).toHaveAttribute('data-slot', 'table-container')
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm')
      expect(table).toHaveAttribute('data-slot', 'table')
    })
  })

  describe('Table Components', () => {
    it('applies correct classes to table header', () => {
      render(<SimpleTable />)
      
      const header = screen.getByRole('table').querySelector('thead')
      expect(header).toHaveClass('[&_tr]:border-b')
      expect(header).toHaveAttribute('data-slot', 'table-header')
    })

    it('applies correct classes to table body', () => {
      render(<SimpleTable />)
      
      const body = screen.getByRole('table').querySelector('tbody')
      expect(body).toHaveClass('[&_tr:last-child]:border-0')
      expect(body).toHaveAttribute('data-slot', 'table-body')
    })

    it('applies correct classes to table footer', () => {
      render(<SimpleTable />)
      
      const footer = screen.getByRole('table').querySelector('tfoot')
      expect(footer).toHaveClass(
        'bg-muted/50',
        'border-t',
        'font-medium',
        '[&>tr]:last:border-b-0'
      )
      expect(footer).toHaveAttribute('data-slot', 'table-footer')
    })

    it('applies correct classes to table rows', () => {
      render(<SimpleTable />)
      
      const rows = screen.getByRole('table').querySelectorAll('tr')
      rows.forEach(row => {
        expect(row).toHaveClass(
          'hover:bg-muted/50',
          'data-[state=selected]:bg-muted',
          'border-b',
          'transition-colors'
        )
        expect(row).toHaveAttribute('data-slot', 'table-row')
      })
    })

    it('applies correct classes to table heads', () => {
      render(<SimpleTable />)
      
      const heads = screen.getByRole('table').querySelectorAll('th')
      heads.forEach(head => {
        expect(head).toHaveClass(
          'text-foreground',
          'h-10',
          'px-2',
          'text-left',
          'align-middle',
          'font-medium',
          'whitespace-nowrap'
        )
        expect(head).toHaveAttribute('data-slot', 'table-head')
      })
    })

    it('applies correct classes to table cells', () => {
      render(<SimpleTable />)
      
      const cells = screen.getByRole('table').querySelectorAll('td')
      cells.forEach(cell => {
        expect(cell).toHaveClass(
          'p-2',
          'align-middle',
          'whitespace-nowrap'
        )
        expect(cell).toHaveAttribute('data-slot', 'table-cell')
      })
    })

    it('applies correct classes to table caption', () => {
      render(<SimpleTable />)
      
      const caption = screen.getByRole('table').querySelector('caption')
      expect(caption).toHaveClass('text-muted-foreground', 'mt-4', 'text-sm')
      expect(caption).toHaveAttribute('data-slot', 'table-caption')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className to table components', () => {
      render(
        <Table className="custom-table">
          <TableHeader className="custom-header">
            <TableRow className="custom-row">
              <TableHead className="custom-head">Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-body">
            <TableRow>
              <TableCell className="custom-cell">Data</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter className="custom-footer">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
          <TableCaption className="custom-caption">Caption</TableCaption>
        </Table>
      )
      
      expect(screen.getByRole('table')).toHaveClass('custom-table')
      expect(screen.getByRole('table').querySelector('thead')).toHaveClass('custom-header')
      expect(screen.getByRole('table').querySelector('tbody')).toHaveClass('custom-body')
      expect(screen.getByRole('table').querySelector('tfoot')).toHaveClass('custom-footer')
      expect(screen.getByRole('table').querySelector('caption')).toHaveClass('custom-caption')
      
      const rows = screen.getByRole('table').querySelectorAll('tr')
      expect(rows[0]).toHaveClass('custom-row')
      
      expect(screen.getByRole('columnheader')).toHaveClass('custom-head')
      expect(screen.getByRole('cell')).toHaveClass('custom-cell')
    })

    it('merges custom className with default classes', () => {
      render(
        <Table className="custom-table">
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const table = screen.getByRole('table')
      expect(table).toHaveClass('custom-table')
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm')
    })
  })

  describe('Data Attributes', () => {
    it('sets correct data-slot attributes', () => {
      render(<SimpleTable />)
      
      const table = screen.getByRole('table')
      const container = table.parentElement
      
      expect(container).toHaveAttribute('data-slot', 'table-container')
      expect(table).toHaveAttribute('data-slot', 'table')
      expect(table.querySelector('thead')).toHaveAttribute('data-slot', 'table-header')
      expect(table.querySelector('tbody')).toHaveAttribute('data-slot', 'table-body')
      expect(table.querySelector('tfoot')).toHaveAttribute('data-slot', 'table-footer')
      expect(table.querySelector('caption')).toHaveAttribute('data-slot', 'table-caption')
      
      const rows = table.querySelectorAll('tr')
      rows.forEach(row => {
        expect(row).toHaveAttribute('data-slot', 'table-row')
      })
      
      const heads = table.querySelectorAll('th')
      heads.forEach(head => {
        expect(head).toHaveAttribute('data-slot', 'table-head')
      })
      
      const cells = table.querySelectorAll('td')
      cells.forEach(cell => {
        expect(cell).toHaveAttribute('data-slot', 'table-cell')
      })
    })

    it('supports custom data attributes', () => {
      render(
        <Table data-table-type="user-list">
          <TableHeader data-header-sticky="true">
            <TableRow data-row-type="header">
              <TableHead data-sortable="true">Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-body-scrollable="true">
            <TableRow data-row-id="1">
              <TableCell data-cell-type="name">John</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByRole('table')).toHaveAttribute('data-table-type', 'user-list')
      expect(screen.getByRole('table').querySelector('thead')).toHaveAttribute('data-header-sticky', 'true')
      expect(screen.getByRole('table').querySelector('tbody')).toHaveAttribute('data-body-scrollable', 'true')
      
      const headerRow = screen.getByRole('table').querySelector('thead tr')
      expect(headerRow).toHaveAttribute('data-row-type', 'header')
      
      const dataRow = screen.getByRole('table').querySelector('tbody tr')
      expect(dataRow).toHaveAttribute('data-row-id', '1')
      
      expect(screen.getByRole('columnheader')).toHaveAttribute('data-sortable', 'true')
      expect(screen.getByRole('cell')).toHaveAttribute('data-cell-type', 'name')
    })
  })

  describe('Accessibility', () => {
    it('maintains proper table semantics', () => {
      render(<SimpleTable />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(3)
      expect(screen.getAllByRole('cell')).toHaveLength(7) // 6 data cells + 1 footer cell
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 2 body + 1 footer
    })

    it('supports aria attributes', () => {
      render(
        <Table aria-label="User data table" aria-describedby="table-desc">
          <TableCaption id="table-desc">A comprehensive list of users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" aria-sort="ascending">Name</TableHead>
              <TableHead scope="col">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('aria-label', 'User data table')
      expect(table).toHaveAttribute('aria-describedby', 'table-desc')
      
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
      expect(nameHeader).toHaveAttribute('scope', 'col')
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    })
  })

  describe('Complex Table Layouts', () => {
    it('handles tables with row spans', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell rowSpan={2}>Multi-row cell</TableCell>
              <TableCell>Cell 1</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const multiRowCell = screen.getByText('Multi-row cell').closest('td')
      expect(multiRowCell).toHaveAttribute('rowSpan', '2')
    })

    it('handles tables with column spans', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={3}>Wide cell spanning 3 columns</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Col 1</TableCell>
              <TableCell>Col 2</TableCell>
              <TableCell>Col 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const wideCell = screen.getByText('Wide cell spanning 3 columns').closest('td')
      expect(wideCell).toHaveAttribute('colSpan', '3')
    })

    it('handles tables with nested content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <div>
                  <strong>Primary Text</strong>
                  <p>Secondary text with more details</p>
                </div>
              </TableCell>
              <TableCell>
                <button>Action</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('Primary Text')).toBeInTheDocument()
      expect(screen.getByText('Secondary text with more details')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('provides horizontal scroll for overflow', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 20 }, (_, i) => (
                <TableHead key={i}>Column {i + 1}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {Array.from({ length: 20 }, (_, i) => (
                <TableCell key={i}>Data {i + 1}</TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const container = screen.getByRole('table').parentElement
      expect(container).toHaveClass('overflow-x-auto')
    })
  })

  describe('Table States', () => {
    it('supports selected row state', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected row</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Normal row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const selectedRow = screen.getByText('Selected row').closest('tr')
      expect(selectedRow).toHaveAttribute('data-state', 'selected')
      expect(selectedRow).toHaveClass('data-[state=selected]:bg-muted')
    })

    it('supports hover effects', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Hoverable row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const row = screen.getByText('Hoverable row').closest('tr')
      expect(row).toHaveClass('hover:bg-muted/50')
    })
  })

  describe('Checkbox Integration', () => {
    it('handles checkbox columns correctly', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input type="checkbox" role="checkbox" aria-label="Select all" />
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input type="checkbox" role="checkbox" aria-label="Select row" />
              </TableCell>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument()
      
      const checkboxCells = screen.getByRole('table').querySelectorAll('[role=checkbox]')
      checkboxCells.forEach(checkbox => {
        const cell = checkbox.closest('td, th')
        expect(cell).toHaveClass('[&:has([role=checkbox])]:pr-0')
        expect(cell).toHaveClass('[&>[role=checkbox]]:translate-y-[2px]')
      })
    })
  })

  describe('Common Usage Patterns', () => {
    it('works as a data table', () => {
      render(
        <Table>
          <TableCaption>Recent orders</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>#12345</TableCell>
              <TableCell>John Doe</TableCell>
              <TableCell>Shipped</TableCell>
              <TableCell>$99.99</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>#12346</TableCell>
              <TableCell>Jane Smith</TableCell>
              <TableCell>Processing</TableCell>
              <TableCell>$149.99</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('Recent orders')).toBeInTheDocument()
      expect(screen.getByText('#12345')).toBeInTheDocument()
      expect(screen.getByText('Shipped')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })

    it('works as a comparison table', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Basic</TableHead>
              <TableHead>Pro</TableHead>
              <TableHead>Enterprise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Storage</TableCell>
              <TableCell>10GB</TableCell>
              <TableCell>100GB</TableCell>
              <TableCell>Unlimited</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Users</TableCell>
              <TableCell>1</TableCell>
              <TableCell>10</TableCell>
              <TableCell>Unlimited</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('Feature')).toBeInTheDocument()
      expect(screen.getByText('Basic')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
      expect(screen.getByText('Enterprise')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty table', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody></TableBody>
        </Table>
      )
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByRole('table').querySelector('tbody')).toBeEmptyDOMElement()
    })

    it('handles table without header', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data without header</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Data without header')).toBeInTheDocument()
      expect(screen.getByRole('table').querySelector('thead')).not.toBeInTheDocument()
    })

    it('handles table without footer', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByRole('table').querySelector('tfoot')).not.toBeInTheDocument()
    })

    it('handles very long cell content', () => {
      const longContent = 'This is a very long piece of content that might overflow the cell and test how the table handles long text content.'
      
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>{longContent}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const cell = screen.getByText(longContent).closest('td')
      expect(cell).toHaveClass('whitespace-nowrap')
    })
  })
})
