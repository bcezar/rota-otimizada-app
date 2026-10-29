import { apiFetch } from '../api/client';
import type { SavedAddress } from './AddressBookContext';

interface ApiAddressBookEntry {
  id: string;
  address: string;
  place_name: string;
  notes: string;
  client: SavedAddress['client'];
  tags: string[];
  updated_at: string;
  deleted_at: string | null;
  position: number;
}

interface AddressBookResponse {
  addresses: ApiAddressBookEntry[];
}

function fromApi(entry: ApiAddressBookEntry): SavedAddress {
  return {
    id: entry.id,
    address: entry.address,
    placeName: entry.place_name,
    notes: entry.notes,
    client: entry.client,
    tags: entry.tags,
    updatedAt: entry.updated_at,
    deletedAt: entry.deleted_at,
    position: entry.position,
  };
}

function toApi(entry: SavedAddress, position: number): ApiAddressBookEntry {
  return {
    id: entry.id,
    address: entry.address,
    place_name: entry.placeName,
    notes: entry.notes,
    client: entry.client,
    tags: entry.tags,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
    position,
  };
}

export async function syncAddressBook(
  addresses: SavedAddress[],
  token: string,
): Promise<SavedAddress[]> {
  const response = await apiFetch<AddressBookResponse>('/api/v1/address-book/sync', {
    method: 'PUT',
    token,
    body: { addresses: addresses.map(toApi) },
  });
  return response.addresses.map(fromApi);
}

