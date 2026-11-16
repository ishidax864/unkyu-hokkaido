/** Small, local SVG artwork. Decorative symbols always accompany a visible label. */
export function RailwayMark({ className }: { className?: string }) {
    return <svg className={className} viewBox="0 0 40 48" fill="none" aria-hidden="true">
        <path d="M20 1C8 1 1 7 1 18v24a5 5 0 0 0 5 5h28a5 5 0 0 0 5-5V18C39 7 32 1 20 1Z" fill="currentColor"/>
        <path d="M12 37 9 41m19-4 3 4M10 34V16c0-6 20-6 20 0v18c0 4-20 4-20 0Z" stroke="#FAFBF8" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M14 17h4v9h-4zm8 0h4v9h-4Z" fill="#FAFBF8"/>
        <path d="M14 12h12M13 29h14" stroke="#FAFBF8" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14.5" cy="33" r="1.5" fill="#FAFBF8"/><circle cx="25.5" cy="33" r="1.5" fill="#FAFBF8"/>
        <path d="M14 42h12" stroke="#E59A67" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>;
}

export function RouteSymbol({ destination }: { destination: string }) {
    const artwork: Record<string, React.ReactNode> = {
        'shin-chitose-airport': <><path d="m17 4-3 10-9 5v3l9-2v5l-3 2v2l6-1 6 1v-2l-3-2v-5l9 2v-3l-9-5-1-10Z" fill="#E7F0F3"/><path d="M3 30h26" opacity=".45"/></>,
        otaru: <><path d="M4 23V12l6-5 6 5v11m0-11 6-5 6 5v11" fill="#E8F0EE"/><path d="M8 15h4m-4 4h4m8-4h4m-4 4h4M3 27c3 3 6-3 9 0s6-3 9 0 6-3 9 0"/><path d="M7 23h18" opacity=".4"/></>,
        asahikawa: <><path d="M4 24V11m24 13V11M3 23h26M5 12c5 12 17 12 22 0"/><path d="M10 18v5m6-3v3m6-5v5M3 28h26" opacity=".65"/><path d="M3 8h3m20 0h3"/></>,
        obihiro: <><path d="M8 28V9m0 10c-6 0-6-5-6-5 6 0 6 5 6 5Zm0-5c6 0 6-5 6-5-6 0-6 5-6 5Z" fill="#EEF0DD"/><path d="M8 9C4 5 8 2 8 2s4 3 0 7ZM19 28V13l5-4 5 4v15Z" fill="#E7EFF2"/><path d="M18 13h12m-7 15v-7h3v7"/></>,
        hakodate: <><path d="m3 20 4 6h19l4-6H3Z" fill="#E5EEF3"/><path d="M8 20v-6h16v6M12 14V9h8v5m-4-5V4m0 1h7v4h-7M3 29c3 2 6-2 9 0s6-2 9 0 6-2 9 0"/><path d="M12 17h1m6 0h1"/></>,
        kutchan: <><path d="M2 27 15 6l15 21H2Z" fill="#E7EFF3"/><path d="m9 16 6 2 5-5M4 28h24M25 4v6m-3-3h6"/><path d="m7 24 6-4 5 5" opacity=".5"/></>,
    };
    return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="route-symbol">{artwork[destination]}</svg>;
}
