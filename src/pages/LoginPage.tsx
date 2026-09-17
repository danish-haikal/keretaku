import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';
import styles from './LoginPage.module.css';

type Mode = 'sign-in' | 'sign-up';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'check-email'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus('working');

    if (mode === 'sign-up') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        setStatus('idle');
        return;
      }
      // If email confirmations are on, there's no session yet — tell the user to confirm.
      if (!data.session) {
        setStatus('check-email');
        return;
      }
      setStatus('idle');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setStatus('idle');
      return;
    }
    setStatus('idle');
  }

  function toggleMode() {
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
    setError(null);
    setStatus('idle');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.logo}>
          <Icon name="garage" size={30} />
        </span>
        <h1 className={styles.title}>KeretaKu</h1>
        <p className={styles.tagline}>Service records and reminders for every car in the house.</p>

        {status === 'check-email' ? (
          <p className={styles.sent}>
            Check <strong>{email}</strong> to confirm your account, then sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Email address">
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password" hint={mode === 'sign-up' ? 'At least 6 characters.' : undefined}>
              {(id) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit" block disabled={status === 'working'}>
              {status === 'working'
                ? mode === 'sign-up'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
            <p className={styles.note}>
              {mode === 'sign-in' ? (
                <>
                  New here?{' '}
                  <button type="button" className={styles.link} onClick={toggleMode}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" className={styles.link} onClick={toggleMode}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
