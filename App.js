// App.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar as RNStatusBar,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import AuthScreen from './AuthScreen';
import { LangProvider, useLang } from './i18n';
import { supabase } from './supabaseClient';


// ===== AuthGate =====
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <LangProvider>
      {session ? <AuthedApp /> : <AuthScreen onAuthed={() => {}} />}
    </LangProvider>
  );
}

// ===== Р В РЎвЂєР РЋР С“Р В Р вЂ¦Р В РЎвЂўР В Р вЂ Р В Р вЂ¦Р В РЎвЂўР В Р’Вµ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР В Р’В»Р В РЎвЂўР В Р’В¶Р В Р’ВµР В Р вЂ¦Р В РЎвЂР В Р’Вµ =====
function AuthedApp() {
  const { t, lang, setLang } = useLang();
  const [profile, setProfile] = useState(null); // {id, full_name, role}
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Р В РІР‚в„ўР В РЎвЂќР В Р’В»Р В Р’В°Р В РўвЂР В РЎвЂќР В РЎвЂ
  const [tab, setTab] = useState('new'); // 'sites' | 'new' | 'mine' | 'approvals'

  // Р В РІР‚СњР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р В Р’Вµ
  const [sites, setSites] = useState([]);
  const [entries, setEntries] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ===== API helpers =====
  const fetchMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Р В РЎСљР В Р’Вµ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РЎвЂР В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦');
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const payload = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Р В РЎСџР В РЎвЂўР В Р’В»Р РЋР Р‰Р В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р РЋРІР‚С™Р В Р’ВµР В Р’В»Р РЋР Р‰',
        role: 'worker',
      };
      const { data: ins, error: e2 } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();
      if (e2) throw e2;
      data = ins;
    }
    return data;
  }, []);
  /*
  const getMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Р В РЎСљР В Р’Вµ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РЎвЂР В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  }, []);
  */

  const listSites = useCallback(async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, []);

  const listEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, []);

  const createWorkEntry = useCallback(async ({ date, container_no, size, comment, site_id, worker_ids }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Р В РЎСљР В Р’Вµ Р В Р’В°Р В Р вЂ Р РЋРІР‚С™Р В РЎвЂўР РЋР вЂљР В РЎвЂР В Р’В·Р В РЎвЂўР В Р вЂ Р В Р’В°Р В Р вЂ¦');
    const payload = {
      date,
      container_no,
      size,               // '20' | '40'
      comment: comment || null,
      status: 'draft',
      site_id,
      worker_ids: (Array.isArray(worker_ids) && worker_ids.length ? Array.from(new Set(worker_ids)) : [user.id]),
      created_by: user.id,
    };
    const { data, error } = await supabase.from('work_entries').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }, []);

  const submitWorkEntry = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('work_entries')
      .update({ status: 'submitted' })
      .eq('id', id)
      .select('*').single();
    if (error) throw error;
    return data;
  }, []);

  const approveWorkEntry = useCallback(async (id, bonus = 0) => {
    const { data: { user } } = await supabase.auth.getUser();
    // try set bonus_total if the column exists; if not, ignore error and approve without it
    let updatePayload = { status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() };
    if (typeof bonus === 'number' && !Number.isNaN(bonus) && Number(bonus) > 0) {
      updatePayload = { ...updatePayload, bonus_total: Number(bonus) };
    }
    const { data, error } = await supabase.from('work_entries').update(updatePayload).eq('id', id).select('*').single();
    if (error) throw error;
    return data;
  }, []);

  const rejectWorkEntry = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('work_entries')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select('*').single();
    if (error) throw error;
    return data;
  }, []);

  const deleteWorkEntry = useCallback(async (id) => {
    const { error } = await supabase
      .from('work_entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }, []);

  // ===== Р В РІР‚вЂќР В Р’В°Р В РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР В Р’В·Р В РЎвЂќР В Р’В° Р В РўвЂР В Р’В°Р В Р вЂ¦Р В Р вЂ¦Р РЋРІР‚в„–Р РЋРІР‚В¦ =====
  const loadAll = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const [p, s, e, pr] = await Promise.all([fetchMyProfile(), listSites(), listEntries(), (async()=>{
        try { const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name'); return data||[]; } catch { return []; }
      })()]);
      setProfile(p);
      setSites(s);
      // Р В РЎСџР В РЎвЂўР В РЎвЂќР В Р’В°Р В Р’В·Р РЋРІР‚в„–Р В Р вЂ Р В Р’В°Р В Р’ВµР В РЎВ Р В Р вЂ Р РЋР С“Р В Р’Вµ Р В Р’В·Р В Р’В°Р РЋР РЏР В Р вЂ Р В РЎвЂќР В РЎвЂ Р В Р’В±Р РЋР вЂљР В РЎвЂР В РЎвЂ“Р В Р’В°Р В РўвЂР В РЎвЂР РЋР вЂљР РЋРЎвЂњ, Р В Р’В° Р РЋР вЂљР В Р’В°Р В Р’В±Р В РЎвЂўР РЋРІР‚РЋР В Р’ВµР В РЎВР РЋРЎвЂњ Р Р†Р вЂљРІР‚Сњ Р РЋРІР‚С™Р В РЎвЂўР В Р’В»Р РЋР Р‰Р В РЎвЂќР В РЎвЂў Р РЋР С“Р В Р вЂ Р В РЎвЂўР В РЎвЂ
      const onlyMine = (arr) => arr.filter(it => (Array.isArray(it.worker_ids) && it.worker_ids.includes(p.id)) || it.created_by === p.id);
      const entriesForUser = p?.role === 'foreman' ? e : onlyMine(e);
      setEntries(entriesForUser);
      setProfiles(pr);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingProfile(false);
    }
  }, [fetchMyProfile, listSites, listEntries]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const isForeman = profile?.role === 'foreman';
  const tabs = useMemo(() => ([
    ...(isForeman ? [{ key: 'sites', label: t('tabs.sites') }] : []),
    { key: 'new', label: t('tabs.new') },
    { key: 'mine', label: t('tabs.mine') },
    ...(isForeman ? [{ key: 'approvals', label: t('tabs.approvals') }, { key: 'payroll', label: t('tabs.payroll') }] : []),
  ]), [isForeman, t]);

  // ===== UI =====
  if (loadingProfile || loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" />
        <Text style={s.muted}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.err}>{t('common.error')}: {error}</Text>
        <Pressable onPress={loadAll} style={s.btnPrimary}><Text style={s.btnPrimaryText}>{t('common.retry')}</Text></Pressable>
        <Pressable onPress={() => supabase.auth.signOut()} style={[s.btnSecondary, { marginTop: 10 }]}>
          <Text style={s.btnSecondaryText}>{t('common.exit')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.wrap}>
      <RNStatusBar translucent={false} backgroundColor="#0b1220" barStyle="light-content" hidden={false} />
      <View style={s.header}>
        <Text style={[s.title, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
          {(profile?.full_name || t('user.default'))}
        </Text>
        <View style={{ flexDirection:'row', gap:8, alignItems:'center', flexShrink: 0 }}>
          <Pressable onPress={() => setLang('ru')} style={[s.chip, lang==='ru' && s.chipActive]}><Text style={[s.chipText, lang==='ru' && s.chipTextActive]}>RU</Text></Pressable>
          <Pressable onPress={() => setLang('en')} style={[s.chip, lang==='en' && s.chipActive]}><Text style={[s.chipText, lang==='en' && s.chipTextActive]}>EN</Text></Pressable>
          <Pressable onPress={() => supabase.auth.signOut()} style={s.btnSecondary}>
            <Text style={s.btnSecondaryText}>{t('common.exit')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.tabbarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: '100%' }} contentContainerStyle={s.tabbarContent}>
          {tabs.map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tabItem, tab === t.key && s.tabItemActive]}>
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {tab === 'sites' && isForeman && (
        <SitesAdmin
          sites={sites}
          onChanged={async () => { await loadAll(); }}
        />
      )}

      {tab === 'new' && (
        <NewWorkForm
          sites={sites}
          profiles={profiles}
          userId={profile?.id}
          onCreated={async () => { await loadAll(); setTab('mine'); }}
          createWorkEntry={createWorkEntry}
          submitWorkEntry={submitWorkEntry}
        />
      )}

      {tab === 'mine' && (
        <MyWorkList
          entries={entries}
          onRefresh={onRefresh}
          refreshing={refreshing}
          sites={sites}
          profiles={profiles}
          isForeman={isForeman}
          deleteWorkEntry={async (id) => { await deleteWorkEntry(id); await loadAll(); }}
          submitWorkEntry={async (id) => { await submitWorkEntry(id); await loadAll(); }}
        />
      )}

      {tab === 'approvals' && isForeman && (
        <ApprovalsList
          entries={entries}
          sites={sites}
          profiles={profiles}
          onApprove={async (id, bonus) => { await approveWorkEntry(id, bonus); await loadAll(); }}
          onReject={async (id) => { await rejectWorkEntry(id); await loadAll(); }}
        />
      )}
      {tab === 'payroll' && isForeman && (
        <PayrollView sites={sites} entries={entries} profiles={profiles} refresh={loadAll} />
      )}
    </SafeAreaView>
  );
}

