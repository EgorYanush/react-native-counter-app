import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const dict = {
  ru: {
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      retry: 'Повторить',
      exit: 'Выйти',
      total: 'Итого',
      optional: 'Необязательно',
      cancel: 'Отмена',
      save: 'Сохранить',
      delete: 'Удалить',
      added: 'Площадка добавлена',
      saved: 'Изменения сохранены',
      ready: 'Готово',
      confirm: 'Подтвердите',
    },
    tabs: {
      sites: 'Площадки',
      new: 'Новая запись',
      mine: 'Мои записи',
      approvals: 'На утверждение',
      payroll: 'Ведомость',
    },
    user: { default: 'Пользователь' },
    status: {
      draft: 'Черновик',
      submitted: 'Отправлено',
      approved: 'Утверждено',
      rejected: 'Отклонено',
    },
    list: {
      sortTitle: 'Сортировка и фильтр',
      sortDateDesc: 'По дате ↓',
      sortDateAsc: 'По дате ↑',
      sortSite: 'По площадке',
      allSites: 'Все площадки',
      all: 'Все',
      paid: 'Выплачено',
      unpaid: 'Не выплачено',
      allWorkers: 'Все работники',
      dateRange: 'Диапазон дат',
      from: 'С',
      to: 'По',
    },
    newForm: {
      title: 'Новая запись (черновик)',
      date: 'Дата',
      container: 'Номер контейнера',
      size: 'Размер',
      site: 'Площадка (выберите)',
      workers: 'Работники',
      comment: 'Комментарий',
      saveDraft: 'Сохранить черновик',
      submit: 'Отправить',
      errNoContainer: 'Номер контейнера обязателен',
      errNoSite: 'Выберите площадку',
      errNoWorkers: 'Выберите работников',
    },
    mine: {
      empty: 'Записей пока нет',
      site: 'Площадка',
      comment: 'Комментарий',
      submitForApprove: 'Отправить на утверждение',
    },
    approvals: {
      empty: 'Нет записей для утверждения',
      approve: 'Утвердить',
      reject: 'Отклонить',
    },
    sitesAdmin: {
      new: 'Новая площадка',
      name: 'Название',
      addr: 'Адрес',
      addrPlaceholder: 'Адрес (необязательно)',
      contact: 'Контакт площадки',
      price20: 'Цена 20',
      price40: 'Цена 40',
      add: 'Добавить',
      edit: 'Редактирование',
      editBtn: 'Редактировать',
      addrNotSet: 'Адрес не указан',
      namePlaceholder: 'Например: Площадка А · склад',
    },
    payroll: {
      title: 'Ведомость',
      period: 'Период',
      from: 'С',
      to: 'По',
      calc: 'Рассчитать',
      excel: 'Экспорт Excel',
      pdf: 'Экспорт PDF',
      date: 'Дата',
      site: 'Площадка',
      size: 'Размер',
      amount: 'Сумма (₪)',
      header: (from, to) => `Ведомость за период ${from} — ${to}`,
      payWorker: 'Отметить как выплачено',
      payAll: 'Выплатить всем',
      confirmPayWorker: 'Отметить выбранного работника как оплаченного за период?',
      confirmPayAll: 'Выплатить всем и отметить заявки как оплаченные?',
    },
    auth: {
      signin: 'Вход',
      signup: 'Регистрация',
      fullName: 'ФИО',
      phone: 'Телефон',
      email: 'Email',
      password: 'Пароль (мин. 6 символов)',
      submitIn: 'Войти',
      submitUp: 'Создать аккаунт',
      switchToUp: 'Нет аккаунта? Зарегистрируйтесь',
      switchToIn: 'У меня уже есть аккаунт',
      needName: 'Введите имя (ФИО)',
      needPhone: 'Введите телефон',
      confirmMail: 'Мы отправили письмо для подтверждения. Откройте ссылку, затем вернитесь и войдите.',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      exit: 'Sign out',
      total: 'Total',
      optional: 'Optional',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      added: 'Site added',
      saved: 'Changes saved',
      ready: 'Done',
      confirm: 'Confirm',
    },
    tabs: {
      sites: 'Sites',
      new: 'New Entry',
      mine: 'My Entries',
      approvals: 'Approvals',
      payroll: 'Payroll',
    },
    user: { default: 'User' },
    status: {
      draft: 'Draft',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    list: {
      sortTitle: 'Sorting and filter',
      sortDateDesc: 'By date ↓',
      sortDateAsc: 'By date ↑',
      sortSite: 'By site',
      allSites: 'All sites',
      all: 'All',
      paid: 'Paid',
      unpaid: 'Unpaid',
      allWorkers: 'All workers',
      dateRange: 'Date range',
      from: 'From',
      to: 'To',
    },
    newForm: {
      title: 'New entry (draft)',
      date: 'Date',
      container: 'Container number',
      size: 'Size',
      site: 'Site (choose)',
      workers: 'Workers',
      comment: 'Comment',
      saveDraft: 'Save draft',
      submit: 'Submit',
      errNoContainer: 'Container number is required',
      errNoSite: 'Choose a site',
      errNoWorkers: 'Choose workers',
    },
    mine: {
      empty: 'No entries yet',
      site: 'Site',
      comment: 'Comment',
      submitForApprove: 'Submit for approval',
    },
    approvals: {
      empty: 'No entries to approve',
      approve: 'Approve',
      reject: 'Reject',
    },
    sitesAdmin: {
      new: 'New site',
      name: 'Name',
      addr: 'Address',
      addrPlaceholder: 'Address (optional)',
      contact: 'Contact phone',
      price20: 'Price 20',
      price40: 'Price 40',
      add: 'Add',
      edit: 'Edit',
      editBtn: 'Edit',
      addrNotSet: 'Address not set',
      namePlaceholder: 'e.g., Site A · warehouse',
    },
    payroll: {
      title: 'Payroll',
      period: 'Period',
      from: 'From',
      to: 'To',
      calc: 'Calculate',
      excel: 'Export Excel',
      pdf: 'Export PDF',
      date: 'Date',
      site: 'Site',
      size: 'Size',
      amount: 'Amount (₪)',
      header: (from, to) => `Payroll for ${from} — ${to}`,
      payWorker: 'Mark as paid',
      payAll: 'Pay all',
      confirmPayWorker: 'Mark selected worker as paid for this period?',
      confirmPayAll: 'Mark all as paid for this period?',
    },
    auth: {
      signin: 'Sign in',
      signup: 'Sign up',
      fullName: 'Full name',
      phone: 'Phone',
      email: 'email',
      password: 'password (min 6 chars)',
      submitIn: 'Sign in',
      submitUp: 'Create account',
      switchToUp: "Don't have an account? Sign up",
      switchToIn: 'I already have an account',
      needName: 'Enter your name (Full Name)',
      needPhone: 'Enter phone',
      confirmMail: 'We sent a confirmation email. Open the link, then return and sign in.',
    },
  },
};

