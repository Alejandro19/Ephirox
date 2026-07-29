'use client';

import { useEffect, useState } from 'react';
import { getCountries, getCities, type CountryOption } from '../../lib/geo-client';

export type CountryCityValue = {
  country: string;
  city: string;
  phoneCode: string;
  phoneNumber: string;
};

export type CountryCityPickerProps = {
  value: CountryCityValue;
  onChange: (patch: Partial<CountryCityValue>) => void;
};

export function CountryCityPicker({ value, onChange }: CountryCityPickerProps) {
  const [priority, setPriority] = useState<CountryOption[]>([]);
  const [rest, setRest] = useState<CountryOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getCountries()
      .then((data) => {
        setPriority(data.priority);
        setRest(data.rest);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const allCountries = [...priority, ...rest];
  const phoneCodes = Array.from(new Map(allCountries.filter((c) => c.phonecode).map((c) => [c.phonecode, c])).values());

  const handleCountryChange = (isoCode: string) => {
    onChange({ country: isoCode, city: '' });
    if (isoCode) {
      getCities(isoCode)
        .then(setCities)
        .catch((e: Error) => setLoadError(e.message));
    } else {
      setCities([]);
    }
  };

  return (
    <div>
      {loadError && <p role="alert">{loadError}</p>}
      <label htmlFor="field-country">País de residencia</label>
      <select id="field-country" value={value.country} onChange={(e) => handleCountryChange(e.target.value)}>
        <option value="">Selecciona tu país…</option>
        <optgroup label="Países frecuentes">
          {priority.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.flag} {c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Todos los países">
          {rest.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.flag} {c.name}
            </option>
          ))}
        </optgroup>
      </select>

      <label htmlFor="field-city">Ciudad</label>
      <input
        id="field-city"
        type="text"
        list="field-city-options"
        disabled={!value.country}
        placeholder={value.country ? 'Busca tu ciudad…' : 'Primero selecciona tu país'}
        value={value.city}
        onChange={(e) => onChange({ city: e.target.value })}
      />
      <datalist id="field-city-options">
        {cities.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>

      <label htmlFor="field-phone-code">Indicativo</label>
      <select id="field-phone-code" value={value.phoneCode} onChange={(e) => onChange({ phoneCode: e.target.value })}>
        {phoneCodes.map((c) => (
          <option key={c.phonecode} value={`+${c.phonecode}`}>
            {c.flag} +{c.phonecode}
          </option>
        ))}
      </select>

      <label htmlFor="field-phone-number">Celular (WhatsApp)</label>
      <input
        id="field-phone-number"
        type="tel"
        placeholder="300 123 4567"
        value={value.phoneNumber}
        onChange={(e) => onChange({ phoneNumber: e.target.value })}
      />
    </div>
  );
}
