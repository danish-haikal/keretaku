import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      description="That link doesn't lead anywhere in KeretaKu."
      action={<Button onClick={() => navigate('/garage')}>Back to garage</Button>}
    />
  );
}
