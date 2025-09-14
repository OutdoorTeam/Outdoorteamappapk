import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = Record<string, any>;

const AccountDebug: React.FC = () => {
  const [uid, setUid] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [table, setTable] = React.useState<'users' | 'profiles' | null>(null);
  const [row, setRow] = React.useState<Row | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // UPDATE
  const [newName, setNewName] = React.useState<string>('');
  const [updateMsg, setUpdateMsg] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setRow(null);
      setUpdateMsg('');
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          setError('Sin sesión Supabase');
          setLoading(false);
          return;
        }
        setUid(auth.user.id);
        setEmail(auth.user.email ?? '');

        // 1) intento en public.users
        let tried: Array<'users' | 'profiles'> = [];
        const trySelect = async (t: 'users' | 'profiles') => {
          tried.push(t);
          const { data, error } = await supabase.from(t).select('*').eq('id', auth.user!.id).single();
          if (error) throw { t, error };
          setTable(t);
          setRow(data as Row);
          // nombre por defecto para el input
          const guess =
            (data as any)?.full_name ??
            (data as any)?.name ??
            (data as any)?.display_name ??
            '';
          setNewName(guess);
        };

        try {
          await trySelect('users');
        } catch (e1: any) {
          try {
            await trySelect('profiles');
          } catch (e2: any) {
            const msg1 = e1?.error?.message ?? JSON.stringify(e1);
            const msg2 = e2?.error?.message ?? JSON.stringify(e2);
            setError(`Falló SELECT en ${tried.join(' y ')}.\n- users: ${msg1}\n- profiles: ${msg2}`);
          }
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const doUpdateUsersFullName = async () => {
    setUpdateMsg('');
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName })
        .eq('id', uid)
        .select('*')
        .single();
      if (error) throw error;
      setUpdateMsg('UPDATE users.full_name OK ✅');
    } catch (e: any) {
      setUpdateMsg(`UPDATE users.full_name ERROR: ${e?.message || e}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-xl font-semibold mb-2">Diagnóstico de Cuenta (RLS)</h1>
      <p className="text-sm text-muted-foreground mb-4">
        UID: <code>{uid}</code> · Email: <code>{email}</code>
      </p>

      {loading && <div>Cargando…</div>}

      {!loading && error && (
        <pre className="bg-red-950/40 border border-red-800 text-red-200 p-3 rounded text-xs whitespace-pre-wrap">
{error}
        </pre>
      )}

      {!loading && !error && (
        <>
          <p className="mb-2 text-sm">
            Tabla que respondió al SELECT: <b>{table}</b>
          </p>
          <pre className="bg-neutral-900 border border-neutral-700 p-3 rounded text-xs overflow-auto mb-4">
{JSON.stringify(row, null, 2)}
          </pre>

          <div className="space-y-2">
            <label className="text-sm">Probar UPDATE users.full_name</label>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
                placeholder="Nuevo nombre"
              />
              <button
                onClick={doUpdateUsersFullName}
                className="rounded bg-yellow-600 px-3 py-1 text-sm font-medium"
              >
                Actualizar
              </button>
            </div>
            {updateMsg && (
              <pre className="bg-neutral-900 border border-neutral-700 p-2 rounded text-xs whitespace-pre-wrap">
{updateMsg}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountDebug;
