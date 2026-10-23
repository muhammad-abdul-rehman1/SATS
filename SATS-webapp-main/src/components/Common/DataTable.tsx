import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Checkbox,
} from '@mui/material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectAll?: (selected: boolean) => void;
  onSelectRow?: (id: string, selected: boolean) => void;
  getRowId?: (row: any) => string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  getRowId = (row) => row._id || row.id,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography color="textSecondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(getRowId(r)));
  const someSelected = rows.some((r) => selectedIds.includes(getRowId(r))) && !allSelected;

  return (
    <TableContainer component={Paper}>
      <Table stickyHeader aria-label="sticky table">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            {selectable && (
              <TableCell padding="checkbox" sx={{ width: 48, backgroundColor: '#f5f5f5' }}>
                <Checkbox
                  size="small"
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  inputProps={{ 'aria-label': 'select all rows' }}
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth || 100 }}
                sx={{ fontWeight: 'bold' }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);
            return (
              <TableRow
                key={rowId || index}
                hover
                selected={isSelected}
                sx={{
                  backgroundColor: isSelected ? 'rgba(0, 102, 255, 0.05)' : undefined,
                  '&.Mui-selected, &.Mui-selected:hover': {
                    backgroundColor: 'rgba(0, 102, 255, 0.09) !important',
                  },
                }}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={(e) => onSelectRow?.(rowId, e.target.checked)}
                      inputProps={{ 'aria-label': `select row ${index}` }}
                    />
                  </TableCell>
                )}
                {columns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell key={`${index}-${column.id}`} align={column.align}>
                      {column.render ? column.render(row) : column.format ? column.format(value) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
