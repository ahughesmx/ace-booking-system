import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

const SearchInput = ({ 
  placeholder = "Buscar...", 
  onDebouncedChange, 
  debounceMs = 300 
}: SearchInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Manejar debounce internamente
  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedChange(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, onDebouncedChange, debounceMs]);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};

export default SearchInput;