// ===== Р В Р’В¤Р В РЎвЂўР РЋР вЂљР В РЎВР РЋРІР‚в„– Р В РЎвЂ Р РЋР С“Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂќР В РЎвЂ =====
function NewWorkForm({ sites, profiles, userId, onCreated, createWorkEntry, submitWorkEntry }) {
  const { t } = useLang();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [containerNo, setContainerNo] = useState('');
  const [size, setSize] = useState('20'); // '20' | '40'
  const [comment, setComment] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id || null);
  const [busy, setBusy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [workerIds, setWorkerIds] = useState(userId ? [userId] : []);

  function toggleWorker(id) {
    setWorkerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function create(statusAfterCreate) {
    if (!containerNo.trim()) return Alert.alert(t('common.error'), t('newForm.errNoContainer'));
    if (!siteId) return Alert.alert(t('common.error'), t('newForm.errNoSite'));
    if (!workerIds.length) return Alert.alert(t('common.error'), t('newForm.errNoWorkers'));
    setBusy(true);
    try {
      const row = await createWorkEntry({
        date,
        container_no: containerNo.trim(),
        size,
        comment: comment.trim(),
        site_id: siteId,
        worker_ids: workerIds,
      });
      if (statusAfterCreate === 'submitted') {
        await submitWorkEntry(row.id);
      }
      onCreated && onCreated();
    } catch (e) {
      Alert.alert(t('common.error'), e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('newForm.title')}</Text>

        <Text style={s.label}>{t('newForm.date')}</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%', backgroundColor: '#0b1220', borderWidth: 1, borderColor: '#1f2937',
              color: '#e5e7eb', padding: 12, borderRadius: 10, outline: 'none'
            }}
          />
        ) : (
          <>
            <Pressable onPress={() => setShowDatePicker(true)} style={s.input}>
              <Text style={{ color: '#e5e7eb' }}>{date}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="default"
                onChange={(event, selected) => {
                  setShowDatePicker(false);
                  if (selected) {
                    const d = new Date(selected);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setDate(`${y}-${m}-${day}`);
                  }
                }}
              />
            )}
          </>
        )}

        <Text style={s.label}>{t('newForm.container')}</Text>
        <TextInput value={containerNo} onChangeText={setContainerNo} style={s.input} placeholder="MSCU1234567" placeholderTextColor="#94a3b8" />

        <Text style={s.label}>{t('newForm.size')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip active={size === '20'} onPress={() => setSize('20')}>20</Chip>
          <Chip active={size === '40'} onPress={() => setSize('40')}>40</Chip>
        </View>

        <Text style={s.label}>{t('newForm.site')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {sites.map(sx => (
            <Chip key={sx.id} active={siteId === sx.id} onPress={() => setSiteId(sx.id)}>
              {sx.name}
            </Chip>
          ))}
        </View>

        <Text style={s.label}>{t('newForm.workers')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(profiles || []).map(p => (
            <Chip key={p.id} active={workerIds.includes(p.id)} onPress={() => toggleWorker(p.id)}>
              {p.full_name || p.id.slice(0,8)}
            </Chip>
          ))}
        </View>

        <Text style={s.label}>{t('newForm.comment')}</Text>
        <TextInput value={comment} onChangeText={setComment} style={s.input} placeholder={t('common.optional')} placeholderTextColor="#94a3b8" />

        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <Pressable disabled={busy} onPress={() => create('draft')} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>{t('newForm.saveDraft')}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => create('submitted')} style={s.btnSecondary}>
            <Text style={s.btnSecondaryText}>{t('newForm.submit')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function MyWorkList({ entries, onRefresh, refreshing, sites, profiles, submitWorkEntry, deleteWorkEntry, isForeman }) {
  const { t, fmtAmount } = useLang();
  const [siteFilter, setSiteFilter] = useState(null); // id | null
  const [sortMode, setSortMode] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'site'
  const [workerFilter, setWorkerFilter] = useState(null); // user id | null
  const [paidFilter, setPaidFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  let my = entries;
  if (isForeman && siteFilter) my = my.filter(e => e.site_id === siteFilter);
  // Apply worker filter (foreman only)
  if (isForeman && workerFilter) {
    my = my.filter(e => Array.isArray(e.worker_ids) && e.worker_ids.includes(workerFilter));
  }
  // Apply date range
  if (from) my = my.filter(e => e.date >= from);
  if (to) my = my.filter(e => e.date <= to);
  // Apply paid/unpaid filter (foreman only)
  function isFullyPaid(e){
    const workers = Array.isArray(e.worker_ids) ? e.worker_ids : [];
    const paid = new Set(Array.isArray(e.paid_worker_ids) ? e.paid_worker_ids : []);
    return workers.length > 0 && workers.every(uid => paid.has(uid));
  }
  if (isForeman) {
    if (paidFilter === 'paid') my = my.filter(isFullyPaid);
    else if (paidFilter === 'unpaid') my = my.filter(e => !isFullyPaid(e));
  }
  if (isForeman) {
    my = [...my].sort((a, b) => {
      if (sortMode === 'site') {
        const an = (sites.find(s => s.id === a.site_id)?.name || '').localeCompare(sites.find(s => s.id === b.site_id)?.name || '');
        if (an !== 0) return an;
        return (a.date < b.date ? 1 : -1);
      }
      if (sortMode === 'date_asc') return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; // date_desc
    });
  } else {
    // Р В РЎСљР В Р’В° Р В Р вЂ Р РЋР С“Р РЋР РЏР В РЎвЂќР В РЎвЂР В РІвЂћвЂ“ Р РЋР С“Р В Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР В Р’В°Р В РІвЂћвЂ“, Р В Р’ВµР РЋР С“Р В Р’В»Р В РЎвЂ Р РЋР С“Р В Р вЂ Р В Р’ВµР РЋР вЂљР РЋРІР‚В¦Р РЋРЎвЂњ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂР РЋРІвЂљВ¬Р РЋРІР‚ВР В Р’В» Р В РЎвЂ”Р В РЎвЂўР В Р’В»Р В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ Р РЋР С“Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂўР В РЎвЂќ Р Р†Р вЂљРІР‚Сњ Р В РЎвЂўР РЋРІР‚С™Р РЋРІР‚С›Р В РЎвЂР В Р’В»Р РЋР Р‰Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР В Р’ВµР В РЎВ Р В Р вЂ¦Р В Р’В° Р РЋРЎвЂњР РЋР вЂљР В РЎвЂўР В Р вЂ Р В Р вЂ¦Р В Р’Вµ Р РЋР С“Р В РЎвЂ”Р В РЎвЂР РЋР С“Р В РЎвЂќР В Р’В°
    // (Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋРІР‚С›Р В РЎвЂР В Р’В»Р РЋР Р‰ Р В Р вЂ¦Р В Р’ВµР В РўвЂР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР В РЎвЂ”Р В Р’ВµР В Р вЂ¦ Р В Р’В·Р В РўвЂР В Р’ВµР РЋР С“Р РЋР Р‰, Р В Р вЂ¦Р В РЎвЂў entries Р РЋРЎвЂњР В Р’В¶Р В Р’Вµ Р В РЎвЂўР РЋРІР‚С™Р В РЎвЂўР В Р’В±Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р РЋРІР‚в„– Р В Р вЂ  loadAll)
  }
  function siteName(id) {
    const s = sites.find(x => x.id === id);
    return s ? s.name : '-';
  }
  function priceFor(entry) {
    const s = sites.find(x => x.id === entry.site_id);
    if (!s) return 0;
    const base = Number(entry.size === '40' ? s.price40 : s.price20) || 0;
    const bonusTotal = Number(entry.bonus_total || 0) || 0;
    const workers = Array.isArray(entry.worker_ids) ? entry.worker_ids : [];
    const bonusShare = workers.length ? bonusTotal / workers.length : bonusTotal;
    return base + bonusShare;
  }
  function workerNames(ids){
    const list = Array.isArray(ids) ? ids : [];
    return list.map(uid => (profiles || []).find(p=>p.id===uid)?.full_name || uid.slice(0,8)).join(', ');
  }

  return (
    <FlatList
      data={my}
      keyExtractor={(it) => it.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<Text style={s.muted}>{t('mine.empty')}</Text>}
      ListHeaderComponent={isForeman ? (
        <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={s.label}>{t('list.sortTitle')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip active={sortMode==='date_desc'} onPress={() => setSortMode('date_desc')}>{t('list.sortDateDesc')}</Chip>
            <Chip active={sortMode==='date_asc'} onPress={() => setSortMode('date_asc')}>{t('list.sortDateAsc')}</Chip>
            <Chip active={sortMode==='site'} onPress={() => setSortMode('site')}>{t('list.sortSite')}</Chip>
          </View>
          {isForeman && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems:'center', flexWrap:'wrap' }}>
              <Text style={s.label}>{t('list.dateRange')}</Text>
              {Platform.OS==='web' ? (
                <>
                  <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
                  <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
                </>
              ) : (
                <>
                  <Pressable onPress={()=>setShowFromPicker(true)} style={s.input}><Text style={{color:'#e5e7eb'}}>{t('list.from')}: {from||'-'}</Text></Pressable>
                  {showFromPicker && (
                    <DateTimePicker
                      value={from ? new Date(from) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selected) => {
                        setShowFromPicker(false);
                        if (selected) {
                          const d = new Date(selected);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          setFrom(`${y}-${m}-${day}`);
                        }
                      }}
                    />
                  )}
                  <Pressable onPress={()=>setShowToPicker(true)} style={s.input}><Text style={{color:'#e5e7eb'}}>{t('list.to')}: {to||'-'}</Text></Pressable>
                  {showToPicker && (
                    <DateTimePicker
                      value={to ? new Date(to) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selected) => {
                        setShowToPicker(false);
                        if (selected) {
                          const d = new Date(selected);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          setTo(`${y}-${m}-${day}`);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            <Chip active={!siteFilter} onPress={() => setSiteFilter(null)}>{t('list.allSites')}</Chip>
            {sites.map(sx => (
              <Chip key={sx.id} active={siteFilter===sx.id} onPress={() => setSiteFilter(sx.id)}>{sx.name}</Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            <Chip active={paidFilter==='all'} onPress={() => setPaidFilter('all')}>{t('list.all')}</Chip>
            <Chip active={paidFilter==='unpaid'} onPress={() => setPaidFilter('unpaid')}>{t('list.unpaid')}</Chip>
            <Chip active={paidFilter==='paid'} onPress={() => setPaidFilter('paid')}>{t('list.paid')}</Chip>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            <Chip active={!workerFilter} onPress={() => setWorkerFilter(null)}>{t('list.allWorkers')}</Chip>
            {(profiles || []).map(p => (
              <Chip key={p.id} active={workerFilter===p.id} onPress={() => setWorkerFilter(p.id)}>
                {p.full_name || p.id.slice(0,8)}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}
      renderItem={({ item }) => (
        <View style={s.card}>
          <StatusBadge status={item.status} />
          <Text style={s.cardTitle}>{item.date} - {item.container_no} - {item.size}</Text>
          <Text style={s.cardLine}>{t('mine.site')}: {item.site_id ? siteName(item.site_id) : '-'}</Text>
          <Text style={s.cardLine}>{t('newForm.workers')}: {workerNames(item.worker_ids)}</Text>
          <Text style={s.cardLine}>{t('mine.comment')}: {item.comment || '-'}</Text>
          <Text style={[s.cardLine, { fontWeight: '700' }]}>
            {t('common.total')}: {fmtAmount(priceFor(item))}
          </Text>
          {item.status === 'draft' && (
            <Pressable onPress={() => submitWorkEntry(item.id)} style={[s.btnPrimary, { marginTop: 10 }]}>
              <Text style={s.btnPrimaryText}>{t('mine.submitForApprove')}</Text>
            </Pressable>
          )}
          {isForeman && (
            <Pressable onPress={async () => {
              if (Platform.OS === 'web') {
                if (window.confirm((t('common.delete') + '?'))) await deleteWorkEntry(item.id);
              } else {
                Alert.alert(t('common.confirm'), t('common.delete') + '?', [
                  { text: t('common.cancel') },
                  { text: t('common.delete'), style: 'destructive', onPress: () => deleteWorkEntry(item.id) },
                ]);
              }
            }} style={[s.btnSecondary, { marginTop: 10 }]}>
              <Text style={s.btnSecondaryText}>{t('common.delete')}</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

function ApprovalsList({ entries, sites, profiles, onApprove, onReject }) {
  const { t, fmtAmount, lang } = useLang();
  const wait = entries.filter(e => e.status === 'submitted');
  const [bonuses, setBonuses] = useState({}); // { [id]: string }

  function siteName(id) {
    const s = sites.find(x => x.id === id);
    return s ? s.name : '-';
  }
  function totalFor(entry) {
    const s = sites.find(x => x.id === entry.site_id);
    if (!s) return 0;
    return Number(entry.size === '40' ? s.price40:s.price20) || 0;
  }
  function workerNames(ids){
    const list = Array.isArray(ids) ? ids : [];
    return list.map(uid => (profiles || []).find(p=>p.id===uid)?.full_name || uid.slice(0,8)).join(', ');
  }

  function sitePhone(id){
    const s = sites.find(x => x.id === id);
    return s?.contact_phone || s?.contact || s?.phone || null;
  }

  async function openWhatsApp(phoneRaw, msg){
    const phone = String(phoneRaw||'').replace(/\D/g,'');
    const text = encodeURIComponent(msg);
    if (!phone) return false;
    try{
      if (Platform.OS === 'web') {
        await Linking.openURL(`https://wa.me/${phone}?text=${text}`);
      } else {
        const url = `whatsapp://send?phone=${phone}&text=${text}`;
        const can = await Linking.canOpenURL(url);
        await Linking.openURL(can ? url : `https://wa.me/${phone}?text=${text}`);
      }
      return true;
    } catch { return false; }
  }

  async function handleApprove(entry){
    const bonus = Number(bonuses[entry.id] ?? 0) || 0;
    await onApprove(entry.id, bonus);
    const ask = lang==='ru' ? 'Хотите уведомить площадку?' : 'Notify the site?';
    const noPhone = lang==='ru' ? 'У площадки не указан номер' : 'No phone number for this site';
    const yes = lang==='ru' ? 'Да' : 'Yes';
    const no = lang==='ru' ? 'Нет' : 'No';
    const phone = sitePhone(entry.site_id);
    if (Platform.OS === 'web') {
      if (!phone) { window.alert(noPhone); return; }
      if (window.confirm(ask)) {
        const msg = `Work on container N# ${entry.container_no} is completed. Date: ${entry.date}`;
        await openWhatsApp(phone, msg);
      }
    } else {
      if (!phone) { Alert.alert(t('common.error'), noPhone); return; }
      Alert.alert(t('common.confirm'), ask, [
        { text: no },
        { text: yes, onPress: async () => {
          const msg = `Work on container N# ${entry.container_no} is completed. Date: ${entry.date}`;
          await openWhatsApp(phone, msg);
        } }
      ]);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {wait.length === 0 ? (
        <Text style={s.muted}>{t('approvals.empty')}</Text>
      ) : (
        wait.map(e => (
          <View key={e.id} style={s.card}>
            <Text style={s.cardTitle}>{e.date} - {e.container_no} - {e.size}</Text>
            <Text style={s.cardLine}>{t('mine.site')}: {siteName(e.site_id)}</Text>
            <Text style={s.cardLine}>{t('mine.comment')}: {e.comment || '-'}</Text>
            <Text style={s.cardLine}>{t('newForm.workers')}: {workerNames(e.worker_ids)}</Text>
            <View style={{ height: 8 }} />
            <Text style={s.label}>{(t('payroll.bonus') || 'Премия')}</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={String(bonuses[e.id] ?? '')}
              onChangeText={(v)=>setBonuses(prev=>({ ...prev, [e.id]: v }))}
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
            {(() => {
              const base = totalFor(e);
              const bonus = Number(bonuses[e.id] ?? 0) || 0;
              return (
                <Text style={[s.cardLine, { fontWeight: '700', marginTop: 6 }]}>
                  {t('common.total')}: {fmtAmount(base + bonus)}
                </Text>
              );
            })()}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => onReject(e.id)} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('approvals.reject')}</Text></Pressable>
              <Pressable onPress={() => handleApprove(e)} style={s.btnPrimary}><Text style={s.btnPrimaryText}>{t('approvals.approve')}</Text></Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}


function PayrollView({ sites, entries, profiles: allProfiles, refresh }) {
  const { t, fmtAmount } = useLang();
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);


  function siteName(id) {
    const s = sites.find(x => x.id === id);
    return s ? s.name : '-';
  }
  function priceFor(entry) {
    const s = sites.find(x => x.id === entry.site_id);
    if (!s) return 0;
    return Number(entry.size === '40' ? s.price40:s.price20) || 0;
  }

  function nameOf(uid){ return (allProfiles || []).find(p=>p.id===uid)?.full_name || uid.slice(0,8); }

  function withinRange(d){ return d >= from && d <= to; }

  async function exportExcel(data){
    const rows = [
      ['Name','Date','Site','Size',t('payroll.amount')]
    ];
    data.forEach(w => {
      w.lines.forEach(l => rows.push([w.name,l.date,l.site,l.size,l.amount.toFixed(2)]));
      rows.push([w.name,'TOTAL','','',w.total.toFixed(2)]);
    });
    const filename = `payroll_${from}_${to}.xls`;
    if (Platform.OS === 'web') {
      // Build simple Excel-compatible HTML
      const table = ['<table><thead><tr><th>Name</th><th>Date</th><th>Site</th><th>Size</th><th>', t('payroll.amount') ,'</th></tr></thead><tbody>'].join('')
        + data.map(w => w.lines.map(l => `<tr><td>${w.name}</td><td>${l.date}</td><td>${l.site}</td><td>${l.size}</td><td>${l.amount.toFixed(2)}</td></tr>`).join('')
          + `<tr><td colspan="4" style="text-align:right;font-weight:bold">TOTAL</td><td>${w.total.toFixed(2)}</td></tr>`).join('')
        + '</tbody></table>';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${table}</body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      Alert.alert(t('common.ready'), filename);
      return;
    }
    if (!documentDirectory) {
      Alert.alert(t('common.error'), 'Недоступна директория документов');
      return;
    }
    const path = documentDirectory + filename;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${rows.map(r=>r.join('\t')).join('\n')}</body></html>`;
    await writeAsStringAsync(path, html, { encoding: EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    else Alert.alert(t('common.ready'), `Excel: ${path}`);
  }
  async function exportPDF(data){
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:16px}
      h1{font-size:18px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th,td{border:1px solid #ccc;padding:6px;font-size:12px}
      th{background:#f2f2f2}
    </style></head><body>
      <h1>${t('payroll.header')(from,to)}</h1>
      ${data.map(w=>`
        <h2 style="font-size:16px">${w.name}</h2>
        <table>
          <thead><tr><th>${t('payroll.date')}</th><th>${t('payroll.site')}</th><th>${t('payroll.size')}</th><th>${t('payroll.amount')}</th></tr></thead>
          <tbody>
            ${w.lines.map(l=>`<tr><td>${l.date}</td><td>${l.site}</td><td>${l.size}</td><td>${l.amount.toFixed(2)}</td></tr>`).join('')}
            <tr><td colspan="3" style="text-align:right;font-weight:bold">${t('common.total')}</td><td><b>${w.total.toFixed(2)}</b></td></tr>
          </tbody>
        </table>
      `).join('')}
    </body></html>`;
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 200);
      } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
      return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    else Alert.alert(t('common.ready'), `PDF: ${uri}`);
  }

  function buildReport(){
    const map = new Map();
    const approved = entries.filter(e => e.status==='approved' && e.date && withinRange(e.date));
    for (const e of approved){
      const amount = priceFor(e);
      const bonusTotal = Number(e.bonus_total || 0) || 0;
      const workers = Array.isArray(e.worker_ids) ? e.worker_ids : [];
      const paidSet = new Set(Array.isArray(e.paid_worker_ids) ? e.paid_worker_ids : []);
      const share = workers.length ? amount / workers.length : amount;
      const bonusShare = workers.length ? bonusTotal / workers.length : bonusTotal;
      for (const uid of workers){
        if (paidSet.has(uid)) continue; // skip already paid
        if (!map.has(uid)) map.set(uid, { id: uid, name: nameOf(uid), total: 0, lines: []});
        const row = map.get(uid);
        row.lines.push({ date: e.date, site: siteName(e.site_id), size: e.size, amount: (share + bonusShare) });
        row.total += (share + bonusShare);
      }
    }
    const out = Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
    setReport(out);
  }

  async function markPaidWorker(uid){
    try {
      setBusy(true);
      const affected = entries.filter(e => e.status==='approved' && e.date && withinRange(e.date) && Array.isArray(e.worker_ids) && e.worker_ids.includes(uid));
      for (const e of affected){
        const paid = Array.isArray(e.paid_worker_ids) ? e.paid_worker_ids : [];
        if (!paid.includes(uid)){
          const nextPaid = Array.from(new Set([...paid, uid]));
          const { error } = await supabase.from('work_entries').update({ paid_worker_ids: nextPaid }).eq('id', e.id);
          if (error) throw error;
        }
      }
      await refresh();
      buildReport();
    } catch(e){
      Alert.alert(t('common.error'), e.message || String(e));
    } finally { setBusy(false); }
  }

  async function markAllPaid(){
    try {
      setBusy(true);
      const affected = entries.filter(e => e.status==='approved' && e.date && withinRange(e.date));
      for (const e of affected){
        const paid = Array.isArray(e.paid_worker_ids) ? e.paid_worker_ids : [];
        const workers = Array.isArray(e.worker_ids) ? e.worker_ids : [];
        const nextPaid = Array.from(new Set([...(paid||[]), ...workers]));
        const { error } = await supabase.from('work_entries').update({ paid_worker_ids: nextPaid }).eq('id', e.id);
        if (error) throw error;
      }
      await refresh();
      buildReport();
    } catch(e){
      Alert.alert(t('common.error'), e.message || String(e));
    } finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('payroll.title')}</Text>
        <Text style={s.label}>{t('payroll.period')}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {Platform.OS==='web' ? (
            <>
              <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
              <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />
            </>
          ) : (
            <>
              <Pressable onPress={()=>setShowFromPicker(true)} style={[s.input, { flex: 1 }]}><Text style={{color:'#e5e7eb'}}>{t('payroll.from')}: {from}</Text></Pressable>
              {showFromPicker && (
                <DateTimePicker
                  value={from ? new Date(from) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    setShowFromPicker(false);
                    if (selected) {
                      const d = new Date(selected);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setFrom(`${y}-${m}-${day}`);
                    }
                  }}
                />
              )}
              <Pressable onPress={()=>setShowToPicker(true)} style={[s.input, { flex: 1 }]}><Text style={{color:'#e5e7eb'}}>{t('payroll.to')}: {to}</Text></Pressable>
              {showToPicker && (
                <DateTimePicker
                  value={to ? new Date(to) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    setShowToPicker(false);
                    if (selected) {
                      const d = new Date(selected);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setTo(`${y}-${m}-${day}`);
                    }
                  }}
                />
              )}
              {/* Р В РІР‚СњР В Р’В»Р РЋР РЏ Р В РЎвЂ”Р РЋР вЂљР В РЎвЂўР РЋР С“Р РЋРІР‚С™Р В РЎвЂўР РЋРІР‚С™Р РЋРІР‚в„– Р В Р вЂ¦Р В Р’В° Р В РЎВР В РЎвЂўР В Р’В±Р В РЎвЂР В Р’В»Р В РЎвЂќР В Р’Вµ Р В РЎВР В РЎвЂўР В Р’В¶Р В Р вЂ¦Р В РЎвЂў Р В Р вЂ Р РЋР вЂљР В Р’ВµР В РЎВР В Р’ВµР В Р вЂ¦Р В Р вЂ¦Р В РЎвЂў Р В Р вЂ Р В Р вЂ Р В РЎвЂўР В РўвЂР В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚РЋР В Р’ВµР РЋР вЂљР В Р’ВµР В Р’В· Р РЋР С“Р В РЎвЂР РЋР С“Р РЋРІР‚С™Р В Р’ВµР В РЎВР В Р вЂ¦Р РЋРІР‚в„–Р В РІвЂћвЂ“ date input Р В РЎвЂР В Р’В»Р В РЎвЂ Р В РўвЂР В РЎвЂўР В Р’В±Р В Р’В°Р В Р вЂ Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РўвЂР В Р вЂ Р В Р’В° DateTimePicker Р В Р’В°Р В Р вЂ¦Р В Р’В°Р В Р’В»Р В РЎвЂўР В РЎвЂ“Р В РЎвЂР РЋРІР‚РЋР В Р вЂ¦Р В РЎвЂў NewWorkForm */}
            </>
          )}
        </View>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection:'row', gap:12, flexWrap:'wrap' }}>
          <Pressable disabled={busy} onPress={buildReport} style={s.btnPrimary}><Text style={s.btnPrimaryText}>{t('payroll.calc')}</Text></Pressable>
          {report ? (
            <>
              <Pressable onPress={() => exportExcel(report)} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('payroll.excel')}</Text></Pressable>
              <Pressable onPress={() => exportPDF(report)} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('payroll.pdf')}</Text></Pressable>
            </>
          ) : null}
        </View>
      </View>

      {report && report.map(worker => (
        <View key={worker.id} style={s.card}>
          <Text style={s.cardTitle}>{worker.name}</Text>
          {worker.lines.map((l, i) => (
            <Text key={i} style={s.cardLine}>{l.date} - {l.site} - {l.size} - {fmtAmount(l.amount)}</Text>
          ))}
          <Text style={[s.cardLine, { fontWeight:'700', marginTop: 6 }]}>{t('common.total')}: {fmtAmount(worker.total)}</Text>
          <View style={{ height: 8 }} />
          <Pressable onPress={async () => {
            if (Platform.OS === 'web') {
              if (window.confirm(t('payroll.confirmPayWorker'))) await markPaidWorker(worker.id);
            } else {
              Alert.alert(t('common.confirm'), t('payroll.confirmPayWorker'), [
                { text: t('common.cancel') },
                { text: t('payroll.payWorker'), onPress: async () => { await markPaidWorker(worker.id); } }
              ]);
            }
          }} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('payroll.payWorker')}</Text></Pressable>
        </View>
      ))}
      {report && report.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Pressable onPress={async () => {
            if (Platform.OS === 'web') {
              if (window.confirm(t('payroll.confirmPayAll'))) await markAllPaid();
            } else {
              Alert.alert(t('common.confirm'), t('payroll.confirmPayAll'), [
                { text: t('common.cancel') },
                { text: t('payroll.payAll'), onPress: async () => { await markAllPaid(); } },
              ]);
            }
          }} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('payroll.payAll')}</Text></Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SitesAdmin({ sites, onChanged }) {
  const { t, fmtAmount } = useLang();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', addr: '', contact: '', price20:'', price40:'' });
  const [busy, setBusy] = useState(false);

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      addr: s.addr || '',
      contact: s.contact_phone || '',
      price20:String(s.price20 ?? ''),
      price40:String(s.price40 ?? ''),
    });
  }

  function reset() {
    setEditingId(null);
    setForm({ name: '', addr: '', contact: '', price20:'', price40:'' });
  }

  async function saveEdit(id) {
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        addr: form.addr.trim() || null,
        contact_phone: form.contact.trim() || null,
        price20:Number(form.price20) || 0,
        price40:Number(form.price40) || 0,
      };
      const { data, error } = await supabase
        .from('sites')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Р В РЎСљР В Р’Вµ Р РЋРЎвЂњР В РўвЂР В Р’В°Р В Р’В»Р В РЎвЂўР РЋР С“Р РЋР Р‰ Р РЋР С“Р В РЎвЂўР РЋРІР‚В¦Р РЋР вЂљР В Р’В°Р В Р вЂ¦Р В РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р В РЎвЂР В Р’В·Р В РЎВР В Р’ВµР В Р вЂ¦Р В Р’ВµР В Р вЂ¦Р В РЎвЂР РЋР РЏ');
      await onChanged();
      Alert.alert(t('common.ready'), t('common.saved'));
      reset();
    } catch (e) {
      Alert.alert('Р В РЎвЂєР РЋРІвЂљВ¬Р В РЎвЂР В Р’В±Р В РЎвЂќР В Р’В°', e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        addr: form.addr.trim() || null,
        contact_phone: form.contact.trim() || null,
        price20:Number(form.price20) || 0,
        price40:Number(form.price40) || 0,
        is_active: true,
      };
      if (!payload.name) throw new Error(t('sitesAdmin.name'));
      const { data, error } = await supabase
        .from('sites')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Р В РЎвЂєР В Р’В±Р РЋР вЂ°Р В Р’ВµР В РЎвЂќР РЋРІР‚С™ Р В Р вЂ¦Р В Р’Вµ Р РЋР С“Р В РЎвЂўР В Р’В·Р В РўвЂР В Р’В°Р В Р вЂ¦');
      await onChanged();
      Alert.alert(t('common.ready'), t('common.added'));
      reset();
    } catch (e) {
      Alert.alert(t('common.error'), e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('sitesAdmin.new')}</Text>
        <Text style={s.label}>{t('sitesAdmin.name')}</Text>
        <TextInput style={s.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder={t('sitesAdmin.namePlaceholder')} placeholderTextColor="#94a3b8" />
        <Text style={s.label}>{t('sitesAdmin.addr')}</Text>
        <TextInput style={s.input} value={form.addr} onChangeText={(t) => setForm({ ...form, addr: t })} placeholder={t('sitesAdmin.addrPlaceholder')} placeholderTextColor="#94a3b8" />
        <Text style={s.label}>{t('sitesAdmin.contact') || 'Contact phone (foreman only)'}</Text>
        <TextInput style={s.input} keyboardType="phone-pad" value={form.contact} onChangeText={(t) => setForm({ ...form, contact: t })} placeholder="+7 999 000-00-00" placeholderTextColor="#94a3b8" />
        <Text style={s.label}>{t('sitesAdmin.price20')}</Text>
        <TextInput style={s.input} keyboardType="numeric" value={form.price20} onChangeText={(t) => setForm({ ...form, price20:t })} placeholder="0" placeholderTextColor="#94a3b8" />
        <Text style={s.label}>{t('sitesAdmin.price40')}</Text>
        <TextInput style={s.input} keyboardType="numeric" value={form.price40} onChangeText={(t) => setForm({ ...form, price40:t })} placeholder="0" placeholderTextColor="#94a3b8" />
        <View style={{ height: 12 }} />
        <Pressable disabled={busy} onPress={createNew} style={s.btnPrimary}><Text style={s.btnPrimaryText}>{t('sitesAdmin.add')}</Text></Pressable>
      </View>

      {sites.map(sx => (
        <View key={sx.id} style={s.card}>
          {editingId === sx.id ? (
            <>
              <Text style={s.cardTitle}>{t('sitesAdmin.edit')}</Text>
              <Text style={s.label}>{t('sitesAdmin.name')}</Text>
              <TextInput style={s.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
              <Text style={s.label}>{t('sitesAdmin.addr')}</Text>
              <TextInput style={s.input} value={form.addr} onChangeText={(t) => setForm({ ...form, addr: t })} />
              <Text style={s.label}>{t('sitesAdmin.contact') || 'Contact phone (foreman only)'}</Text>
              <TextInput style={s.input} keyboardType="phone-pad" value={form.contact} onChangeText={(t) => setForm({ ...form, contact: t })} />
              <Text style={s.label}>{t('sitesAdmin.price20')}</Text>
              <TextInput style={s.input} keyboardType="numeric" value={form.price20} onChangeText={(t) => setForm({ ...form, price20:t })} />
              <Text style={s.label}>{t('sitesAdmin.price40')}</Text>
              <TextInput style={s.input} keyboardType="numeric" value={form.price40} onChangeText={(t) => setForm({ ...form, price40:t })} />
              <View style={{ height: 12 }} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable disabled={busy} onPress={() => saveEdit(sx.id)} style={s.btnPrimary}><Text style={s.btnPrimaryText}>{t('common.save')}</Text></Pressable>
                <Pressable disabled={busy} onPress={reset} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('common.cancel')}</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={s.cardTitle}>{sx.name}</Text>
              <Text style={s.cardLine}>20: {fmtAmount(Number(sx.price20))}   /   40: {fmtAmount(Number(sx.price40))}</Text>
              <Text style={s.cardLine}>{sx.addr || t('sitesAdmin.addrNotSet')}</Text>
              <Text style={s.cardLine}>{(t('sitesAdmin.contact') || 'Contact')}: {sx.contact_phone || '-'}</Text>
              <View style={{ height: 8 }} />
              <Pressable onPress={() => startEdit(sx)} style={s.btnSecondary}><Text style={s.btnSecondaryText}>{t('sitesAdmin.editBtn')}</Text></Pressable>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function StatusBadge({ status }) {
  const { t } = useLang();
  const map = {
    draft: { text: t('status.draft'), bg: '#374151' },
    submitted: { text: t('status.submitted'), bg: '#7c3aed' },
    approved: { text: t('status.approved'), bg: '#059669' },
    rejected: { text: t('status.rejected'), bg: '#b91c1c' },
  };
  const cfg = map[status] || map.draft;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 8 }}>
      <Text style={{ color: '#fff', fontSize: 12 }}>{cfg.text}</Text>
    </View>
  );
}

function Chip({ active, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

// ===== Р В Р Р‹Р РЋРІР‚С™Р В РЎвЂР В Р’В»Р В РЎвЂ =====
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0b1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
    backgroundColor: '#0b1220', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { color: '#e5e7eb', fontSize: 16, fontWeight: '700' },
  muted: { color: '#94a3b8', marginTop: 8 },
  err: { color: '#fca5a5', marginBottom: 12, textAlign: 'center', paddingHorizontal: 16 },

  tabbarWrap: { height: 44, borderBottomWidth: 1, borderBottomColor: '#1f2937', backgroundColor: '#0b1220' },
  tabbarContent: { alignItems: 'center', paddingHorizontal: 8 },
  tabItem: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#e5e7eb' },
  tabText: { color: '#94a3b8', fontWeight: '700' },
  tabTextActive: { color: '#e5e7eb' },

  card: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', borderRadius: 14, padding: 14, margin: 16, marginBottom: 8 },
  cardTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardLine: { color: '#cbd5e1', fontSize: 14, marginTop: 2 },

  label: { color: '#cbd5e1', marginTop: 10, marginBottom: 6, fontSize: 13 },
  input: { backgroundColor: '#0b1220', borderWidth: 1, borderColor: '#1f2937', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#e5e7eb' },

  btnPrimary: { backgroundColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  btnPrimaryText: { color: '#0b1220', fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  btnSecondaryText: { color: '#cbd5e1', fontWeight: '700' },

  chip: { borderWidth: 1, borderColor: '#334155', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, marginRight: 6, marginBottom: 6 },
  chipActive: { backgroundColor: '#e5e7eb', borderColor: '#e5e7eb' },
  chipText: { color: '#94a3b8', fontSize: 12 },
  chipTextActive: { color: '#0b1220', fontSize: 12, fontWeight: '700' },
});
