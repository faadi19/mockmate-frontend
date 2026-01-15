import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Briefcase } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import InputField from './InputField';

interface RoleAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (value: string) => void;
    label?: string;
    labelIcon?: React.ReactNode;
    placeholder?: string;
    error?: string;
    className?: string;
}

const RoleAutocomplete: React.FC<RoleAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    label,
    labelIcon,
    placeholder = "e.g. Front End Developer",
    error,
    className
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<any>(null);

    const fetchSuggestions = async (query: string) => {
        if (!query.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/roles/suggestions?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                const suggestionsList = Array.isArray(data) ? data : (data.suggestions || []);
                setSuggestions(suggestionsList);
                setShowSuggestions(suggestionsList.length > 0);
            }
        } catch (err) {
            console.error("Error fetching suggestions:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 500);
    };

    const handleSuggestionClick = (suggestion: string) => {
        onSelect(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <InputField
                label={label}
                labelIcon={labelIcon}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleInputChange}
                onFocus={() => {
                    if (value.trim().length > 0) setShowSuggestions(true);
                }}
                error={error}
                autoComplete="off"
                className="w-full"
            />

            <AnimatePresence>
                {showSuggestions && (suggestions.length > 0 || loading) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] max-h-72 overflow-y-auto z-50 overflow-x-hidden custom-scrollbar scroll-smooth"
                    >
                        {loading ? (
                            <div className="px-5 py-6 flex items-center justify-center gap-3">
                                <div className="relative w-5 h-5">
                                    <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                </div>
                                <span className="text-text-secondary text-sm font-medium animate-pulse">Searching roles...</span>
                            </div>
                        ) : (
                            <ul className="py-2 overflow-hidden">
                                {suggestions.map((suggestion: string, index: number) => {
                                    const formattedSuggestion = suggestion
                                        .split(' ')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                        .join(' ');

                                    return (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="group relative px-5 py-3.5 hover:bg-primary/10 cursor-pointer transition-all duration-200 flex items-center gap-3 border-l-2 border-transparent hover:border-primary"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <Briefcase className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-text-primary text-sm lg:text-base font-semibold group-hover:text-primary transition-colors">
                                                    {formattedSuggestion}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider text-text-secondary opacity-50 font-bold group-hover:opacity-80">
                                                    Professional Role
                                                </span>
                                            </div>
                                            <Search className="ml-auto w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoleAutocomplete;
