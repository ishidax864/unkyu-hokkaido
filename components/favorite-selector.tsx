
import { useState, useRef, useEffect } from 'react';
import { FavoriteRoute } from '@/hooks/useFavorites';
import { Star, ArrowRight, ChevronDown } from 'lucide-react';

interface FavoriteSelectorProps {
    favorites: FavoriteRoute[];
    onSelect: (route: FavoriteRoute) => void;
}

export function FavoriteSelector({ favorites, onSelect }: FavoriteSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (favorites.length === 0) return null;

    return (
        <div className="relative mb-4" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-white border border-[var(--border)] rounded-md hover:bg-[var(--background-secondary)] transition-colors text-sm"
            >
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">いつものルートから呼び出す</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted)]">
                    <span className="text-xs">{favorites.length}件</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--border)] rounded-md shadow-lg max-h-64 overflow-y-auto animate-fade-in">
                    <div className="p-2 text-xs text-[var(--muted)] bg-[var(--background-secondary)] border-b border-[var(--border)]">
                        選択すると現在の時刻で検索されます
                    </div>
                    {favorites.map((fav) => (
                        <button
                            key={fav.id}
                            onClick={() => {
                                onSelect(fav);
                                setIsOpen(false);
                            }}
                            className="w-full text-left p-3 hover:bg-[var(--background-secondary)] transition-colors border-b border-[var(--border)] last:border-0 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                {/* シンプルなデザインに統一 */}
                                <span className="font-medium text-gray-900">{fav.departureName}</span>
                                <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                                <span className="font-medium text-gray-900">{fav.arrivalName}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 text-[var(--primary)] text-xs font-bold transition-opacity">
                                反映
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
