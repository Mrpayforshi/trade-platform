export type NavItem = {
  label: string;
  /** No href = page not built yet; rendered as a "Soon" entry, never a dead link. */
  href?: string;
  /** SVG path data, 24x24 stroke icon. */
  icon: string;
};

export type NavGroup = { label?: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Command center", href: "/dashboard", icon: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
    ],
  },
  {
    label: "Source",
    items: [
      { label: "Catalogue", href: "/dashboard/catalogue", icon: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01" },
      { label: "RFQs and quotes", icon: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" },
    ],
  },
  {
    label: "Transact",
    items: [
      { label: "Transactions", icon: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4" },
      { label: "Landed cost", icon: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" },
      { label: "Protected payments", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" },
    ],
  },
  {
    label: "Comply",
    items: [
      { label: "Compliance cases", icon: "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 14l2 2 4-4" },
      { label: "Document vault", icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    ],
  },
  {
    label: "Move",
    items: [
      { label: "Shipments", href: "/dashboard/shipments", icon: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
      { label: "Inspections", icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3M8 11l2 2 3-3" },
      { label: "Trade visits", icon: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
    ],
  },
];
