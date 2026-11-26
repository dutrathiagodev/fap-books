"use client";

import { Search } from "lucide-react";
import { LOAN_STATUS_OPTIONS } from "@/domain/loan-records/loan-record-rules";
import type { LoanRecordFilters as Filters, LoanStatusFilter } from "@/types/loan-record";
import { TextField } from "../TextField";

interface LoanRecordFiltersProps {
  filters: Filters;
  // Categorias que existem na lista (o filtro só oferece o que há).
  categories: string[];
  onChange: (filters: Filters) => void;
}

// Filtros da lista: status (todos, emprestados, devolvidos), categoria e busca em tempo real por título ou leitor.
export function LoanRecordFilters({ filters, categories, onChange }: LoanRecordFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="lr-search"
        label="Buscar por título ou leitor"
        hideLabel
        type="search"
        placeholder="Buscar por título ou leitor"
        leadingIcon={Search}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        autoComplete="off"
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          {LOAN_STATUS_OPTIONS.map((option) => {
            const active = filters.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, status: option.value as LoanStatusFilter })}
                className={`h-11 cursor-pointer rounded-full border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active ? "border-brand bg-brand font-medium text-on-brand" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          Categoria
          <select
            value={filters.category}
            onChange={(event) => onChange({ ...filters, category: event.target.value })}
            className="h-11 rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-focus mouse:h-10"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
