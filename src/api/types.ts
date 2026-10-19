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

export interface OriginInfo {
  address: string;
  coordinates: Coordinates;
}

export interface RouteResponse {
  optimized_route: RouteStop[];
  total_distance_km: number;
  total_duration_min: number | null;
  geocoding_failures: string[];
  maps_url: string | null;
  origin: OriginInfo | null;
  destination: OriginInfo | null;
}

export interface StopLimitExceededDetail {
  code: 'STOP_LIMIT_EXCEEDED';
  limit: number;
  is_pro: boolean;
}

export interface BillingAccountUser {
  id: string;
  email: string;
  name: string | null;
  is_pro: boolean;
  is_exclusive: boolean;
  exclusive_until: string | null;
}

export interface BillingAccountResponse {
  user: BillingAccountUser;
  subscription: Record<string, unknown> | null;
  payments: Record<string, unknown>[];
}

export interface CheckoutResponse {
  payment_url?: string;
  ok?: boolean;
  coupon_applied?: boolean;
}

export interface ContactResponse {
  ok: boolean;
}

export type ApiDestinationMode = 'return_to_origin' | 'custom' | 'none';
export type ApiNavigationApp = 'ask_always' | 'google_maps' | 'waze' | 'apple_maps';
export type ApiDistanceUnit = 'km' | 'mi';
export type ApiVehicleType = 'car' | 'truck' | 'motorcycle' | 'bicycle';

export interface UserPreferencesResponse {
  default_origin: string | null;
  default_destination: string | null;
  destination_mode: ApiDestinationMode;
  navigation_app: ApiNavigationApp;
  distance_unit: ApiDistanceUnit;
  vehicle_type: ApiVehicleType;
}

export interface UpdatePreferencesRequest {
  default_origin?: string | null;
  default_destination?: string | null;
  destination_mode?: ApiDestinationMode;
  navigation_app?: ApiNavigationApp;
  distance_unit?: ApiDistanceUnit;
  vehicle_type?: ApiVehicleType;
}
