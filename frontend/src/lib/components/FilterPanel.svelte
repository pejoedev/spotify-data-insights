<script lang="ts">
    import type { Writable } from "svelte/store";
    import { writable } from "svelte/store";

    export let data: any[];
    export let filters: Writable<Record<string, any>>;
    export let filteredData: Writable<any[]>;

    interface FieldInfo {
        name: string;
        type: "number" | "string" | "boolean" | "date";
        uniqueValues?: string[];
        min?: number;
        max?: number;
    }

    let fieldInfo: FieldInfo[] = [];
    let showFilters = true;
    let isLoading = writable(false);

    $: {
        if (data && data.length > 0) {
            analyzeFields(data);
            filteredData.set(data);
        }
    }

    function analyzeFields(items: any[]) {
        const fields = new Map<string, FieldInfo>();

        const firstItem = items[0];
        for (const key of Object.keys(firstItem)) {
            const values = items
                .map((item) => item[key])
                .filter((v) => v !== null && v !== undefined);

            if (values.length === 0) continue;

            const sampleValue = values[0];
            let fieldType: FieldInfo["type"] = "string";

            if (typeof sampleValue === "boolean") {
                fieldType = "boolean";
            } else if (typeof sampleValue === "number") {
                fieldType = "number";
            } else if (typeof sampleValue === "string") {
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleValue)) {
                    fieldType = "date";
                } else {
                    fieldType = "string";
                }
            }

            const info: FieldInfo = { name: key, type: fieldType };

            if (fieldType === "number") {
                const numbers = values.map(Number).filter((n) => !isNaN(n));
                info.min = Math.min(...numbers);
                info.max = Math.max(...numbers);
            } else if (fieldType === "string") {
                const unique = [...new Set(values as string[])];
                if (unique.length <= 10) {
                    info.uniqueValues = unique;
                }
            }

            fields.set(key, info);
        }

        fieldInfo = Array.from(fields.values());
    }

    function updateFilter(fieldName: string, value: any) {
        filters.update((f) => ({
            ...f,
            [fieldName]: value,
        }));
    }

    function clearFilter(fieldName: string) {
        filters.update((f) => {
            const newFilters = { ...f };
            delete newFilters[fieldName];
            return newFilters;
        });
    }

    async function clearAllFilters() {
        isLoading.set(true);
        try {
            filters.set({});
            await new Promise((resolve) => setTimeout(resolve, 300));
            applyFilters();
        } finally {
            isLoading.set(false);
        }
    }

    function applyFilters() {
        isLoading.set(true);
        try {
            const activeFilters = $filters;
            const filtered = data.filter((item) => {
                return Object.entries(activeFilters).every(([key, value]) => {
                    if (value === null || value === undefined) return true;

                    if (
                        typeof value === "object" &&
                        value.min !== undefined &&
                        value.max !== undefined
                    ) {
                        return (
                            (value.min === null || item[key] >= value.min) &&
                            (value.max === null || item[key] <= value.max)
                        );
                    } else if (
                        typeof value === "object" &&
                        value.from !== undefined &&
                        value.to !== undefined
                    ) {
                        const itemDate = new Date(item[key]);
                        const fromDate = value.from
                            ? new Date(value.from)
                            : null;
                        const toDate = value.to ? new Date(value.to) : null;
                        return (
                            (fromDate === null || itemDate >= fromDate) &&
                            (toDate === null || itemDate <= toDate)
                        );
                    } else {
                        return item[key] === value;
                    }
                });
            });

            filteredData.set(filtered);
        } finally {
            isLoading.set(false);
        }
    }
</script>

