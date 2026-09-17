import { Select } from '@sanity/ui';
import { uuid } from '@sanity/uuid';
import { useEffect, useState, useCallback, forwardRef } from 'react';
import type { ChangeEvent } from 'react';
import { set, unset } from 'sanity';

import { client } from '../../lib/client';

interface SelectOption {
  title: string;
  value: string;
}

interface CustomSelectProps {
  value?: { value?: string };
  onChange: (patch: ReturnType<typeof set> | ReturnType<typeof unset>) => void;
  schemaType: {
    query: string;
    onSelect?: (option: SelectOption) => unknown;
    formatOptions?: (data: { _key: string; title: string }[]) => SelectOption[];
  };
}

const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>((props, ref) => {
  const { value, onChange, schemaType } = props;
  const { query, onSelect, formatOptions } = schemaType;

  const [options, setOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedData = await client.fetch(query);
      let formattedOptions: SelectOption[];

      if (formatOptions) {
        formattedOptions = formatOptions(fetchedData);
      } else {
        // Default options formatting
        formattedOptions = fetchedData.map((item: { _key: string; title: string }) => ({
          title: item.title,
          value: item._key
        }));
      }

      setOptions(formattedOptions);
    };

    fetchData();
  }, [query, formatOptions]);

  // Function to handle selection change
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const selectedOption = options.find((option) => option.value === event.currentTarget.value);
      if (!selectedOption) {
        return;
      }
      const valueToUpdate = onSelect ? onSelect(selectedOption) : selectedOption.value;
      const dataToUpdate = typeof valueToUpdate === 'object' ? { _key: uuid(), ...valueToUpdate } : valueToUpdate;
      onChange(dataToUpdate ? set(dataToUpdate) : unset());
    },
    [options, onChange, onSelect]
  );

  return (
    <Select ref={ref} value={value?.value} onChange={handleChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.title}
        </option>
      ))}
    </Select>
  );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
