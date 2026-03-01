"use client";

import { useEffect, useMemo, useState } from "react";

type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe: { user?: TgUser };
  ready: () => void;
  expand: () => void;
  close: () => void;
  themeParams?: Record<string, string>;
  viewportHeight?: number;
  viewportStableHeight?: number;
};

function getWebApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.Telegram?.WebApp ?? null;
}

const stub: TgWebApp = {
  initData: "",
  initDataUnsafe: {},
  ready: () => {},
  expand: () => {},
  close: () => {},
};

export function useTelegram() {
  const [webApp, setWebApp] = useState<TgWebApp>(() => getWebApp() ?? stub);

  useEffect(() => {
    const wa = getWebApp();
    if (wa) {
      try {
        wa.ready();
      } catch {}
      setWebApp(wa);
    } else {
      setWebApp(stub);
    }
  }, []);

  const user = useMemo(() => webApp.initDataUnsafe?.user ?? null, [webApp]);
  const isTelegram = useMemo(() => !!getWebApp(), []);
  const hasInitData = useMemo(() => !!webApp.initData, [webApp]);

  return Object.assign(webApp, { user, isTelegram, hasInitData });
}
