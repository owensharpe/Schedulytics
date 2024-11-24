import React, { ChangeEvent, FormEvent } from "react";
import "./SearchBar.css";

interface SearchBarProps {
  value: string;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearch: (event: FormEvent) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onInputChange,
  onSearch,
}) => {
  return (
    <form className="search-bar" onSubmit={onSearch} noValidate>
      <input type="search" value={value} onChange={onInputChange} required />
      <button
        type="submit"
        className="search-btn"
        onClick={(e) =>
          (e.currentTarget.previousElementSibling as HTMLInputElement)?.focus()
        }
      >
        <span>Search</span>
      </button>
    </form>
  );
};

export default SearchBar;
