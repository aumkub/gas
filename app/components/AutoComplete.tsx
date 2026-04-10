import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface AutoCompleteProps<T> {
  items: T[];
  itemToString: (item: T) => string;
  filterItem?: (item: T, queryString: string) => boolean;
  onSelect: (item: T) => void;
  onInputValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<void>;
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
  clearOnSelect?: boolean;
  initialValue?: string;
  renderItem?: (item: T) => React.ReactNode;
  focusTrigger?: number;
  preventEnter?: boolean;
  inputRef?: React.RefObject<HTMLInputElement> | ((el: HTMLInputElement | null) => void);
}

export function AutoComplete<T>({
  items,
  itemToString,
  filterItem,
  onSelect,
  onInputValueChange,
  placeholder = "ค้นหา...",
  label,
  allowCreate = false,
  onCreate,
  error,
  disabled = false,
  isLoading = false,
  clearOnSelect = false,
  initialValue = "",
  renderItem,
  focusTrigger,
  preventEnter = false,
  inputRef: externalInputRef,
}: AutoCompleteProps<T>) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Handle external ref
  const inputRef = internalInputRef;

  useEffect(() => {
    if (typeof externalInputRef === 'function') {
      externalInputRef(inputRef.current);
    } else if (externalInputRef && 'current' in externalInputRef) {
      (externalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
    }
  }, [externalInputRef, inputRef.current]);

  const normalizeValue = (value: string) => value.trim().toLowerCase();

  const findExactMatch = (query: string): T | null => {
    if (!query.trim()) return null;
    const normalizedQuery = normalizeValue(query);
    return (
      filteredItems.find(
        (item) => normalizeValue(itemToString(item)) === normalizedQuery
      ) ?? null
    );
  };

  // Filter items based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter((item) =>
      filterItem
        ? filterItem(item, inputValue)
        : itemToString(item).toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredItems(filtered);
    setHighlightedIndex(-1);
  }, [inputValue, items, filterItem, itemToString]);

  // Sync external updates (from parent state) into the input display,
  // but avoid overriding user typing while the field is actively focused/open.
  useEffect(() => {
    if (!isFocusedRef.current && !isOpen) {
      setInputValue(initialValue);
    }
  }, [initialValue, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onInputValueChange?.(value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectItem = (item: T) => {
    const itemString = itemToString(item);
    setInputValue(clearOnSelect ? "" : itemString);
    setIsOpen(false);
    onSelect(item);
  };

  const handleCreateNew = async () => {
    if (!allowCreate || !onCreate || !inputValue.trim()) return;

    const createdValue = inputValue.trim();
    setIsCreating(true);
    try {
      await onCreate(createdValue);
      setInputValue(clearOnSelect ? "" : createdValue);
      onInputValueChange?.(createdValue);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to create new item:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onInputValueChange?.("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (preventEnter && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
          handleSelectItem(filteredItems[highlightedIndex]);
        } else {
          const exactMatch = findExactMatch(inputValue);
          if (exactMatch) {
            handleSelectItem(exactMatch);
            break;
          }
        }

        if (allowCreate && inputValue.trim()) {
          handleCreateNew();
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (filteredItems.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Close dropdown when input loses focus
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Handle focus trigger from parent
  useEffect(() => {
    if (focusTrigger && focusTrigger > 0) {
      setTimeout(() => {
        inputRef.current?.focus();
        setIsOpen(true);
      }, 50);
    }
  }, [focusTrigger]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on a dropdown item (let the onClick handler process it)
      const target = event.target as HTMLElement;
      if (target.closest('.dropdown-item')) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasExactMatch = !!findExactMatch(inputValue);
  const showCreateOption = false;

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled || isLoading || isCreating}
            aria-invalid={!!error}
            data-invalid={error ? "true" : undefined}
            className={
              error ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200" : ""
            }
          />

          {inputValue && (
            <Button
              onClick={handleClear}
              disabled={disabled || isLoading || isCreating}
              kind="ghost"
              size="compact"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-[30px] min-h-[30px] !w-5 !text-xs !py-1"
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div
          className="absolute z-50 text-sm w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ minWidth: inputRef.current?.offsetWidth || "100%" }}
          onMouseDown={(e) => e.preventDefault()} // Prevent mousedown from closing dropdown
        >
          {filteredItems.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={index}
                onClick={() => handleSelectItem(item)}
                className={`dropdown-item px-4 py-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                  isHighlighted ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                style={{ minHeight: "48px", display: "flex", alignItems: "center" }}
              >
                {renderItem ? renderItem(item) : itemToString(item)}
              </div>
            );
          })}

        </div>
      )}

      {isOpen && filteredItems.length === 0 && !showCreateOption && (
        <div
          className="absolute z-50 text-sm w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
          style={{ minWidth: inputRef.current?.offsetWidth || "100%" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            className="px-4 py-3 text-sm text-gray-500 text-center"
            style={{ minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ไม่พบข้อมูล
          </div>
        </div>
      )}
    </div>
  );
}
