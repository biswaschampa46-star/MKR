"use client";

import { useMemo } from "react";
import UiSelect from "@/components/UiSelect";
import { BD_DISTRICTS } from "@/lib/districts";

type Props = {
  id?: string;
  value: string;
  onChange: (district: string) => void;
  required?: boolean;
  autoComplete?: string;
};

/* Checkout wrapper — district options over the shared UiSelect listbox. */
export default function DistrictSelect({ id, value, onChange, required, autoComplete }: Props) {
  const options = useMemo(() => BD_DISTRICTS.map((d) => ({ value: d, label: d })), []);
  return (
    <UiSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select your district"
      searchPlaceholder="Search district…"
      ariaLabel="District"
      required={required}
      autoComplete={autoComplete ?? "address-level2"}
    />
  );
}
