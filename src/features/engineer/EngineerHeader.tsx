import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton, Logo } from '@/ui';
import styles from './EngineerPage.module.css';

/** Шапка 56 px (§9.1): логотип, имя инженера, меню ⋯; на карточке заявки слева «←». */
export function EngineerHeader({
  name,
  menu,
  onBack,
}: {
  name: string;
  menu?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <header className={styles.header}>
      {onBack && (
        <IconButton icon={ArrowLeft} label="Назад" variant="ghost" size="lg" onClick={onBack} />
      )}
      <Logo size={28} wordmark={false} />
      <span className={styles.name}>{name}</span>
      {menu}
    </header>
  );
}