<div class="filter-panel" class:collapsed={!showFilters}>
    <div class="filter-header">
        <button
            class="toggle-btn"
            on:click={() => (showFilters = !showFilters)}
        >
            {showFilters ? "▼" : "▶"} Filters
        </button>
        {#if showFilters && Object.keys($filters).length > 0}
            <button
                class="clear-btn"
                on:click={clearAllFilters}
                disabled={$isLoading}
            >
                {#if $isLoading}
                    Clearing...
                {:else}
                    Clear All
                {/if}
            </button>
        {/if}
    </div>

    {#if showFilters}
        <div class="filters-content">
            {#each fieldInfo as field}
                <div class="filter-group">
                    <div class="filter-label">
                        <span>{field.name}</span>
                        {#if $filters[field.name] !== undefined}
                            <button
                                class="clear-field-btn"
                                on:click={() => clearFilter(field.name)}
                                >✕</button
                            >
                        {/if}
                    </div>

                    {#if field.type === "boolean"}
                        <select
                            value={$filters[field.name] ?? ""}
                            on:change={(e) => {
                                const val = e.currentTarget.value;
                                updateFilter(
                                    field.name,
                                    val === "" ? null : val === "true",
                                );
                            }}
                        >
                            <option value="">All</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                        </select>
                    {:else if field.type === "number"}
                        <div class="range-inputs">
                            <input
                                type="number"
                                placeholder={`Min (${field.min})`}
                                value={$filters[field.name]?.min ?? ""}
                                on:input={(e) => {
                                    const val = e.currentTarget.value;
                                    updateFilter(field.name, {
                                        min: val ? Number(val) : null,
                                        max: $filters[field.name]?.max ?? null,
                                    });
                                }}
                            />
                            <input
                                type="number"
                                placeholder={`Max (${field.max})`}
                                value={$filters[field.name]?.max ?? ""}
                                on:input={(e) => {
                                    const val = e.currentTarget.value;
                                    updateFilter(field.name, {
                                        min: $filters[field.name]?.min ?? null,
                                        max: val ? Number(val) : null,
                                    });
                                }}
                            />
                        </div>
                    {:else if field.type === "date"}
                        <div class="range-inputs">
                            <input
                                type="datetime-local"
                                placeholder="From"
                                value={$filters[field.name]?.from ?? ""}
                                on:input={(e) => {
                                    const val = e.currentTarget.value;
                                    updateFilter(field.name, {
                                        from: val || null,
                                        to: $filters[field.name]?.to ?? null,
                                    });
                                }}
                            />
                            <input
                                type="datetime-local"
                                placeholder="To"
                                value={$filters[field.name]?.to ?? ""}
                                on:input={(e) => {
                                    const val = e.currentTarget.value;
                                    updateFilter(field.name, {
                                        from:
                                            $filters[field.name]?.from ?? null,
                                        to: val || null,
                                    });
                                }}
                            />
                        </div>
                    {:else if field.uniqueValues}
                        <select
                            value={$filters[field.name] ?? ""}
                            on:change={(e) => {
                                const val = e.currentTarget.value;
                                updateFilter(
                                    field.name,
                                    val === "" ? null : val,
                                );
                            }}
                        >
                            <option value="">All</option>
                            {#each field.uniqueValues as value}
                                <option {value}>{value}</option>
                            {/each}
                        </select>
                    {:else}
                        <input
                            type="text"
                            placeholder="Search..."
                            value={$filters[field.name] ?? ""}
                            on:input={(e) =>
                                updateFilter(field.name, e.currentTarget.value)}
                        />
                    {/if}
                </div>
            {/each}
            <button
                class="apply-btn"
                on:click={applyFilters}
                disabled={$isLoading}
            >
                {#if $isLoading}
                    Applying...
                {:else}
                    Apply Filters
                {/if}
            </button>
        </div>
    {/if}
</div>

<style>
    .filter-panel {
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    .filter-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #3c3c3c;
    }

    .toggle-btn {
        background: none;
        border: none;
        color: #cccccc;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0.25rem 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .toggle-btn:hover {
        background: #2a2d2e;
    }

    .clear-btn {
        background: #0e639c;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 0.25rem 0.75rem;
        border-radius: 3px;
    }

    .clear-btn:hover {
        background: #1177bb;
    }

    .filters-content {
        padding: 0.75rem 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .filter-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #9cdcfe;
        font-weight: 500;
    }

    .clear-field-btn {
        background: none;
        border: none;
        color: #858585;
        cursor: pointer;
        font-size: 0.75rem;
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
    }

    .clear-field-btn:hover {
        background: #2a2d2e;
        color: #cccccc;
    }

    input,
    select {
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        color: #cccccc;
        padding: 0.5rem;
        font-size: 0.85rem;
        border-radius: 3px;
        font-family: inherit;
    }

    input:focus,
    select:focus {
        outline: none;
        border-color: #0e639c;
    }

    .range-inputs {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        min-width: 0;
        max-width: 220px;
    }

    .range-inputs input {
        flex: 1 1 80px;
        min-width: 0;
        max-width: 100px;
    }

    .apply-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #0e639c;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.2s;
    }

    .apply-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .collapsed .filters-content {
        display: none;
    }
</style>
