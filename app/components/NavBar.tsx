"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "./clsx";

export default function NavBar() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Кейсы" },
    { href: "/topup", label: "Пополнить" },
    { href: "/profile", label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-around px-3 py-3">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                active ? "bg-white/10" : "text-white/80 hover:bg-white/5 hover:text-white"
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
