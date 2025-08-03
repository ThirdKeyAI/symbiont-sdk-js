import chalk from 'chalk';

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export function formatTable(data: any[], columns: TableColumn[]): string {
  if (data.length === 0) {
    return chalk.gray('No data to display');
  }

  // Calculate column widths
  const widths: number[] = columns.map(col => {
    const dataWidth = Math.max(
      ...data.map(row => String(row[col.key] || '').length)
    );
    const labelWidth = col.label.length;
    return col.width || Math.max(dataWidth, labelWidth, 10);
  });

  // Create header
  const header = columns.map((col, i) => 
    alignText(col.label, widths[i], col.align || 'left')
  ).join(' | ');

  // Create separator
  const separator = widths.map(width => '-'.repeat(width)).join('-+-');

  // Create rows
  const rows = data.map(row =>
    columns.map((col, i) => 
      alignText(String(row[col.key] || ''), widths[i], col.align || 'left')
    ).join(' | ')
  );

  return [
    chalk.bold(header),
    chalk.gray(separator),
    ...rows
  ].join('\n');
}

function alignText(text: string, width: number, align: 'left' | 'right' | 'center'): string {
  if (text.length >= width) {
    return text.substring(0, width);
  }

  const padding = width - text.length;
  
  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    default:
      return text + ' '.repeat(padding);
  }
}

export function formatJson(data: any, pretty: boolean = true): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

export function formatList(items: string[], bullet: string = '•'): string {
  return items.map(item => `${chalk.blue(bullet)} ${item}`).join('\n');
}

export function formatKeyValue(obj: Record<string, any>, indent: number = 0): string {
  const prefix = ' '.repeat(indent);
  return Object.entries(obj)
    .map(([key, value]) => {
      const formattedKey = chalk.cyan(`${key}:`);
      if (typeof value === 'object' && value !== null) {
        return `${prefix}${formattedKey}\n${formatKeyValue(value, indent + 2)}`;
      }
      return `${prefix}${formattedKey} ${value}`;
    })
    .join('\n');
}

export function formatStatus(status: 'success' | 'error' | 'warning' | 'info', message: string): string {
  const icons = {
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠'),
    info: chalk.blue('ℹ')
  };
  
  return `${icons[status]} ${message}`;
}

export function formatProgress(current: number, total: number, message?: string): string {
  const percentage = Math.round((current / total) * 100);
  const completed = Math.round((current / total) * 20);
  const remaining = 20 - completed;
  
  const progressBar = chalk.green('█'.repeat(completed)) + chalk.gray('░'.repeat(remaining));
  const progress = `[${progressBar}] ${percentage}%`;
  
  return message ? `${progress} ${message}` : progress;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}