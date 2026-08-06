import { cn } from '../../lib/utils';

const BT = '`';

const LOGO = String.raw`
  _____                           _              
 |  __ \                         | |             
 | |__) |__ _ __  _   _ _ __ ___ | |__  _ __ __ _
 |  ___/ _ \ '_ \| | | | '_ ${BT} _ \| '_ \| '__/ _${BT} |
 | |  |  __/ | | | |_| | | | | | | |_) | | | (_| |
 |_|   \___|_| |_|\__,_|_| |_| |_|_.__/|_|  \__,_|`;

interface AsciiLogoProps {
  className?: string;
  title?: string;
}

/** The Antumbra ASCII banner, rendered in the accent color like the TUI. */
export function AsciiLogo({ className, title = 'Antumbra' }: AsciiLogoProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <pre
        aria-label={title}
        className="select-none overflow-x-auto whitespace-pre text-center text-[11px] leading-[1.05] text-accent sm:text-sm"
      >
        {LOGO}
      </pre>
    </div>
  );
}