function get(dict, key) {
  const parts = key.split('.');
  let cur = dict;
  for (const p of parts) cur = cur?.[p];
  return typeof cur === 'string' || typeof cur === 'function' ? cur : key;
}

export const LangContext = React.createContext({
  lang: 'ru',
  setLang: () => {},
  t: (k) => get(dict.ru, k),
  fmtAmount: (n) => `₪${Number(n ?? 0).toFixed(2)}`,
});

export function LangProvider({ children }) {
  const [lang, setLang] = useState('ru');

  useEffect(() => {
    AsyncStorage.getItem('lang').then(v => { if (v === 'en' || v === 'ru') setLang(v); });
  }, []);

  const setAndSave = useCallback(async (l) => {
    setLang(l);
    try { await AsyncStorage.setItem('lang', l); } catch {}
  }, []);

  const value = useMemo(() => ({
    lang,
    setLang: setAndSave,
    t: (k, ...args) => {
      const v = get(dict[lang] || dict.ru, k);
      if (typeof v === 'function') return v(...args);
      return v;
    },
    fmtAmount: (n) => `₪${Number(n ?? 0).toFixed(2)}`,
  }), [lang, setAndSave]);

  return (
    <LangContext.Provider value={value}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  const ctx = React.useContext(LangContext);
  return ctx;
}

