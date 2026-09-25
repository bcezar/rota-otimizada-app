export interface UserResponse {
  id: string;
  email: string;
  is_pro: boolean;
  email_verified: boolean;
  name: string | null;
  picture_url: string | null;
  is_exclusive: boolean;
  exclusive_until: string | null;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AutocompleteResponse {
  suggestions: string[];
}

export interface GeocodeResponse extends Coordinates {}

export interface ReverseGeocodeResponse {
  address: string;
}

export interface RouteStop {
  order: number;
  original_address: string;
  coordinates: Coordinates;
  leg_distance_km: number | null;
  leg_duration_min: number | null;
}

export interface RouteResponse {
  optimized_route: RouteStop[];
  total_distance_km: number;
  total_duration_min: number | null;
  geocoding_failures: string[];
  maps_url: string | null;
}

export interface StopLimitExceededDetail {
  code: 'STOP_LIMIT_EXCEEDED';
  limit: number;
  is_pro: boolean;
}
